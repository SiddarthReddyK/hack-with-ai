"""
PDF text extraction utilities using pdfplumber.

Responsibilities:
  - Open and read a PDF file from bytes.
  - Extract and clean raw text from all pages.
  - Raise descriptive errors if extraction fails.
"""

import io
import logging

import pdfplumber

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract and concatenate text from all pages of a PDF.

    Args:
        file_bytes: Raw PDF content as bytes.

    Returns:
        A single string containing the full extracted text.

    Raises:
        ValueError: If the PDF contains no extractable text.
        RuntimeError: If pdfplumber fails to open or parse the file.
    """
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages_text: list[str] = []

            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text()
                if page_text:
                    pages_text.append(page_text.strip())
                else:
                    logger.warning("Page %d yielded no text — skipping.", page_num)

            if not pages_text:
                raise ValueError(
                    "No extractable text found in the PDF. "
                    "The file may be scanned/image-based or empty."
                )

            full_text = "\n\n".join(pages_text)
            logger.info(
                "Extracted %d characters from %d page(s).",
                len(full_text),
                len(pages_text),
            )
            return full_text

    except ValueError:
        raise  # re-raise our own descriptive error untouched
    except Exception as exc:
        logger.exception("pdfplumber failed to process the file.")
        raise RuntimeError(f"Failed to parse PDF: {exc}") from exc
