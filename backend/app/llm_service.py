"""
LLM service layer — Lab Report Parameter Extraction.

Responsibility:
  - Accept raw PDF text.
  - Call Groq (llama-3.3-70b-versatile) to extract structured lab parameters.
  - Return a validated LabReport Pydantic object.

This is the EXTRACTION step only (PDF text → structured JSON).
The patient-friendly summary/guidance is handled separately by reasoning_layer.py.
"""

import json
import logging
import os
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq

from app.schemas import LabReport

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System prompt: instructs LLM to extract structured JSON from raw PDF text
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """
You are a medical lab report data extraction AI.

Given raw text extracted from a patient lab report, return ONLY a valid JSON
object conforming exactly to this schema — no markdown fences, no extra keys:

{
  "patient_name": "<string>",
  "report_date": "<YYYY-MM-DD string>",
  "parameters": [
    {
      "name": "<string>",
      "value": <number>,
      "unit": "<string>",
      "reference_low": <number>,
      "reference_high": <number>,
      "status": "<High | Low | Normal>"
    }
  ]
}

Rules:
- Extract EVERY lab parameter you can find in the text.
- value, reference_low, reference_high MUST be numbers (not strings).
- status must be exactly "High", "Low", or "Normal" based on comparing value to reference range.
- If report_date cannot be found, use today's date in YYYY-MM-DD format.
- If patient_name cannot be found, use "Unknown Patient".
- Return ONLY the JSON object — no explanation, no markdown, no extra text.
""".strip()


# ---------------------------------------------------------------------------
# Internal: load LLM (Groq) — initialised once at module level
# ---------------------------------------------------------------------------
def _load_llm() -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. "
            "Get a free key at https://console.groq.com then run:\n"
            "  Windows : set GROQ_API_KEY=gsk_...\n"
            "  macOS   : export GROQ_API_KEY=gsk_..."
        )
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.0,   # extraction — fully deterministic
        api_key=api_key,
    )


# ---------------------------------------------------------------------------
# Internal: call LLM to extract structured data from PDF text
# ---------------------------------------------------------------------------
def _call_llm(report_text: str) -> dict[str, Any]:
    """
    Send raw PDF text to Groq and return parsed JSON dict.

    Args:
        report_text: Text extracted from the lab report PDF.

    Returns:
        A plain dict matching the LabReport schema.

    Raises:
        ValueError:   LLM returned non-parseable JSON.
        RuntimeError: API call failed.
    """
    logger.info("Calling Groq LLM for parameter extraction (%d chars).", len(report_text))

    llm = _load_llm()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"Lab Report Text:\n\n{report_text}"},
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()

    # Strip markdown fences if LLM added them despite instructions
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        parsed = json.loads(raw)
        logger.info("Groq extraction successful — %d parameters found.", len(parsed.get("parameters", [])))
        return parsed
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse LLM response as JSON: %s\nRaw: %s", exc, raw)
        raise ValueError(f"LLM returned non-JSON output: {exc}") from exc


# ---------------------------------------------------------------------------
# Internal: validate parsed dict against Pydantic schema
# ---------------------------------------------------------------------------
def _validate_llm_response(raw: dict[str, Any]) -> LabReport:
    """
    Parse and validate the raw LLM dict against the LabReport Pydantic schema.

    Raises:
        ValueError: If the response doesn't match the expected schema.
    """
    try:
        return LabReport(**raw)
    except Exception as exc:
        logger.error("LLM response failed schema validation: %s", exc)
        raise ValueError(f"LLM returned an invalid response structure: {exc}") from exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def analyze_report_text(report_text: str) -> LabReport:
    """
    Main entry point: given raw PDF text, extract and return a validated LabReport.

    Args:
        report_text: Raw text extracted from the lab report PDF.

    Returns:
        A validated LabReport Pydantic model.

    Raises:
        ValueError:   LLM response didn't match the required schema.
        RuntimeError: LLM API call failed unexpectedly.
    """
    if not report_text or not report_text.strip():
        raise ValueError("Report text is empty — cannot analyze.")

    try:
        raw_response = _call_llm(report_text)
    except ValueError:
        raise
    except Exception as exc:
        logger.exception("LLM API call failed.")
        raise RuntimeError(f"LLM service error: {exc}") from exc

    return _validate_llm_response(raw_response)
