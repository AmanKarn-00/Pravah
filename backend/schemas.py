from typing import Any, Dict

EXTRACTION_SCHEMA: Dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "road": {"type": "STRING"},
        "event": {"type": "STRING"},
        "time": {"type": "STRING"},
        "duration": {"type": "STRING"}
    },
    "required": ["road", "event", "time", "duration"]
}

UNIFIED_RESOLUTION_SCHEMA: Dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "traffic_recommendation": {"type": "STRING"},
        "traffic_reason": {"type": "STRING"},
        "traffic_confidence": {"type": "STRING"},
        "infra_recommendation": {"type": "STRING"},
        "infra_reason": {"type": "STRING"},
        "infra_confidence": {"type": "STRING"},
        "emergency_recommendation": {"type": "STRING"},
        "emergency_reason": {"type": "STRING"},
        "emergency_confidence": {"type": "STRING"},
        "planning_recommendation": {"type": "STRING"},
        "planning_reason": {"type": "STRING"},
        "final_decision": {"type": "STRING"},
        "final_explanation": {"type": "STRING"},
        "public_notice_nepali": {"type": "STRING"},
        "sms": {"type": "STRING"},
        # Scenario A — Safest
        "scenario_a_action": {"type": "STRING"},
        "scenario_a_travel_impact": {"type": "STRING"},
        "scenario_a_safety_risk": {"type": "STRING"},
        "scenario_a_detour_route": {"type": "STRING"},
        "scenario_a_rationale": {"type": "STRING"},
        # Scenario B — Balanced
        "scenario_b_action": {"type": "STRING"},
        "scenario_b_travel_impact": {"type": "STRING"},
        "scenario_b_safety_risk": {"type": "STRING"},
        "scenario_b_detour_route": {"type": "STRING"},
        "scenario_b_rationale": {"type": "STRING"},
        # Scenario C — Least Disruptive
        "scenario_c_action": {"type": "STRING"},
        "scenario_c_travel_impact": {"type": "STRING"},
        "scenario_c_safety_risk": {"type": "STRING"},
        "scenario_c_detour_route": {"type": "STRING"},
        "scenario_c_rationale": {"type": "STRING"},
    },
    "required": [
        "traffic_recommendation", "traffic_reason", "traffic_confidence",
        "infra_recommendation", "infra_reason", "infra_confidence",
        "emergency_recommendation", "emergency_reason", "emergency_confidence",
        "planning_recommendation", "planning_reason",
        "final_decision", "final_explanation",
        "public_notice_nepali", "sms",
        "scenario_a_action", "scenario_a_travel_impact", "scenario_a_safety_risk",
        "scenario_a_detour_route", "scenario_a_rationale",
        "scenario_b_action", "scenario_b_travel_impact", "scenario_b_safety_risk",
        "scenario_b_detour_route", "scenario_b_rationale",
        "scenario_c_action", "scenario_c_travel_impact", "scenario_c_safety_risk",
        "scenario_c_detour_route", "scenario_c_rationale",
    ]
}
