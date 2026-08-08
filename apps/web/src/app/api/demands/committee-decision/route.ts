import { NextResponse } from "next/server";
import { atlasJsonProxyHeaders } from "../../_lib/identity";

type CommitteeDecisionPayload = {
  demand_id?: string;
  recommendation?: string;
  final_decision?: string;
  reason?: string;
  conditions?: string;
  risk_level?: string;
  actor?: string;
  architecture_exception?: boolean;
};

const FINAL_STATUS_BY_DECISION: Record<string, string> = {
  approved_for_scoring: "approved_for_scoring",
  reformulation_required: "reformulation_required",
  rejected: "rejected",
  architecture_exception: "operative_committee_review"
};

function normalizeDecision(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function PATCH(request: Request) {
  const backendBaseUrl = process.env.ATLAS_INTERNAL_API_BASE ?? "http://localhost:8000";

  try {
    const payload = (await request.json()) as CommitteeDecisionPayload;
    const demandId = payload.demand_id?.trim();
    const finalDecision = normalizeDecision(payload.final_decision);
    const finalStatus = FINAL_STATUS_BY_DECISION[finalDecision];

    if (!demandId || !finalStatus) {
      return NextResponse.json(
        {
          error: "ATLAS_COMMITTEE_DECISION_VALIDATION_ERROR",
          message: "demand_id and a supported final_decision are required",
          supported_final_decisions: Object.keys(FINAL_STATUS_BY_DECISION)
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const actor = payload.actor?.trim() || "Comité Operativo";
    const reason = payload.reason?.trim() || "Decisión registrada por el Comité Operativo.";
    const recommendation = payload.recommendation?.trim() || "pending_committee_recommendation";
    const decisionEnvelope = {
      committee_recommendation: recommendation,
      committee_final_decision: finalDecision,
      committee_final_status: finalStatus,
      committee_reason: reason,
      committee_conditions: payload.conditions?.trim() || "",
      committee_risk_level: payload.risk_level?.trim() || "medium",
      architecture_exception_requested: Boolean(payload.architecture_exception || finalDecision === "architecture_exception"),
      committee_decision_recorded_at: now,
      committee_decision_version: "committee-decision-v1.0"
    };

    const updateResponse = await fetch(`${backendBaseUrl}/demands/${encodeURIComponent(demandId)}`, {
      method: "PATCH",
      headers: atlasJsonProxyHeaders(request),
      body: JSON.stringify({
        committee_inputs: decisionEnvelope,
        validation_state: {
          committee_decision_recorded: true,
          committee_decision_recorded_at: now,
          committee_final_status: finalStatus
        },
        decision: finalDecision,
        actor,
        comment: `Decisión de comité registrada: ${finalDecision}. ${reason}`
      }),
      cache: "no-store"
    });

    const updateText = await updateResponse.text();
    if (!updateResponse.ok) {
      return new Response(updateText, {
        status: updateResponse.status,
        headers: {
          "content-type": updateResponse.headers.get("content-type") ?? "application/json",
          "x-atlas-proxy-target": backendBaseUrl,
          "x-atlas-committee-step": "demand-update"
        }
      });
    }

    const statusResponse = await fetch(`${backendBaseUrl}/demands/${encodeURIComponent(demandId)}/status`, {
      method: "PATCH",
      headers: atlasJsonProxyHeaders(request),
      body: JSON.stringify({
        status: finalStatus,
        decision: finalDecision,
        comment: `Decisión final del comité: ${finalDecision}. ${reason}`,
        actor
      }),
      cache: "no-store"
    });

    const statusText = await statusResponse.text();
    if (!statusResponse.ok) {
      return new Response(statusText, {
        status: statusResponse.status,
        headers: {
          "content-type": statusResponse.headers.get("content-type") ?? "application/json",
          "x-atlas-proxy-target": backendBaseUrl,
          "x-atlas-committee-step": "status-update"
        }
      });
    }

    const statusPayload = JSON.parse(statusText);
    return NextResponse.json(
      {
        demand: statusPayload.demand,
        committee_decision: decisionEnvelope,
        message: "Committee decision recorded and demand status updated."
      },
      {
        status: 200,
        headers: { "x-atlas-proxy-target": backendBaseUrl }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown committee decision proxy error";
    return NextResponse.json(
      {
        error: "ATLAS_NEXT_COMMITTEE_DECISION_PROXY_ERROR",
        message,
        backend_base_url: backendBaseUrl
      },
      { status: 502 }
    );
  }
}
