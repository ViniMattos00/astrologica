import type { Direction, PhaseDefinition } from "../core/types";
import { gridFromStrings, findPosition } from "./gridUtils";

interface PhaseConfig
  extends Omit<
    PhaseDefinition,
    "grid" | "rover" | "astronaut" | "id" | "title"
  > {
  rows: string[];
  direction?: Direction;
}

function createPhase(id: string, title: string, config: PhaseConfig): PhaseDefinition {
  const grid = gridFromStrings(config.rows);
  const start = findPosition(grid, "start");
  const astronaut = findPosition(grid, "astronaut");
  return {
    id,
    title,
    grid,
    rover: {
      position: start,
      direction: config.direction ?? "east",
    },
    astronaut: {
      position: astronaut,
    },
    description: config.description,
    availableCommands: config.availableCommands,
    objectives: config.objectives,
    optimal: config.optimal,
    ambientHint: config.ambientHint,
  } satisfies PhaseDefinition;
}

export const PHASES: PhaseDefinition[] = [
  createPhase("phase-01-basic", "Ponto de Partida", {
    rows: ["S..A"],
    description: "Aprenda a mover o rover passo a passo até o astronauta.",
    availableCommands: ["move_forward", "turn_left", "turn_right"],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "commands", label: "Eficiência", description: "Use no máximo 3 comandos." },
    ],
    optimal: {
      commands: 3,
      notes: "Mover, mover, mover",
    },
    ambientHint: "Observe a orientação inicial do rover.",
  }),
  createPhase("phase-02-obstacles", "Terreno Pedregoso", {
    rows: [
      "S#..",
      "..#A",
    ],
    description: "Desvie de obstáculos e planeje uma rota segura.",
    availableCommands: ["move_forward", "turn_left", "turn_right", "if_path_clear"],
    objectives: [
      { id: "avoid", label: "Evite colisões", description: "Não bata em nenhum obstáculo." },
      { id: "reach", label: "Resgate", description: "Chegue até o astronauta." },
    ],
    optimal: {
      commands: 6,
    },
    ambientHint: "Experimente validar se o caminho está livre antes de avançar.",
  }),
  createPhase("phase-03-loops", "Caminho Repetitivo", {
    rows: [
      "S...A",
      "#####",
      ".....",
    ],
    description: "Use loops para otimizar trajetos longos.",
    availableCommands: ["move_forward", "turn_left", "turn_right", "loop"],
    objectives: [
      { id: "loop", label: "Repetição", description: "Use pelo menos um bloco de repetição." },
      { id: "reach", label: "Resgate", description: "Leve o rover até o astronauta." },
    ],
    optimal: {
      commands: 4,
      notes: "Faça o rover repetir movimentos em linha reta.",
    },
  }),
  createPhase("phase-04-conditionals", "Cavernas de Gelo", {
    rows: [
      "S#..A",
      "..#..",
      "..#..",
    ],
    description: "Combine condicionais para adaptar a missão em tempo real.",
    availableCommands: [
      "move_forward",
      "turn_left",
      "turn_right",
      "loop",
      "if_path_clear",
      "if_obstacle_ahead",
    ],
    objectives: [
      { id: "condition", label: "Condicionais", description: "Utilize pelo menos uma condição if." },
      { id: "reach", label: "Resgate", description: "Encontre o astronauta." },
      { id: "optimize", label: "Otimização", description: "Fique a no máximo 2 comandos da solução ótima." },
    ],
    optimal: {
      commands: 8,
    },
    ambientHint: "Monitore o que há à frente antes de decidir mover.",
  }),
];

export function getPhaseById(id: string): PhaseDefinition | undefined {
  return PHASES.find((phase) => phase.id === id);
}