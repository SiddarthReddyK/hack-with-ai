"""
Entry point for the AI Lab Report Intelligence Agent API.

Run locally:
    uvicorn app.main:app --reload

Interactive docs:
    http://127.0.0.1:8000/docs
"""

import logging

from dotenv import load_dotenv
load_dotenv()  # loads GROQ_API_KEY (and others) from .env automatically

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.router import router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Lab Report Intelligence Agent",
    description=(
        "Transforms raw lab report PDFs into structured, patient-friendly JSON "
        "using AI-powered extraction and analysis."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins in development; restrict in production
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 🔒 Replace with specific origins before going live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"], summary="Service health check")
async def health_check() -> dict:
    """Returns 200 OK if the service is running."""
    return {"status": "ok", "service": "AI Lab Report Intelligence Agent"}
