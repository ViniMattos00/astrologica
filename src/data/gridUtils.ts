import type { Cell, CellType, GridDefinition } from "../core/types";

const SYMBOL_MAP: Record<string, CellType> = {
  ".": "empty",
  "#": "obstacle",
  "A": "astronaut",
  "S": "start",
  "B": "beacon",
};

export function gridFromStrings(rows: string[]): GridDefinition {
  const normalized = rows.map((row) => row.trim());
  const height = normalized.length;
  const width = Math.max(...normalized.map((row) => row.length));

  const layout: Cell[][] = Array.from({ length: height }, (_, y) => {
    const row = normalized[y];
    return Array.from({ length: width }, (_, x) => {
      const symbol = row[x] ?? ".";
      const type = SYMBOL_MAP[symbol] ?? "empty";
      return { type } satisfies Cell;
    });
  });

  return {
    width,
    height,
    layout,
  };
}

export function findPosition(grid: GridDefinition, target: CellType): { x: number; y: number } {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (grid.layout[y][x].type === target) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}