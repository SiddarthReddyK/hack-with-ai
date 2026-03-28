"""
Pydantic schemas that strictly define the data contract for the
Lab Report Intelligence Agent API.

⚠️ Do NOT modify the shape of LabParameter or LabReport —
   the LLM is instructed to return exactly this structure.
"""

from typing import List, Literal
from pydantic import BaseModel, Field


class LabParameter(BaseModel):
    """A single lab test result extracted from the report."""

    name: str = Field(..., description="Name of the lab parameter, e.g. 'Hemoglobin'")
    value: float = Field(..., description="Measured numeric value")
    unit: str = Field(..., description="Unit of measurement, e.g. 'g/dL'")
    reference_low: float = Field(..., description="Lower bound of the normal reference range")
    reference_high: float = Field(..., description="Upper bound of the normal reference range")
    status: Literal["High", "Low", "Normal"] = Field(
        ..., description="Comparison of value against reference range"
    )


class LabReport(BaseModel):
    """
    Structured representation of a parsed lab report.
    This is the EXACT schema the LLM must return.
    """

    patient_name: str = Field(..., description="Full name of the patient")
    report_date: str = Field(..., description="Date of the report (e.g. '2024-01-15')")
    parameters: List[LabParameter] = Field(
        ..., description="List of all lab parameters found in the report"
    )


class AnalysisResponse(BaseModel):
    """
    Full response returned by POST /api/v1/upload-report.

    Combines:
    - Patient info + extracted parameters (from LabReport)
    - AI-generated patient-friendly insights (from reasoning layer)
    """

    # ── Lab report fields ───────────────────────────────────────────────────
    patient_name: str = Field(..., description="Full name of the patient")
    report_date: str = Field(..., description="Date of the report")
    parameters: List[LabParameter] = Field(
        ..., description="All extracted and classified lab parameters"
    )

    # ── AI reasoning fields ──────────────────────────────────────────────────
    summary: str = Field(
        ..., description="4–6 sentence patient-friendly explanation of results"
    )
    preventive_guidance: str = Field(
        ..., description="Lifestyle-based, non-diagnostic preventive tips"
    )
    doctor_questions: List[str] = Field(
        ..., description="Exactly 3 questions the patient should ask their doctor"
    )


class TrendEntry(BaseModel):
    """Trend data for a single lab parameter compared across two reports."""
    name: str
    unit: str
    older_value: float
    newer_value: float
    absolute_change: float
    percentage_change: float | None   # None if older_value was 0
    direction: Literal["Increased", "Decreased", "Unchanged"]
    older_status: str
    newer_status: str


class TrendAnalysisResponse(BaseModel):
    """Response from POST /api/v1/analyze-trends."""
    patient_name: str
    older_report_date: str
    newer_report_date: str
    trends: List[TrendEntry]
    only_in_older: List[str] = Field(default_factory=list, description="Parameters only in the older report")
    only_in_newer: List[str] = Field(default_factory=list, description="Parameters only in the newer report")
    graph_base64: str | None = Field(None, description="Base64 encoded PNG of the trend graph")


class MultiReportResponse(BaseModel):
    """
    Response from POST /api/v1/upload-and-compare.
    Contains per-file analysis for every uploaded report (sorted oldest→newest),
    plus a trend comparison between the oldest and newest report.
    """
    reports: List[AnalysisResponse] = Field(
        ..., description="Individual analysis for each uploaded file, sorted oldest → newest"
    )
    trend: TrendAnalysisResponse = Field(
        ..., description="Trend comparison between the oldest and newest report"
    )

