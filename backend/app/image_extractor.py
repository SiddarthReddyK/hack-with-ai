"""
image_extractor.py
-------------------
Extracts lab report text from image files (JPG, PNG, TIFF, BMP, WEBP)
using Groq's vision-capable LLM (llama-3.2-11b-vision-preview).

No external OCR binary (Tesseract) required — runs entirely via Groq API.

Usage:
    from app.image_extractor import extract_text_from_image

    text = extract_text_from_image(image_bytes, mime_type="image/jpeg")
"""

import base64
import logging
import os

from langchain_core.messages import HumanMessage
from langchain_groq import ChatGroq

logger = logging.getLogger(__name__)

# Vision model on Groq
VISION_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct"

_EXTRACTION_PROMPT = """\
This image is a medical lab report. Your task is to read and extract ALL visible text from it exactly as it appears.

Return the full raw text content of the lab report — every line, every number, every unit, every reference range.
Do NOT summarize. Do NOT interpret. Just transcribe all visible text accurately.
If the image is blurry or partially unreadable, extract whatever is visible.
"""


def _load_vision_llm() -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. "
            "Get a free key at https://console.groq.com then run:\n"
            "  Windows : set GROQ_API_KEY=gsk_..."
        )
    return ChatGroq(
        model=VISION_MODEL,
        temperature=0.0,
        api_key=api_key,
    )


def extract_text_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """
    Use Groq's vision model to OCR a lab report image and return its raw text.

    Args:
        image_bytes : Raw bytes of the image file.
        mime_type   : MIME type of the image (e.g. "image/jpeg", "image/png").

    Returns:
        str: Extracted text content of the lab report.

    Raises:
        ValueError:   Image is empty or unreadable.
        RuntimeError: Groq API call failed.
    """
    if not image_bytes:
        raise ValueError("Image file is empty.")

    # Encode image as base64 data URL
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    image_url = f"data:{mime_type};base64,{b64_image}"

    logger.info("Sending image to Groq vision model (%s, %d KB).",
                VISION_MODEL, len(image_bytes) // 1024)

    try:
        llm = _load_vision_llm()
        message = HumanMessage(
            content=[
                {
                    "type": "image_url",
                    "image_url": {"url": image_url},
                },
                {
                    "type": "text",
                    "text": _EXTRACTION_PROMPT,
                },
            ]
        )
        response = llm.invoke([message])
        extracted_text = response.content.strip()

        if not extracted_text:
            raise ValueError("Vision model returned empty text — image may be unreadable.")

        logger.info("Image OCR complete — extracted %d characters.", len(extracted_text))
        return extracted_text

    except ValueError:
        raise
    except Exception as exc:
        logger.exception("Groq vision model call failed.")
        raise RuntimeError(f"Image OCR failed: {exc}") from exc
