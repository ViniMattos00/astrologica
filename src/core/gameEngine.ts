import { nanoid } from "nanoid";
import { DIRECTION_OFFSETS, rotateDirection } from "./directions";
import type {
  AstronautState,
  CommandBlock,
  CommandType,
  ExecutionStep,
  GameSnapshot,
  GridDefinition,
  PhaseDefinition,
  RoverState,
} from "./types";

interface SimulationContext {
  rover: RoverState;
  astronaut: AstronautState;
  grid: GridDefinition;
  reachedAstronaut: boolean;
}

function cloneContext(context: SimulationContext): SimulationContext {
  return {
    rover: {
      position: { ...context.rover.position },
      direction: context.rover.direction,
    },
    astronaut: { position: { ...context.astronaut.position } },
    grid: context.grid,
    reachedAstronaut: context.reachedAstronaut,
  };
}

function snapshotFromContext(context: SimulationContext, commandPath: string): GameSnapshot {
  return {
    rover: {
      position: { ...context.rover.position },
      direction: context.rover.direction,
    },
    astronaut: { position: { ...context.astronaut.position } },
    grid: context.grid,
    reachedAstronaut: context.reachedAstronaut,
    commandPath,
  };
}

function isInsideGrid(grid: GridDefinition, x: number, y: number): boolean {
  return x >= 0 && x < grid.width && y >= 0 && y < grid.height;
}

function getCellType(grid: GridDefinition, x: number, y: number): string {
  if (!isInsideGrid(grid, x, y)) {
    return "void";
  }
  return grid.layout[y][x]?.type ?? "empty";
}

function isPathClear(context: SimulationContext): boolean {
  const offset = DIRECTION_OFFSETS[context.rover.direction];
  const nextX = context.rover.position.x + offset.x;
  const nextY = context.rover.position.y + offset.y;
  const cell = getCellType(context.grid, nextX, nextY);
  return cell !== "void" && cell !== "obstacle";
}

function moveForward(context: SimulationContext): { status: "ok" | "blocked"; message?: string } {
  const offset = DIRECTION_OFFSETS[context.rover.direction];
  const nextX = context.rover.position.x + offset.x;
  const nextY = context.rover.position.y + offset.y;

  if (!isInsideGrid(context.grid, nextX, nextY)) {
    return { status: "blocked", message: "O rover sairia da área explorável." };
  }

  const cellType = getCellType(context.grid, nextX, nextY);
  if (cellType === "obstacle") {
    return { status: "blocked", message: "Há um obstáculo à frente." };
  }

  context.rover.position.x = nextX;
  context.rover.position.y = nextY;

  if (cellType === "astronaut") {
    context.reachedAstronaut = true;
  }

  return { status: "ok" };
}

function executeAtomicCommand(command: CommandType, context: SimulationContext) {
  if (command === "move_forward") {
    return moveForward(context);
  }

  if (command === "turn_left") {
    context.rover.direction = rotateDirection(context.rover.direction, "left");
    return { status: "ok" as const };
  }

  if (command === "turn_right") {
    context.rover.direction = rotateDirection(context.rover.direction, "right");
    return { status: "ok" as const };
  }

  return { status: "ok" as const };
}

interface TraverseOptions {
  commandPath: string;
  steps: ExecutionStep[];
  context: SimulationContext;
}

function traverseBlocks(blocks: CommandBlock[], options: TraverseOptions) {
  blocks.forEach((block, index) => {
    const localPath = `${options.commandPath}/${index}`;
    processBlock(block, {
      commandPath: localPath,
      steps: options.steps,
      context: options.context,
    });
  });
}

