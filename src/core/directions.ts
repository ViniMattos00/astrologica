import type { Direction, Vector2 } from "./types";

export const DIRECTION_ORDER: Direction[] = [
  "north",
  "east",
  "south",
  "west",
];

export const DIRECTION_OFFSETS: Record<Direction, Vector2> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export function rotateDirection(direction: Direction, turn: "left" | "right"): Direction {
  const delta = turn === "left" ? -1 : 1;
  const currentIndex = DIRECTION_ORDER.indexOf(direction);
  const newIndex = (currentIndex + delta + DIRECTION_ORDER.length) % DIRECTION_ORDER.length;
  return DIRECTION_ORDER[newIndex];
}