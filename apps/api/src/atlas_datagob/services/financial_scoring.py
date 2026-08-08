"""Governed financial scoring for ATLAS DataGob.

The financial model is intentionally explicit: it only calculates or registers
VAN/NPV, ROI, payback and TIR/IRR when the Data Owner, committee or portfolio
owner provides economic assumptions or direct financial metrics. This avoids
inventing financial values from the intake text and keeps the dashboard auditable.
"""
from __future__ import annotations

from dataclasses import dataclass

from atlas_datagob.domain.models import ScoringInput
from atlas_datagob.services.scoring import calculate_priority_score


@dataclass(frozen=True)
class FinancialAssumptions:
    """Economic assumptions provided by the committee or portfolio owner."""

    initial_investment_usd: float
    annual_benefit_usd: float
    annual_operating_cost_usd: float = 0.0
    time_horizon_years: int = 3
    discount_rate: float = 0.12


@dataclass(frozen=True)
class DirectFinancialMetrics:
    """Direct financial metrics provided by the Data Owner."""

    roi_percent: float
    van_usd: float
    tir_percent: float
    payback_years: float


@dataclass(frozen=True)
class GovernedScoringInput:
    """Combined prioritization and financial scoring input."""

    scoring: ScoringInput
    financials: FinancialAssumptions


@dataclass(frozen=True)
class GovernedDirectScoringInput:
    """Combined prioritization and direct financial metrics input."""

    scoring: ScoringInput
    financials: DirectFinancialMetrics


def _validate_assumptions(assumptions: FinancialAssumptions) -> None:
    if assumptions.initial_investment_usd < 0:
        raise ValueError("initial_investment_usd must be greater than or equal to 0")
    if assumptions.annual_benefit_usd < 0:
        raise ValueError("annual_benefit_usd must be greater than or equal to 0")
    if assumptions.annual_operating_cost_usd < 0:
        raise ValueError("annual_operating_cost_usd must be greater than or equal to 0")
    if assumptions.time_horizon_years < 1 or assumptions.time_horizon_years > 10:
        raise ValueError("time_horizon_years must be between 1 and 10")
    if assumptions.discount_rate < 0 or assumptions.discount_rate > 1:
        raise ValueError("discount_rate must be between 0 and 1")


def _validate_direct_metrics(metrics: DirectFinancialMetrics) -> None:
    if metrics.payback_years < 0:
        raise ValueError("payback_years must be greater than or equal to 0")


def cashflows_for(assumptions: FinancialAssumptions) -> list[float]:
    """Return project cashflows using year 0 as the investment outflow."""

    _validate_assumptions(assumptions)
    annual_net = assumptions.annual_benefit_usd - assumptions.annual_operating_cost_usd
    return [-assumptions.initial_investment_usd] + [annual_net for _ in range(assumptions.time_horizon_years)]


def npv(cashflows: list[float], discount_rate: float) -> float:
    """Calculate net present value from cashflows."""

    return sum(value / ((1 + discount_rate) ** period) for period, value in enumerate(cashflows))


def payback_months(cashflows: list[float]) -> float | None:
    """Calculate simple payback months from undiscounted cashflows."""

    if not cashflows or cashflows[0] >= 0:
        return 0.0

    cumulative = cashflows[0]
    for year, value in enumerate(cashflows[1:], start=1):
        previous = cumulative
        cumulative += value
        if cumulative >= 0 and value > 0:
            fraction = abs(previous) / value
            return round(((year - 1) + fraction) * 12, 1)
    return None


def irr(cashflows: list[float]) -> float | None:
    """Estimate IRR using bisection; return None when the signal is not computable."""

    if not any(value < 0 for value in cashflows) or not any(value > 0 for value in cashflows):
        return None

    low = -0.95
    high = 3.0
    low_value = npv(cashflows, low)
    high_value = npv(cashflows, high)

    if low_value * high_value > 0:
        return None

    for _ in range(80):
        mid = (low + high) / 2
        mid_value = npv(cashflows, mid)
        if abs(mid_value) < 0.0001:
            return round(mid, 4)
        if low_value * mid_value < 0:
            high = mid
            high_value = mid_value
        else:
            low = mid
            low_value = mid_value
    return round((low + high) / 2, 4)


def _bucket(value: float, thresholds: tuple[float, float, float, float]) -> int:
    if value >= thresholds[0]:
        return 5
    if value >= thresholds[1]:
        return 4
    if value >= thresholds[2]:
        return 3
    if value >= thresholds[3]:
        return 2
    return 1


