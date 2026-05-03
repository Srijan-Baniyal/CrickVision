"""yt-dlp + Vercel Blob uploader. Used by the /v1/downloads endpoint when
CV_USE_REAL_PIPELINE=1.

The downloaded file is streamed directly into Vercel Blob via the
multipart-PUT API (no S3 intermediate) and the returned URL is what the Next
app subsequently feeds into /v1/jobs.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

import httpx

from models import DownloadResponse

BLOB_API_BASE = "https://blob.vercel-storage.com"
BLOB_TOKEN_ENV = "CV_BLOB_RW_TOKEN"
DOWNLOAD_TIMEOUT_SECONDS = 600
MAX_BYTES = 500 * 1024 * 1024


def _ydl_format_args() -> list[str]:
    # Cap quality at 1080p so we don't pull 4K reels into Modal.
    return ["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]"]


def _probe_metadata(path: Path) -> tuple[int | None, int | None, float | None, float | None]:
    """ffprobe metadata extraction. Returns (width, height, fps, duration)."""
    if not shutil.which("ffprobe"):
        return None, None, None, None
    try:
        out = subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height,r_frame_rate:format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=0",
                str(path),
            ],
            text=True,
        )
        info = dict(line.split("=", 1) for line in out.strip().splitlines() if "=" in line)
        width = int(info["width"]) if "width" in info else None
        height = int(info["height"]) if "height" in info else None
        num, den = info.get("r_frame_rate", "0/1").split("/")
        fps = float(num) / float(den) if float(den) > 0 else None
        duration = float(info["duration"]) if "duration" in info else None
        return width, height, fps, duration
    except (subprocess.CalledProcessError, ValueError, KeyError):
        return None, None, None, None


def _upload_to_blob(path: Path, match_id: str) -> str:
    token = os.environ.get(BLOB_TOKEN_ENV)
    if not token:
        raise RuntimeError(
            f"set {BLOB_TOKEN_ENV} so the downloader can upload to Vercel Blob"
        )
    pathname = f"matches/{match_id}/source/{uuid.uuid4().hex}-{path.name}"
    upload_url = f"{BLOB_API_BASE}/{pathname}"
    with httpx.Client(timeout=DOWNLOAD_TIMEOUT_SECONDS) as client, path.open("rb") as fp:
        resp = client.put(
            upload_url,
            content=fp,
            headers={
                "authorization": f"Bearer {token}",
                "x-content-type": "video/mp4",
                "x-add-random-suffix": "1",
            },
        )
        resp.raise_for_status()
        return resp.json()["url"]


def download(url: str, match_id: str) -> DownloadResponse:
    """Download a video URL via yt-dlp, upload to Blob, return metadata."""
    if not shutil.which("yt-dlp") and not shutil.which("python"):
        raise RuntimeError("yt-dlp not on PATH")
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "src.%(ext)s"
        cmd = [
            "yt-dlp",
            "--no-playlist",
            "--max-filesize",
            str(MAX_BYTES),
            *_ydl_format_args(),
            "-o",
            str(out_path),
            url,
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        files = list(Path(tmpdir).glob("src.*"))
        if not files:
            raise RuntimeError("yt-dlp produced no file")
        downloaded = files[0]
        byte_size = downloaded.stat().st_size
        width, height, fps, duration = _probe_metadata(downloaded)
        blob_url = _upload_to_blob(downloaded, match_id)
        return DownloadResponse(
            blobUrl=blob_url,
            byteSize=byte_size,
            durationSec=duration,
            widthPx=width,
            heightPx=height,
            fps=fps,
        )
