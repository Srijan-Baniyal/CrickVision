// Display formatters for the cricket domain. Use everywhere instead of inline
// toFixed/toString so units stay consistent and l10n is centralized later.

const SPEED_DECIMALS = 1;
const LENGTH_DECIMALS = 2;
const DEGREE_DECIMALS = 0;

export function formatSpeedKmh(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n.toFixed(SPEED_DECIMALS)} km/h`;
}

export function formatLengthMeters(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n.toFixed(LENGTH_DECIMALS)} m`;
}

export function formatDegrees(
  value: number | string | null | undefined
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${n.toFixed(DEGREE_DECIMALS)}°`;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_SECOND = 1000;
const PAD_TWO = 2;

export function formatMatchTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return "—";
  }
  const hours = Math.floor(ms / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);
  const m = String(minutes).padStart(PAD_TWO, "0");
  const s = String(seconds).padStart(PAD_TWO, "0");
  return hours > 0 ? `${hours}:${m}:${s}` : `${m}:${s}`;
}

const HUMAN_LABELS: Record<string, string> = {
  yorker: "Yorker",
  fullToss: "Full toss",
  full: "Full",
  goodLength: "Good length",
  shortOfLength: "Short of length",
  short: "Short",
  bouncer: "Bouncer",
  beamer: "Beamer",
  wideOff: "Wide off",
  outsideOff: "Outside off",
  offStump: "Off stump",
  middle: "Middle",
  legStump: "Leg stump",
  outsideLeg: "Outside leg",
  wideLeg: "Wide leg",
  out: "Out-swing",
  in: "In-swing",
  reverse: "Reverse swing",
  none: "None",
  offBreak: "Off-break",
  legBreak: "Leg-break",
  googly: "Googly",
  armBall: "Arm-ball",
  defensive: "Defensive",
  leave: "Leave",
  drive: "Drive",
  cut: "Cut",
  pull: "Pull",
  hook: "Hook",
  sweep: "Sweep",
  reverseSweep: "Reverse sweep",
  scoop: "Scoop",
  flick: "Flick",
  glance: "Glance",
  loft: "Loft",
  frontFoot: "Front foot",
  backFoot: "Back foot",
  early: "Early",
  wellTimed: "Well timed",
  late: "Late",
  mistimed: "Mistimed",
  missed: "Missed",
  edge: "Edge",
  mishit: "Mishit",
  miss: "Miss",
  bowled: "Bowled",
  caught: "Caught",
  lbw: "LBW",
  runOut: "Run out",
  stumped: "Stumped",
  hitWicket: "Hit wicket",
  caughtBehind: "Caught behind",
  caughtAndBowled: "Caught & bowled",
  boundary: "Boundary",
  fielded: "Fielded",
  wicket: "Wicket",
  deadBall: "Dead ball",
  approach: "Approach",
  bounce: "Bounce",
  afterBounce: "After bounce",
  impact: "Impact",
  afterImpact: "After impact",
};

export function humanLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  return HUMAN_LABELS[value] ?? value;
}
