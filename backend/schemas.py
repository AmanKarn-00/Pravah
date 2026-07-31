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

EXPERT_SCHEMA: Dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "recommendation": {"type": "STRING"},
        "reason": {"type": "STRING"},
        "confidence": {"type": "STRING"}
    },
    "required": ["recommendation", "reason", "confidence"]
}

RESOLUTION_SCHEMA: Dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "decision": {"type": "STRING"},
        "explanation": {"type": "STRING"},
        "public_notice_nepali": {"type": "STRING"},
        "sms": {"type": "STRING"}
    },
    "required": ["decision", "explanation", "public_notice_nepali", "sms"]
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
        "final_decision": {"type": "STRING"},
        "final_explanation": {"type": "STRING"},
        "public_notice_nepali": {"type": "STRING"},
        "sms": {"type": "STRING"}
    },
    "required": [
        "traffic_recommendation",
        "traffic_reason",
        "traffic_confidence",
        "infra_recommendation",
        "infra_reason",
        "infra_confidence",
        "final_decision",
        "final_explanation",
        "public_notice_nepali",
        "sms"
    ]
}
