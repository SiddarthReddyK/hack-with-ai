"""
API router for the Lab Report Intelligence Agent.

Full pipeline for POST /api/v1/upload-report:
  1. Validate upload (type + size)
  2. Extract raw text from PDF       → pdf_extractor
  3. Extract structured parameters   → llm_service (Groq)
  4. Re-classify parameter statuses  → lab_report_analyzer
  5. Generate patient-friendly AI    → reasoning_layer (Groq)
  6. Return combined AnalysisResponse
"""

import logging
import sys
import os
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.llm_service import analyze_report_text
from app.pdf_extractor import extract_text_from_pdf
from app.image_extractor import extract_text_from_image
from app.graph_generator import generate_trend_graph_base64
from app.schemas import AnalysisResponse, TrendAnalysisResponse
import io
import base64
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

# lab_report_analyzer lives at the backend root (one level above app/)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from lab_report_analyzer import classify_report_statuses, analyze_trends  # noqa: E402
from reasoning_layer import LabReportReasoningAgent                        # noqa: E402

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Lab Report"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/octet-stream",
    "image/jpeg", "image/jpg", "image/png",
    "image/tiff", "image/bmp", "image/webp",
}

IMAGE_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png",
    "image/tiff", "image/bmp", "image/webp",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Initialise reasoning agent once at startup
try:
    _reasoning_agent = LabReportReasoningAgent()
    logger.info("LabReportReasoningAgent initialised successfully.")
except RuntimeError as e:
    logger.error("Could not initialise reasoning agent: %s", e)
    _reasoning_agent = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_upload(file: UploadFile) -> None:
    filename = file.filename or ""
    ext = os.path.splitext(filename.lower())[1]
    if file.content_type not in ALLOWED_CONTENT_TYPES and ext not in IMAGE_EXTENSIONS and ext != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and image files (JPG, PNG, TIFF, BMP, WEBP) are accepted.",
        )


def _is_image(file: UploadFile) -> bool:
    ext = os.path.splitext((file.filename or "").lower())[1]
    return file.content_type in IMAGE_CONTENT_TYPES or ext in IMAGE_EXTENSIONS


def _get_image_mime(file: UploadFile) -> str:
    if file.content_type in IMAGE_CONTENT_TYPES:
        return file.content_type
    ext = os.path.splitext((file.filename or "").lower())[1]
    return {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".tiff": "image/tiff", ".tif": "image/tiff",
        ".bmp": "image/bmp",
        ".webp": "image/webp",
    }.get(ext, "image/jpeg")


async def _run_pipeline(file: UploadFile, language: str = "English") -> dict[str, Any]:
    """Run the full pipeline on a single file. Returns a plain dict."""
    _validate_upload(file)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"File '{file.filename}' is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File '{file.filename}' exceeds 10 MB limit.")

    # Extract text
    try:
        report_text = (
            extract_text_from_image(file_bytes, mime_type=_get_image_mime(file))
            if _is_image(file)
            else extract_text_from_pdf(file_bytes)
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    # LLM parameter extraction
    try:
        lab_report = analyze_report_text(report_text)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"LLM extraction failed: {exc}")
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail=f"LLM service unavailable: {exc}")

    # Classify statuses
    report_dict = classify_report_statuses(lab_report.model_dump())

    # Reasoning insights
    if _reasoning_agent is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="AI reasoning service unavailable. Check GROQ_API_KEY.")
    try:
        insights = _reasoning_agent.analyze(report_dict, language=language)
    except Exception as exc:
        logger.exception("Reasoning layer failed.")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"AI reasoning failed: {exc}") from exc

    return {**report_dict, **insights}


# ---------------------------------------------------------------------------
# POST /api/v1/upload-report  — single file analysis
# ---------------------------------------------------------------------------

