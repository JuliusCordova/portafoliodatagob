"""Governed financial scoring for ATLAS DataGob.

The financial model is intentionally explicit: it only calculates VAN/NPV, ROI,
payback and TIR/IRR when the committee provides economic assumptions. This avoids
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
class GovernedScoringInput:
    """Combined prioritization and financial scoring input."""

    scoring: ScoringInput
    financials: FinancialAssumptions


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
        "van_usd": van,
        "tir": tir,
        "roi": roi,
        "payback_months": payback,
        "cashflows": [round(value, 2) for value in flows],
        "assumptions": {
            "initial_investment_usd": assumptions.initial_investment_usd,
            "annual_benefit_usd": assumptions.annual_benefit_usd,
            "annual_operating_cost_usd": assumptions.annual_operating_cost_usd,
            "time_horizon_years": assumptions.time_horizon_years,
            "discount_rate": assumptions.discount_rate,
        },
    }


def calculate_governed_scoring(input_data: GovernedScoringInput) -> dict:
    """Calculate priority score and financial metrics as one governed result."""

    score = calculate_priority_score(input_data.scoring)
    financials = calculate_financial_metrics(input_data.financials)

    financial_signal = "positive" if financials["van_usd"] > 0 else "negative_or_pending"
    if financials["van_usd"] == 0:
        financial_signal = "neutral"

    return {
        "score": score.score,
        "priority": score.priority,
        "rationale": score.rationale,
        "components": score.components,
        "financials": financials,
        "financial_signal": financial_signal,
        "model_version": "scoring-financial-v1",
        "governance_note": "Financial metrics are calculated only from explicit committee assumptions.",
    }
