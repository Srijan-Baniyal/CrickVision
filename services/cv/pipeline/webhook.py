"""HMAC-signed webhook helper for posting deliveries back to the Next app."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
from typing import Any

import httpx

SIGNATURE_HEADER = "x-cv-signature"
TIMEOUT_SECONDS = 30.0


def _sign(body: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()


async def send(url: str, secret: str, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":"))
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        await client.post(
            url,
            content=body,
            headers={
                "content-type": "application/json",
                SIGNATURE_HEADER: _sign(body, secret),
            },
        )


def send_sync(url: str, secret: str, payload: dict[str, Any]) -> None:
    asyncio.run(send(url, secret, payload))
