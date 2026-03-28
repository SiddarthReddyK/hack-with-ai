"""
test_reasoning.py  (Production)
---------------------------------
End-to-end test for the production reasoning layer.

Requirements:
    GROQ_API_KEY must be set in your environment.

Run:
    set GROQ_API_KEY=gsk_...
    python test_reasoning.py
"""

import json
import os
import sys

# ── Pre-flight: surface a clean error before importing the agent ─────────────
if not os.getenv("GROQ_API_KEY", "").strip():
    sys.exit(
        "\n[ERROR] GROQ_API_KEY is not set.\n"
        "Get a free key at https://console.groq.com then run:\n\n"
        "  Windows : set GROQ_API_KEY=gsk_...\n"
        "  macOS   : export GROQ_API_KEY=gsk_...\n"
    )

from reasoning_layer import LabReportReasoningAgent  # noqa: E402


# ── Sample lab report (matches agreed JSON schema exactly) ───────────────────
SAMPLE_REPORT = {
    "patient_name": "Priya Sharma",
    "report_date": "2025-02-27",
    "parameters": [
        {
            "name": "Hemoglobin",
            "value": 9.8,
            "unit": "g/dL",
            "reference_low": 12.0,
            "reference_high": 15.5,
            "status": "Low",
        },
        {
            "name": "Fasting Blood Glucose",
            "value": 118,
            "unit": "mg/dL",
            "reference_low": 70,
            "reference_high": 99,
            "status": "High",
        },
        {
            "name": "LDL Cholesterol",
            "value": 172,
            "unit": "mg/dL",
            "reference_low": 0,
            "reference_high": 100,
            "status": "High",
        },
        {
            "name": "HDL Cholesterol",
            "value": 38,
            "unit": "mg/dL",
            "reference_low": 50,
            "reference_high": 90,
            "status": "Low",
        },
        {
            "name": "TSH",
            "value": 3.2,
            "unit": "mIU/L",
            "reference_low": 0.5,
            "reference_high": 4.5,
            "status": "Normal",
        },
        {
            "name": "Creatinine",
            "value": 0.9,
            "unit": "mg/dL",
            "reference_low": 0.59,
            "reference_high": 1.04,
            "status": "Normal",
        },
    ],
}


def main() -> None:
    print("=" * 65)
    print("  AI Health Insight Companion — Production Reasoning Layer Test")
    print("=" * 65)

    agent = LabReportReasoningAgent()

    print("\n[*] Analysing sample lab report for Priya Sharma…\n")
    result = agent.analyze(SAMPLE_REPORT)

    print("\n" + "=" * 65)
    print("  RESULT")
    print("=" * 65)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # ── Schema assertions ───────────────────────────────────────────────────
    assert "summary"             in result, "Missing 'summary'"
    assert "preventive_guidance" in result, "Missing 'preventive_guidance'"
    assert "doctor_questions"    in result, "Missing 'doctor_questions'"
    assert isinstance(result["doctor_questions"], list), "'doctor_questions' must be a list"
    assert len(result["doctor_questions"]) == 3, f"Expected 3 questions, got {len(result['doctor_questions'])}"
    assert len(result["summary"]) > 50,          "Summary seems too short"

    print("\n[✓] All schema assertions passed.")


if __name__ == "__main__":
    main()