function processBlock(block: CommandBlock, options: TraverseOptions) {
  const { context, commandPath, steps } = options;

  if (context.reachedAstronaut) {
    return;
  }

  if (block.type === "loop") {
    const repetitions = Math.max(1, block.params?.count ?? 1);
    for (let i = 0; i < repetitions && !context.reachedAstronaut; i += 1) {
      traverseBlocks(block.children ?? [], {
        context,
        steps,
        commandPath: `${commandPath}/loop-${i}`,
      });
    }
    return;
  }

  if (block.type === "if_path_clear" || block.type === "if_obstacle_ahead") {
    const pathClear = isPathClear(context);
    const shouldRunPrimary = block.type === "if_path_clear" ? pathClear : !pathClear;
    const branch = shouldRunPrimary ? block.children : block.elseChildren;

    steps.push({
      commandId: block.id,
      commandPath,
      block,
      snapshot: snapshotFromContext(context, commandPath),
      status: shouldRunPrimary ? "ok" : "blocked",
      message: shouldRunPrimary
        ? undefined
        : block.type === "if_path_clear"
        ? "Caminho não está livre. Bloco ignorado."
        : "Não há obstáculo à frente. Bloco ignorado.",
    });

    if (branch && branch.length > 0 && shouldRunPrimary) {
      traverseBlocks(branch, { context, steps, commandPath: `${commandPath}/branch` });
    } else if (branch && branch.length > 0 && !shouldRunPrimary) {
      traverseBlocks(branch, { context, steps, commandPath: `${commandPath}/else` });
    }
    return;
  }

  const before = cloneContext(context);
  const result = executeAtomicCommand(block.type, context);

  const snapshot = snapshotFromContext(context, commandPath);
  const status = result.status;
  const message = result.message;

  steps.push({
    commandId: block.id,
    commandPath,
    block,
    snapshot,
    status,
    message,
  });

  if (status === "blocked") {
    // revert to previous state to avoid inconsistent animation state
    context.rover = before.rover;
    context.reachedAstronaut = before.reachedAstronaut;
  }
}

export function buildInitialContext(phase: PhaseDefinition): SimulationContext {
  return {
    rover: {
      position: { ...phase.rover.position },
      direction: phase.rover.direction,
    },
    astronaut: { position: { ...phase.astronaut.position } },
    grid: phase.grid,
    reachedAstronaut: false,
  };
}

export function executeProgram(
  program: CommandBlock[],
  phase: PhaseDefinition,
): { steps: ExecutionStep[]; reachedGoal: boolean } {
  const context = buildInitialContext(phase);
  const steps: ExecutionStep[] = [];

  steps.push({
    commandId: "__start__",
    commandPath: "root",
    snapshot: snapshotFromContext(context, "root"),
    status: "ok",
  });

  traverseBlocks(program, {
    commandPath: "root",
    steps,
    context,
  });

  steps.push({
    commandId: context.reachedAstronaut ? "__success__" : "__end__",
    commandPath: "root",
    snapshot: snapshotFromContext(context, "root"),
    status: context.reachedAstronaut ? "completed" : "blocked",
    message: context.reachedAstronaut
      ? "Astronauta resgatado com sucesso."
      : "Programa finalizado sem resgatar o astronauta.",
  });

  return {
    steps,
    reachedGoal: context.reachedAstronaut,
  };
}

export function createCommandBlock(type: CommandType): CommandBlock {
  return {
    id: nanoid(),
    type,
    children: [],
    elseChildren: [],
  };
}

export function copyProgram(blocks: CommandBlock[]): CommandBlock[] {
  return blocks.map((block) => ({
    ...block,
    params: block.params ? { ...block.params } : undefined,
    children: block.children ? copyProgram(block.children) : undefined,
    elseChildren: block.elseChildren ? copyProgram(block.elseChildren) : undefined,
  }));
}

export function calculateCommandUsage(blocks: CommandBlock[]): number {
  return blocks.reduce((total, block) => {
    const inner = (block.children ? calculateCommandUsage(block.children) : 0) +
      (block.elseChildren ? calculateCommandUsage(block.elseChildren) : 0);
    // Count each block once (not multiplied by loop iterations) so loops reward efficiency
    return total + 1 + inner;
  }, 0);
}