import type { CSSProperties } from "react";
import { Position } from "@xyflow/react";

const TAU = Math.PI * 2;
const STEP_ANGLE = TAU / 4;

export function getRotatedHandleStyle(
  base: { x: number; y: number },
  rotationSteps: number,
): CSSProperties {
  const steps = ((rotationSteps % 4) + 4) % 4;
  const angle = steps * STEP_ANGLE;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = base.x - 50;
  const dy = base.y - 50;
  const x = 50 + dx * cos - dy * sin;
  const y = 50 + dx * sin + dy * cos;

  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
  };
}

export function getRotatedHandlePosition(
  base: { x: number; y: number },
  rotationSteps: number,
): Position {
  const steps = ((rotationSteps % 4) + 4) % 4;
  const angle = steps * STEP_ANGLE;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = base.x - 50;
  const dy = base.y - 50;
  const x = 50 + dx * cos - dy * sin;
  const y = 50 + dx * sin + dy * cos;

  if (x <= 1) return Position.Left;
  if (x >= 99) return Position.Right;
  if (y <= 1) return Position.Top;
  return Position.Bottom;
}
