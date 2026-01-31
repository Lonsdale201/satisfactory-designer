export const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

export const truncateLabel = (value: string, maxLen: number = 8) => {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}\u2026`;
};

// Format number: hide .0 decimals but keep .5 etc
export const formatNum = (n: number | undefined): string => {
  if (n === undefined) return "0";
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
};

export const formatDuration = (minutes: number | null): string => {
  if (minutes === null || !Number.isFinite(minutes)) return "\u2014";
  if (minutes < 60) return `${formatNum(minutes)} min`;
  const hours = minutes / 60;
  return `${formatNum(hours)} h`;
};

export const normalizeUnit = (unit: string) => {
  if (!unit) return "";
  const lowered = unit.toLowerCase();
  if (lowered.includes("slot")) return unit;
  if (lowered.includes("m")) return "m\u00b3";
  return unit
    .replace(/m\u00b3/gi, "m\u00b3")
    .replace(/m3/gi, "m\u00b3")
    .replace(/m\?/gi, "m\u00b3");
};
