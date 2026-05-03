from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(autouse=True)
def stub_pipeline_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CV_USE_REAL_PIPELINE", raising=False)
    os.environ["CV_SERVICE_TOKEN"] = "test-token"
