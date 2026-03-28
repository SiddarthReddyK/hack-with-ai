"""
reasoning_layer.py  (Production)
----------------------------------
AI Reasoning Layer for the AI Health Insight Companion.

Responsibilities:
  - Load OPENAI_API_KEY from environment; raise RuntimeError if missing.
  - Accept a structured lab report JSON (agreed schema — unchanged).
  - Identify abnormal parameters (status: "High" | "Low").
  - Query FAISS RAG pipeline using abnormal parameter names.
  - Build a single, focused LLM prompt with patient data + retrieved context.
  - Call ChatOpenAI once and return a strictly structured JSON response.

Output schema (unchanged):
    {
      "summary": str,                    # 4–6 sentences, mentions specific values
      "preventive_guidance": str,        # lifestyle-only, non-diagnostic
      "doctor_questions": [str, str, str]  # exactly 3
    }

Usage:
    from reasoning_layer import LabReportReasoningAgent

    agent = LabReportReasoningAgent()
    result = agent.analyze(lab_report_json)
"""

import json
import logging
import os
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from rag_pipeline import RAGPipeline

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("LabReasoningAgent")


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a compassionate, patient-facing health education assistant.
Your job is to help patients understand their lab report results — NOT to diagnose them.

STRICT RULES:
1. Use cautious language: "may suggest", "could indicate", "sometimes associated with".
2. NEVER diagnose a condition. NEVER name a specific disease as a confirmed finding.
3. NEVER halucinate — only comment on parameters explicitly provided.
4. Mention each abnormal parameter by name AND its actual measured value.
5. Preventive guidance must be lifestyle-only: diet, exercise, hydration, sleep, stress.
6. Do NOT recommend specific medications or supplements by brand name.
7. Be empathetic, clear, and reassuring in tone.
8. The 'summary' field MUST be formatted as a JSON array of strings.
9. Use extremely simple, non-technical language (6th-grade reading level) that anyone can understand without a medical background.
10. Return ONLY a valid JSON object — no markdown, no code fences, no extra text.
"""

_USER_PROMPT_TEMPLATE = """\
=== PATIENT INFORMATION ===
Name            : {patient_name}
Report Date     : {report_date}
Target Language : {language}

=== FULL LAB RESULTS ===
{results_table}

=== ABNORMAL PARAMETERS (flagged for your focus) ===
{abnormal_summary}

=== RELEVANT MEDICAL CONTEXT (retrieved from knowledge base) ===
{rag_context}

=== YOUR TASK ===
Write a response for the patient strictly in {language} using ONLY the JSON structure below.
Do not add any text before or after the JSON.

