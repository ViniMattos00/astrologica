export type Direction = "north" | "east" | "south" | "west";

export interface Vector2 {
  x: number;
  y: number;
}

export type CellType = "empty" | "obstacle" | "astronaut" | "start" | "beacon";

export interface Cell {
  type: CellType;
}

export interface GridDefinition {
  width: number;
  height: number;
  layout: Cell[][];
}

export interface RoverState {
  position: Vector2;
  direction: Direction;
}

export interface AstronautState {
  position: Vector2;
}

export type CommandType =
  | "move_forward"
  | "turn_left"
  | "turn_right"
  | "loop"
  | "if_path_clear"
  | "if_obstacle_ahead"
  | "do_while_path_clear"
  | "do_while_obstacle_ahead";

export interface CommandParameters {
  count?: number;
}

export interface CommandBlock {
  id: string;
  type: CommandType;
  params?: CommandParameters;
  children?: CommandBlock[];
  elseChildren?: CommandBlock[];
}

export interface CommandDefinition {
  type: CommandType;
  label: string;
  description: string;
  color: string;
  accent: string;
  supportsChildren?: boolean;
  supportsElse?: boolean;
  defaultParams?: CommandParameters;
  unlockPhase?: string;
}

export interface PhaseObjective {
  id: string;
  label: string;
  description: string;
}

export interface OptimalSolution {
  commands: number;
  notes?: string;
}

export interface PhaseDefinition {
  id: string;
  title: string;
  description: string;
  grid: GridDefinition;
  rover: RoverState;
  astronaut: AstronautState;
  availableCommands: CommandType[];
  objectives: PhaseObjective[];
  optimal: OptimalSolution;
  ambientHint?: string;
}

export type ExecutionStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface GameSnapshot {
  rover: RoverState;
  astronaut: AstronautState;
  grid: GridDefinition;
  reachedAstronaut: boolean;
  commandPath: string;
}

export interface ExecutionStep {
  commandId: string;
  commandPath: string;
  block?: CommandBlock;
  snapshot: GameSnapshot;
  status: "ok" | "blocked" | "completed";
  message?: string;
}

export interface ScoreRecord {
  commandsUsed: number;
  stars: number;
  timestamp: number;
}

export interface PersistedProgress {
  bestScores: Record<string, ScoreRecord>;
  unlockedPhases: string[];
}