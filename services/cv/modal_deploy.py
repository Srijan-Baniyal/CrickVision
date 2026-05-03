"""Modal entrypoint. Wraps app.py in a GPU-backed Modal app.

Deploy with: `modal deploy modal_deploy.py`
Modal exposes a public URL like https://<workspace>--cricket-cv.modal.run.
Drop that into the Next app's CV_SERVICE_URL.
"""

from __future__ import annotations

import modal

CPU_IMAGE = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install_from_pyproject("pyproject.toml")
)

GPU_IMAGE = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "libgl1", "libglib2.0-0")
    .pip_install_from_pyproject("pyproject.toml", optional_dependencies=["ml"])
)

app = modal.App("cricket-cv")

# CPU container — handles ingest + stub pipeline, scales to zero quickly.
@app.function(
    image=CPU_IMAGE,
    secrets=[modal.Secret.from_name("cricket-cv")],
    timeout=600,
    min_containers=0,
    max_containers=10,
)
@modal.asgi_app()
def fastapi_app():  # type: ignore[no-untyped-def]
    from app import app as fastapi

    return fastapi


# GPU container — engaged when CV_USE_REAL_PIPELINE=1. Modal routes the same
# /v1/jobs endpoint here when the Inngest function explicitly targets it; for
# v1 we keep both behind a single URL and let the env var decide.
@app.function(
    image=GPU_IMAGE,
    secrets=[modal.Secret.from_name("cricket-cv")],
    gpu="T4",
    timeout=3600,
    min_containers=0,
    max_containers=4,
)
def gpu_pipeline_runner(payload: dict) -> dict:
    """Direct invocation entrypoint for ad-hoc GPU jobs (e.g. nightly
    re-processing). The HTTP path goes through fastapi_app above."""
    import os

    os.environ["CV_USE_REAL_PIPELINE"] = "1"
    from app import _run_video_job
    from models import StartJobRequest

    req = StartJobRequest.model_validate(payload)
    job_id = payload.get("jobId", "modal-direct")
    _run_video_job(job_id, req)
    return {"jobId": job_id}


# Persistent volume for the fine-tuning batches the nightly job emits.
ft_volume = modal.Volume.from_name("cricket-cv-finetune", create_if_missing=True)


@app.function(
    image=CPU_IMAGE,
    secrets=[modal.Secret.from_name("cricket-cv")],
    schedule=modal.Cron("0 3 * * *"),  # 03:00 UTC nightly
    timeout=600,
    volumes={"/data/finetune": ft_volume},
)
def nightly_export_corrections() -> dict:
    """Pulls user corrections from the Next app and writes a JSONL
    fine-tuning batch to the cricket-cv-finetune Modal volume."""
    from jobs.export_corrections import export_corrections

    return export_corrections()
