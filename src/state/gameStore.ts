import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  CommandBlock,
  CommandType,
  ExecutionStatus,
  PhaseDefinition,
} from "../core/types";
import { BASIC_COMMANDS } from "../core/commandCatalog";
import { copyProgram, createCommandBlock } from "../core/gameEngine";
import {
  insertBlock,
  type InsertTarget,
  removeBlock,
  updateBlockParams,
  isTargetWithinBlock,
} from "../core/programUtils";
import { PHASES } from "../data/phases";

interface ExecutionState {
  status: ExecutionStatus;
  currentStepIndex: number;
  reachedGoal: boolean;
  message?: string;
}

interface GameState {
  phases: PhaseDefinition[];
  activePhaseId: string;
  program: CommandBlock[];
  availableCommands: CommandType[];
  execution: ExecutionState;
}

interface GameActions {
  setProgram: (program: CommandBlock[]) => void;
  appendCommand: (command: CommandType) => void;
  insertCommand: (command: CommandType, target: InsertTarget) => void;
  moveCommand: (commandId: string, target: InsertTarget) => void;
  removeCommand: (commandId: string) => void;
  updateCommandParams: (commandId: string, params: Partial<CommandBlock["params"]>) => void;
  setActivePhase: (phaseId: string) => void;
  resetProgram: () => void;
  setExecutionState: (patch: Partial<ExecutionState>) => void;
}

const DEFAULT_EXECUTION_STATE: ExecutionState = {
  status: "idle",
  currentStepIndex: -1,
  reachedGoal: false,
  message: undefined,
};

function createDefaultProgram(): CommandBlock[] {
  return BASIC_COMMANDS.map((type) => createCommandBlock(type));
}

export const useGameStore = create<GameState & GameActions>()(
  immer((set) => ({
    phases: PHASES,
    activePhaseId: PHASES[0].id,
    program: createDefaultProgram(),
    availableCommands: BASIC_COMMANDS,
    execution: DEFAULT_EXECUTION_STATE,

    setProgram: (program) => {
      set((state) => {
        state.program = copyProgram(program);
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    appendCommand: (commandType) => {
      set((state) => {
        state.program.push(createCommandBlock(commandType));
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    insertCommand: (commandType, target) => {
      set((state) => {
        const newBlock = createCommandBlock(commandType);
        state.program = insertBlock(state.program, target, newBlock);
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    moveCommand: (commandId, target) => {
      set((state) => {
        if (isTargetWithinBlock(state.program, commandId, target)) {
          return;
        }
        const { program: withoutBlock, removed } = removeBlock(state.program, commandId);
        if (!removed) return;
        state.program = insertBlock(withoutBlock, target, removed);
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    removeCommand: (commandId) => {
      set((state) => {
        const { program: updated } = removeBlock(state.program, commandId);
        state.program = updated;
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    updateCommandParams: (commandId, params) => {
      set((state) => {
        state.program = updateBlockParams(state.program, commandId, params);
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    setActivePhase: (phaseId) => {
      set((state) => {
        state.activePhaseId = phaseId;
        state.program = createDefaultProgram();
        const phase = state.phases.find((item) => item.id === phaseId);
        state.availableCommands = phase?.availableCommands ?? BASIC_COMMANDS;
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    resetProgram: () => {
      set((state) => {
        state.program = createDefaultProgram();
        state.execution = DEFAULT_EXECUTION_STATE;
      });
    },

    setExecutionState: (patch) => {
      set((state) => {
        state.execution = {
          ...state.execution,
          ...patch,
        };
      });
    },
  })),
);