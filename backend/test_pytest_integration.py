import os
import sys


def test_reasoning_agent_integration(monkeypatch):
    """Pytest-friendly integration test for the production reasoning layer.

    This sets a GROQ API key in the environment, ensures the `backend`
    directory is on sys.path so modules import cleanly, and runs the
    same assertions as the legacy script.
    """
    # Use the provided key for the test session
    monkeypatch.setenv(
    "GROQ_API_KEY",
    os.getenv("GROQ_API_KEY", ""),
)

    # Ensure backend/ is importable
    backend_dir = os.path.dirname(__file__)
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    from reasoning_layer import LabReportReasoningAgent  # noqa: E402
    from test_reasoning import SAMPLE_REPORT  # noqa: E402

    agent = LabReportReasoningAgent()
    result = agent.analyze(SAMPLE_REPORT)

    assert "summary" in result
    assert "preventive_guidance" in result
    assert "doctor_questions" in result
    assert isinstance(result["doctor_questions"], list)
    assert len(result["doctor_questions"]) == 3
    assert len(result["summary"]) > 50
