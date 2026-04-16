import type { CommandDefinition, CommandType } from "./types";

export const COMMAND_DEFINITIONS: Record<CommandType, CommandDefinition> = {
  move_forward: {
    type: "move_forward",
    label: "Mover",
    description: "Avança uma célula na direção atual.",
    color: "bg-panel",
    accent: "border-accent",
  },
  turn_left: {
    type: "turn_left",
    label: "Virar Esquerda",
    description: "Rotaciona o rover 90° à esquerda.",
    color: "bg-panel",
    accent: "border-accent-soft",
  },
  turn_right: {
    type: "turn_right",
    label: "Virar Direita",
    description: "Rotaciona o rover 90° à direita.",
    color: "bg-panel",
    accent: "border-accent-soft",
  },
  loop: {
    type: "loop",
    label: "Repetir",
    description: "Repete o bloco interno o número de vezes definido.",
    color: "bg-panel-dark",
    accent: "border-accent",
    supportsChildren: true,
    defaultParams: { count: 2 },
    unlockPhase: "phase-03-loops",
  },
  if_path_clear: {
    type: "if_path_clear",
    label: "Se caminho livre",
    description: "Executa os comandos internos quando não há obstáculo à frente.",
    color: "bg-panel-dark",
    accent: "border-success",
    supportsChildren: true,
    supportsElse: true,
    unlockPhase: "phase-04-conditionals",
  },
  if_obstacle_ahead: {
    type: "if_obstacle_ahead",
    label: "Se obstáculo",
    description: "Executa os comandos quando há obstáculo logo à frente.",
    color: "bg-panel-dark",
    accent: "border-warning",
    supportsChildren: true,
    supportsElse: true,
    unlockPhase: "phase-04-conditionals",
  },
};

export const DEFAULT_PROGRAM: CommandType[] = [
  "move_forward",
  "turn_left",
  "turn_right",
];

export const BASIC_COMMANDS: CommandType[] = [
  "move_forward",
  "turn_left",
  "turn_right",
];

export function getCommandDefinition(type: CommandType): CommandDefinition {
  return COMMAND_DEFINITIONS[type];
}