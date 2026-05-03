"""Pydantic models — must stay 1:1 with lib/cv/schema.ts (Zod) and the Drizzle
schemas in lib/db/schema/. See AGENTS.md "Cricket domain glossary" and the
.cursor/skills/cricket-domain skill for the canonical enum lists.

When you add or change a field, follow the .cursor/skills/add-delivery-field
recipe so all three schemas drift together.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# --- enums --------------------------------------------------------------------

BallType = Literal[
    "yorker",
    "fullToss",
    "full",
    "goodLength",
    "shortOfLength",
    "short",
    "bouncer",
    "beamer",
]

Line = Literal[
    "wideOff",
    "outsideOff",
    "offStump",
    "middle",
    "legStump",
    "outsideLeg",
    "wideLeg",
]

Swing = Literal["out", "in", "reverse", "none"]
Spin = Literal["offBreak", "legBreak", "googly", "armBall", "none"]

ShotType = Literal[
    "defensive",
    "leave",
    "drive",
    "cut",
    "pull",
    "hook",
    "sweep",
    "reverseSweep",
    "scoop",
    "flick",
    "glance",
    "loft",
]

ShotFootwork = Literal["frontFoot", "backFoot"]
ShotTiming = Literal["early", "wellTimed", "late", "mistimed", "missed"]
ContactZone = Literal["middle", "edge", "mishit", "miss"]

DismissalType = Literal[
    "bowled",
    "caught",
    "lbw",
    "runOut",
    "stumped",
    "hitWicket",
    "caughtBehind",
    "caughtAndBowled",
    "none",
]

TrajectoryPhase = Literal[
    "approach", "bounce", "afterBounce", "impact", "afterImpact"
]

EndTerminator = Literal["boundary", "fielded", "wicket", "deadBall"]


# --- value objects ------------------------------------------------------------


class TrajectoryFrame(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tMs: Annotated[int, Field(ge=0)]
    xPitchM: float
    yPitchM: float
    zHeightM: float
    conf: Annotated[float, Field(ge=0, le=1)]
    phase: TrajectoryPhase


class Trajectory(BaseModel):
    model_config = ConfigDict(extra="forbid")
    frames: list[TrajectoryFrame]


class PitchPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    xPitchM: float
    yPitchM: float
    conf: float


class ImpactPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    xPitchM: float
    yPitchM: float
    zHeightM: float
    conf: float


class EndPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    xPitchM: float
    yPitchM: float
    terminator: EndTerminator
    conf: float


class DebugBlob(BaseModel):
    model_config = ConfigDict(extra="allow")
    geminiRaw: Any | None = None
    trackSummary: dict[str, Any] | None = None
    homographyResidual: float | None = None
    stageDurationsMs: dict[str, float] | None = None


# --- main payload -------------------------------------------------------------


class Delivery(BaseModel):
    """Wire format for /api/cv/webhook in the Next app. Mirror of
    deliverySchema in lib/cv/schema.ts."""

    model_config = ConfigDict(extra="forbid")

    matchId: str
    overNumber: int
    ballInOver: Annotated[int, Field(ge=1, le=20)]

    videoStartMs: int | None = None
    videoEndMs: int | None = None
    clipBlobUrl: str | None = None

    ballType: BallType | None = None
    line: Line | None = None
    lengthMeters: Annotated[float, Field(ge=0, le=22)] | None = None
    speedKmh: Annotated[float, Field(ge=40, le=170)] | None = None
    swing: Swing | None = None
    spin: Spin | None = None

    bowlerName: str | None = None
    batsmanName: str | None = None
    nonStrikerName: str | None = None

    shotType: ShotType | None = None
    shotFootwork: ShotFootwork | None = None
    shotTiming: ShotTiming | None = None
    shotDirectionDeg: Annotated[float, Field(ge=0, lt=360)] | None = None
    contactZone: ContactZone | None = None

    runs: Annotated[int, Field(ge=0, le=6)] = 0
    isBoundary: bool = False
    isSix: bool = False
    isWicket: bool = False
    dismissalType: DismissalType = "none"
    fielderName: str | None = None

    trajectory: Trajectory | None = None
    pitchPoint: PitchPoint | None = None
    impactPoint: ImpactPoint | None = None
    endPoint: EndPoint | None = None

    confidence: dict[str, float] = Field(default_factory=dict)
    commentary: str | None = None
    debug: DebugBlob | None = None
    isImageOnly: bool = False

    @model_validator(mode="after")
    def _consistency(self) -> Delivery:  # noqa: D401
        if self.isSix and (not self.isBoundary or self.runs != 6):
            raise ValueError("isSix requires isBoundary=true and runs=6")
        if self.dismissalType != "none" and not self.isWicket:
            raise ValueError("dismissalType != none requires isWicket=true")
        if self.isWicket and self.dismissalType == "none":
            raise ValueError("isWicket requires dismissalType to be set")
        return self


# --- API request/response shapes ---------------------------------------------


class StartJobRequest(BaseModel):
    matchId: str
    videoUrl: str
    callbackUrl: str
    hmacSecret: str


class StartJobResponse(BaseModel):
    jobId: str
    status: Literal["queued"] = "queued"


class JobStatusResponse(BaseModel):
    jobId: str
    matchId: str
    status: Literal["queued", "running", "completed", "failed"]
    progress: float = 0.0
    deliveriesEmitted: int = 0
    error: str | None = None


class DownloadRequest(BaseModel):
    url: str
    matchId: str


class DownloadResponse(BaseModel):
    blobUrl: str
    byteSize: int
    durationSec: float | None = None
    widthPx: int | None = None
    heightPx: int | None = None
    fps: float | None = None


class ImageRequest(BaseModel):
    matchId: str
    imageUrl: str
    callbackUrl: str
    hmacSecret: str


# --- webhook envelope ---------------------------------------------------------


class DeliveryExtractedEvent(BaseModel):
    type: Literal["cv/delivery.extracted"] = "cv/delivery.extracted"
    jobId: str
    delivery: Delivery


class JobCompletedEvent(BaseModel):
    type: Literal["cv/job.completed"] = "cv/job.completed"
    jobId: str
    matchId: str
    totalDeliveries: int


class JobFailedEvent(BaseModel):
    type: Literal["cv/job.failed"] = "cv/job.failed"
    jobId: str
    matchId: str
    error: dict[str, str]