@router.post(
    "/upload-report",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload a lab report and get full AI analysis",
    description=(
        "Accepts a PDF or image lab report. Extracts text, identifies and classifies "
        "lab parameters via AI, then generates a patient-friendly summary, "
        "preventive guidance, and 3 doctor consultation questions."
    ),
)
async def upload_report(
    file: UploadFile = File(..., description="Lab report — PDF or image (JPG, PNG, TIFF, BMP, WEBP)"),
    language: str = Form("English", description="Target language to output AI summary in")
) -> AnalysisResponse:
    result = await _run_pipeline(file, language)
    logger.info("upload-report: processed report for '%s' in %s.", result.get("patient_name"), language)
    return AnalysisResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/analyze-trends  — two file pickers (works in Swagger UI)
# ---------------------------------------------------------------------------

@router.post(
    "/analyze-trends",
    response_model=TrendAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload 2 lab reports and get trend analysis",
    description=(
        "Upload an older and a newer lab report (PDF or image). "
        "Both are processed through the full AI pipeline, then compared "
        "to produce per-parameter trend data: direction, absolute change, % change."
    ),
)
async def analyze_trends_endpoint(
    older_report: UploadFile = File(..., description="The OLDER lab report (PDF or image)"),
    newer_report: UploadFile = File(..., description="The NEWER lab report (PDF or image)"),
    language: str = Form("English", description="Target language to output AI summary in")
) -> TrendAnalysisResponse:
    older_dict = await _run_pipeline(older_report, language)
    newer_dict = await _run_pipeline(newer_report, language)

    older = classify_report_statuses(older_dict)
    newer = classify_report_statuses(newer_dict)
    trend_dict = analyze_trends(older, newer)

    # Generate graph from the structured trend array
    graph_b64 = generate_trend_graph_base64(trend_dict.get("trends", []))
    trend_dict["graph_base64"] = graph_b64

    logger.info(
        "analyze-trends: '%s' | %d params | '%s' → '%s'",
        trend_dict.get("patient_name"),
        len(trend_dict.get("trends", [])),
        older.get("report_date"),
        newer.get("report_date"),
    )

    return TrendAnalysisResponse(**trend_dict)


# ---------------------------------------------------------------------------
# POST /api/v1/generate-pdf — server-side PDF generation from AnalysisResponse
# ---------------------------------------------------------------------------


@router.post("/generate-pdf", status_code=status.HTTP_200_OK, summary="Generate PDF from analysis and return base64")
async def generate_pdf_endpoint(data: AnalysisResponse):
    """Generate a simple PDF from the analysis response and return it base64-encoded.

    This is a reliable server-side fallback that avoids html2canvas/browser issues.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    flowables = []

    # Title
    flowables.append(Paragraph(f"Lab Report — {data.patient_name}", styles["Title"]))
    flowables.append(Spacer(1, 12))
    flowables.append(Paragraph(f"Report date: {data.report_date}", styles["Normal"]))
    flowables.append(Spacer(1, 12))

    # Parameters table
    table_data = [["Parameter", "Value", "Reference", "Status"]]
    for p in data.parameters:
        ref = f"{p.reference_low}–{p.reference_high} {p.unit}"
        table_data.append([p.name, f"{p.value} {p.unit}", ref, p.status])

    table = Table(table_data, colWidths=[150, 80, 140, 60])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d9488")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (1, 1), (-1, -1), "LEFT"),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("BOX", (0, 0), (-1, -1), 0.25, colors.grey),
    ]))
    flowables.append(table)
    flowables.append(Spacer(1, 12))

    # Summary and guidance
    flowables.append(Paragraph("Summary:", styles["Heading3"]))
    flowables.append(Paragraph(data.summary or "", styles["Normal"]))
    flowables.append(Spacer(1, 8))
    flowables.append(Paragraph("Preventive guidance:", styles["Heading3"]))
    flowables.append(Paragraph(data.preventive_guidance or "", styles["Normal"]))
    flowables.append(Spacer(1, 8))

    # Doctor questions
    flowables.append(Paragraph("Questions for your doctor:", styles["Heading3"]))
    for q in data.doctor_questions:
        flowables.append(Paragraph(f"• {q}", styles["Normal"]))

    doc.build(flowables)
    buf.seek(0)
    pdf_bytes = buf.read()
    b64 = base64.b64encode(pdf_bytes).decode("ascii")
    return {"pdf_base64": b64}