{{
  "summary": [
    "<A very simple, non-technical breakdown of the results.>",
    "<Explain what the abnormal parameters mean in everyday language. Mention names and values.>",
    "<Use cautious language.>"
  ],
  "preventive_guidance": [
    "<At least 3 specific, actionable lifestyle tips directly relevant to the flagged parameters.>",
    "<Each tip must be on its own line.>",
    "<No diagnoses. No medications.>"
  ],
  "doctor_questions": [
    "<Targeted question about the most concerning abnormal value>",
    "<Question about lifestyle or diet changes specific to the patient's flagged results>",
    "<Question about follow-up tests or monitoring timeline>"
  ]
}}
"""


# ---------------------------------------------------------------------------
# Helper: Format results as readable table
# ---------------------------------------------------------------------------

def _build_results_table(parameters: list[dict]) -> str:
    """
    Convert parameters list into a plain-text aligned table.

    Example:
        ⚠️  Hemoglobin            9.8  g/dL        | Ref: 12.0–15.5  | Status: Low
        ✅  TSH                   3.2  mIU/L        | Ref: 0.5–4.5    | Status: Normal
    """
    lines: list[str] = []
    for p in parameters:
        flag  = "⚠️ " if p.get("status") in ("High", "Low") else "✅ "
        name  = p.get("name", "Unknown")
        value = p.get("value", "N/A")
        unit  = p.get("unit", "")
        rlo   = p.get("reference_low", "?")
        rhi   = p.get("reference_high", "?")
        status = p.get("status", "Unknown")
        lines.append(
            f"{flag}{name:<28} {value!s:<8} {unit:<12} | Ref: {rlo}–{rhi:<10} | {status}"
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Helper: One-line abnormal summary injected prominently into the prompt
# ---------------------------------------------------------------------------

def _build_abnormal_summary(parameters: list[dict]) -> str:
    """
    Build a concise bullet list of only abnormal parameters with their values.
    This is injected as a separate, prominent block so the LLM cannot miss them.
    """
    abnormal = [p for p in parameters if p.get("status") in ("High", "Low")]
    if not abnormal:
        return "All parameters are within their normal reference ranges."

    bullets: list[str] = []
    for p in abnormal:
        direction = "above" if p["status"] == "High" else "below"
        bullets.append(
            f"  • {p['name']}: {p['value']} {p.get('unit', '')} "
            f"({direction} normal range {p.get('reference_low')}–{p.get('reference_high')})"
        )
    return "\n".join(bullets)


# ---------------------------------------------------------------------------
# Helper: Parse and validate LLM output
# ---------------------------------------------------------------------------

def _parse_llm_output(raw: str) -> dict[str, Any]:
    """
    Parse the LLM's raw string response into the required dict schema.
    Strips markdown fences if the model added them despite instructions.
    Falls back to a structured error response on JSON parse failure.
    """
    cleaned = raw.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        inner_lines = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        cleaned = "\n".join(inner_lines).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("JSON parse failed: %s\nRaw response:\n%s", exc, raw)
        parsed = {
            "summary": (
                "We were unable to format a structured response at this time. "
                "Please share this report directly with your doctor for guidance."
            ),
            "preventive_guidance": (
                "Maintain a balanced diet, stay physically active, and keep hydrated. "
                "Schedule a consultation with your physician to review your results."
            ),
            "doctor_questions": [
                "Which of my results require immediate attention?",
                "What lifestyle changes do you recommend based on my results?",
                "When should I repeat these tests?",
            ],
        }

    summary_data = parsed.get("summary", [])
    if isinstance(summary_data, list):
        summary_text = "\n".join(f"• {item}" for item in summary_data)
    else:
        summary_text = str(summary_data)

    preventive_data = parsed.get("preventive_guidance", [])
    if isinstance(preventive_data, list):
        preventive_text = "\n".join(f"• {item}" for item in preventive_data)
    else:
        preventive_text = str(preventive_data)

    # Enforce output schema — trim doctor_questions to exactly 3
    return {
        "summary":              summary_text,
        "preventive_guidance":  preventive_text,
        "doctor_questions":     parsed.get("doctor_questions", [])[:3],
    }


# ---------------------------------------------------------------------------
# Main Agent
# ---------------------------------------------------------------------------

class LabReportReasoningAgent:
    """
    Production reasoning agent for lab report analysis.

    Workflow
    --------
    1. Validate OPENAI_API_KEY is set (raises RuntimeError otherwise).
    2. Build FAISS RAG index from the medical knowledge base.
    3. On analyze():
       a. Identify abnormal parameters from the report JSON.
       b. Build a retrieval query from abnormal parameter names.
       c. Retrieve top-k relevant document chunks from FAISS.
       d. Log retrieved snippets for debugging.
       e. Format the full LLM prompt (system + user).
       f. Call ChatOpenAI once (single completion).
       g. Parse and return the structured JSON response.

    Parameters
    ----------
    knowledge_file : str
        Path to the plain-text medical knowledge base.
    model : str
        OpenAI chat model to use (default: "gpt-4o-mini").
    temperature : float
        Sampling temperature — lower is more deterministic (default: 0.2).
    top_k : int
        Number of RAG document chunks to retrieve per analysis (default: 5).
    """

    def __init__(
        self,
        knowledge_file: str = "medical_knowledge.txt",
        model: str = "llama-3.3-70b-versatile",
        temperature: float = 0.2,
        top_k: int = 5,
    ) -> None:
        # ── API key validation (fail fast) ──────────────────────────────────
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. "
                "Get a free key at https://console.groq.com then run:\n"
                "  Windows : set GROQ_API_KEY=gsk_...\n"
                "  macOS   : export GROQ_API_KEY=gsk_..."
            )

        # ── RAG pipeline (uses fast local embeddings — no OpenAI key needed) ──
        self.rag = RAGPipeline(
            knowledge_file=knowledge_file,
            top_k=top_k,
            use_mock_embeddings=True,           # Groq mode: local FAISS embeddings
        )

        # ── LLM ─────────────────────────────────────────────────────────────
        self._llm = ChatGroq(
            model=model,
            temperature=temperature,
            api_key=api_key,
        )

        logger.info("LabReportReasoningAgent ready | model=%s | top_k=%d", model, top_k)

    # ──────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────

    def _retrieve_context(self, parameters: list[dict]) -> str:
        """
        Build a single retrieval query from all abnormal parameter names,
        fetch top_k chunks from FAISS, log each snippet, and return
        the concatenated context string.
        """
        abnormal = [p for p in parameters if p.get("status") in ("High", "Low")]

        if not abnormal:
            logger.info("No abnormal parameters — skipping RAG retrieval.")
            return "All lab parameters are within their reference ranges."

        # Single composite query from all abnormal parameter names
        query = " ".join(p["name"] for p in abnormal)
        logger.info("RAG query: '%s'", query)

        docs = self.rag._vector_store.similarity_search(query, k=self.rag.top_k)

        logger.debug("── Retrieved document snippets ──────────────────────")
        for i, doc in enumerate(docs, start=1):
            snippet = doc.page_content[:120].replace("\n", " ")
            logger.debug("  [%d] %s…", i, snippet)
        logger.debug("─────────────────────────────────────────────────────")

        return "\n\n".join(doc.page_content for doc in docs)

    def _build_prompt(
        self,
        patient_name: str,
        report_date: str,
        parameters: list[dict],
        rag_context: str,
        language: str,
    ) -> list:
        """
        Assemble the [SystemMessage, HumanMessage] list for ChatGroq.
        """
        results_table    = _build_results_table(parameters)
        abnormal_summary = _build_abnormal_summary(parameters)

        user_content = _USER_PROMPT_TEMPLATE.format(
            patient_name     = patient_name,
            report_date      = report_date,
            language         = language,
            results_table    = results_table,
            abnormal_summary = abnormal_summary,
            rag_context      = rag_context,
        )

        return [
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=user_content),
        ]

    # ──────────────────────────────────────────────────────────────────────
    # Public API
    # ──────────────────────────────────────────────────────────────────────

    def analyze(self, report: dict[str, Any], language: str = "English") -> dict[str, Any]:
        """
        Analyse a structured lab report JSON.

        Input schema (unchanged):
            {
              "patient_name": str,
              "report_date":  str,
              "parameters": [
                {
                  "name":          str,
                  "value":         float,
                  "unit":          str,
                  "reference_low": float,
                  "reference_high":float,
                  "status":        "High" | "Low" | "Normal"
                }
              ]
            }

        Returns:
            {
              "summary":             str,   # 4–6 sentences, specific values mentioned
              "preventive_guidance": str,   # lifestyle-only guidance
              "doctor_questions":    list[str]  # exactly 3
            }
        """
        patient_name: str       = report.get("patient_name", "Patient")
        report_date:  str       = report.get("report_date",  "N/A")
        parameters:   list[dict]= report.get("parameters",   [])

        # ── Edge case: empty report ──────────────────────────────────────
        if not parameters:
            logger.warning("No parameters found in report.")
            return {
                "summary":            "No lab parameters were found in this report.",
                "preventive_guidance":"Please consult your doctor with a complete lab report.",
                "doctor_questions": [
                    "What lab tests should I have done based on my symptoms?",
                    "What reference ranges apply to someone my age and gender?",
                    "When should I schedule a follow-up appointment?",
                ],
            }

        # ── Step 1: RAG retrieval ─────────────────────────────────────────
        rag_context = self._retrieve_context(parameters)

        # ── Step 2: Build prompt ──────────────────────────────────────────
        messages = self._build_prompt(patient_name, report_date, parameters, rag_context, language)
        logger.info("Sending request to Groq for language %s…", language)

        # ── Step 3: Single LLM call ───────────────────────────────────────
        response = self._llm.invoke(messages)
        raw_output: str = response.content
        logger.info("Response received (%d chars).", len(raw_output))

        # ── Step 4: Parse + validate ──────────────────────────────────────
        result = _parse_llm_output(raw_output)
        logger.info("Analysis complete.")
        return result