def financial_score_from_direct_metrics(metrics: DirectFinancialMetrics) -> float:
    """Calculate a 1-to-5 financial score from Data Owner metrics."""

    _validate_direct_metrics(metrics)
    roi_score = _bucket(metrics.roi_percent, (80, 60, 35, 20))
    van_score = _bucket(metrics.van_usd, (50000, 25000, 10000, 1))
    tir_score = _bucket(metrics.tir_percent, (60, 30, 18, 10))

    if metrics.payback_years <= 1:
        payback_score = 5
    elif metrics.payback_years <= 2:
        payback_score = 4
    elif metrics.payback_years <= 3:
        payback_score = 3
    elif metrics.payback_years <= 5:
        payback_score = 2
    else:
        payback_score = 1

    return round((roi_score + van_score + tir_score + payback_score) / 4, 2)


def calculate_financial_metrics(assumptions: FinancialAssumptions) -> dict:
    """Calculate economic metrics from explicit committee assumptions."""

    flows = cashflows_for(assumptions)
    total_net_benefit = sum(flows[1:])
    van = round(npv(flows, assumptions.discount_rate), 2)
    roi = None
    if assumptions.initial_investment_usd > 0:
        roi = round((total_net_benefit - assumptions.initial_investment_usd) / assumptions.initial_investment_usd, 4)

    tir = irr(flows)
    payback = payback_months(flows)

    return {
        "input_mode": "assumptions",
        "van_usd": van,
        "tir": tir,
        "tir_percent": round(tir * 100, 2) if tir is not None else None,
        "roi": roi,
        "roi_percent": round(roi * 100, 2) if roi is not None else None,
        "payback_months": payback,
        "payback_years": round(payback / 12, 2) if payback is not None else None,
        "financial_score": None,
        "cashflows": [round(value, 2) for value in flows],
        "assumptions": {
            "initial_investment_usd": assumptions.initial_investment_usd,
            "annual_benefit_usd": assumptions.annual_benefit_usd,
            "annual_operating_cost_usd": assumptions.annual_operating_cost_usd,
            "time_horizon_years": assumptions.time_horizon_years,
            "discount_rate": assumptions.discount_rate,
        },
    }


def direct_financial_metrics(metrics: DirectFinancialMetrics) -> dict:
    """Register direct economic metrics from the Data Owner checklist."""

    score = financial_score_from_direct_metrics(metrics)
    return {
        "input_mode": "direct_metrics",
        "van_usd": metrics.van_usd,
        "tir": round(metrics.tir_percent / 100, 4),
        "tir_percent": metrics.tir_percent,
        "roi": round(metrics.roi_percent / 100, 4),
        "roi_percent": metrics.roi_percent,
        "payback_months": round(metrics.payback_years * 12, 1),
        "payback_years": metrics.payback_years,
        "financial_score": score,
        "cashflows": None,
        "assumptions": None,
    }


def _financial_signal(financials: dict) -> str:
    if financials["van_usd"] > 0:
        return "positive"
    if financials["van_usd"] == 0:
        return "neutral"
    return "negative_or_pending"


def calculate_governed_scoring(input_data: GovernedScoringInput) -> dict:
    """Calculate priority score and financial metrics as one governed result."""

    score = calculate_priority_score(input_data.scoring)
    financials = calculate_financial_metrics(input_data.financials)

    return {
        "score": score.score,
        "priority": score.priority,
        "rationale": score.rationale,
        "components": score.components,
        "financials": financials,
        "financial_signal": _financial_signal(financials),
        "model_version": "scoring-financial-v1",
        "governance_note": "Financial metrics are calculated only from explicit committee assumptions.",
    }


def calculate_governed_direct_scoring(input_data: GovernedDirectScoringInput) -> dict:
    """Calculate priority score and register Data Owner financial metrics."""

    score = calculate_priority_score(input_data.scoring)
    financials = direct_financial_metrics(input_data.financials)

    return {
        "score": score.score,
        "priority": score.priority,
        "rationale": score.rationale,
        "components": score.components,
        "financials": financials,
        "financial_signal": _financial_signal(financials),
        "model_version": "scoring-financial-v1-direct-metrics",
        "governance_note": "Financial metrics were provided by the Data Owner checklist and persisted with audit trail.",
    }
