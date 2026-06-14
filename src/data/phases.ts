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
  // ── Fase 1 ───────────────────────────────────────────────────────────────
  createPhase("phase_1", "Ponto de Partida", {
    rows: ["S..A"],
    description: "Aprenda a mover o rover até o astronauta.",
    availableCommands: ["move_forward", "turn_left", "turn_right"],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "optimal", label: "Eficiência", description: "Use apenas 3 blocos." },
    ],
    optimal: { commands: 3 },
    ambientHint: "O rover começa olhando para o leste (→). Mova-o diretamente!",
  }),

  // ── Fase 2 ───────────────────────────────────────────────────────────────
  createPhase("phase_2", "Primeira Curva", {
    rows: [
      "S..",
      "..A",
    ],
    description: "Navegue em L até o astronauta.",
    availableCommands: ["move_forward", "turn_left", "turn_right"],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "optimal", label: "Eficiência", description: "Use 4 blocos ou menos." },
    ],
    optimal: { commands: 4 },
    ambientHint: "Avance, gire para o sul (↓) e avance de novo.",
  }),

  // ── Fase 3 ───────────────────────────────────────────────────────────────
  createPhase("phase_3", "Corredor Estelar", {
    rows: ["S......A"],
    description: "Use um loop para percorrer o longo corredor.",
    availableCommands: ["move_forward", "turn_left", "turn_right", "loop"],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "loop", label: "Loop", description: "Use um bloco de repetição." },
      { id: "optimal", label: "Eficiência", description: "Use apenas 2 blocos." },
    ],
    optimal: { commands: 2, notes: "loop(7){ mover } = 2 blocos" },
    ambientHint: "Um loop com 7 repetições percorre todo o corredor com só 2 blocos!",
  }),

  // ── Fase 4 ───────────────────────────────────────────────────────────────
  createPhase("phase_4", "Labirinto Lunar", {
    rows: [
      "S.....",
      "#####.",
      "....A.",
    ],
    description: "Contorne a barreira e alcance o astronauta pelo sul.",
    availableCommands: ["move_forward", "turn_left", "turn_right", "loop"],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "optimal", label: "Eficiência", description: "Use 5 blocos ou menos." },
    ],
    optimal: { commands: 5 },
    ambientHint: "Vá até o final da parede, desça, depois volte pelo corredor inferior.",
  }),

  // ── Fase 5 ───────────────────────────────────────────────────────────────
  createPhase("phase_5", "Terreno Pedregoso", {
    rows: [
      "S.#.",
      "...A",
    ],
    description: "Use condicionais para navegar por terreno com obstáculos.",
    availableCommands: ["move_forward", "turn_left", "turn_right", "if_path_clear", "if_obstacle_ahead"],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "condition", label: "Condicional", description: "Use pelo menos uma condição." },
      { id: "optimal", label: "Eficiência", description: "Use 6 blocos ou menos." },
    ],
    optimal: { commands: 6 },
    ambientHint: "Verifique se o caminho está livre antes de avançar.",
  }),

  // ── Fase 6 ───────────────────────────────────────────────────────────────
  createPhase("phase_6", "Caminho Serpentino", {
    rows: [
      "S....",
      "####.",
      ".....",
      "....A",
    ],
    description: "Navegue pelo corredor em S usando loops.",
    availableCommands: ["move_forward", "turn_left", "turn_right", "loop"],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "loop", label: "Loop", description: "Use pelo menos dois loops." },
      { id: "optimal", label: "Eficiência", description: "Use 9 blocos ou menos." },
    ],
    optimal: { commands: 9 },
    ambientHint: "Vá à direita até a parede, desça 2 células, volte à esquerda, desça 1 e vá à direita. Loops ajudam!",
  }),

  // ── Fase 7 ───────────────────────────────────────────────────────────────
  createPhase("phase_7", "Tempestade de Areia", {
    rows: [
      "S.#..",
      "..#..",
      "#....",
      "....A",
    ],
    description: "Múltiplos obstáculos exigem planejamento cuidadoso.",
    availableCommands: [
      "move_forward", "turn_left", "turn_right",
      "loop", "if_path_clear", "if_obstacle_ahead",
    ],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "condition", label: "Condicional", description: "Use condicionais para desviar." },
      { id: "optimal", label: "Eficiência", description: "Use 5 blocos ou menos." },
    ],
    optimal: { commands: 5 },
    ambientHint: "Há um caminho livre de 5 blocos — encontre-o!",
  }),

  // ── Fase 8 ───────────────────────────────────────────────────────────────
  createPhase("phase_8", "Base Orbital", {
    rows: [
      "S...#",
      ".###.",
      ".....",
      ".###.",
      "....A",
    ],
    description: "O desafio final: um labirinto em espiral dentro da base.",
    availableCommands: [
      "move_forward", "turn_left", "turn_right",
      "loop", "if_path_clear", "if_obstacle_ahead",
    ],
    objectives: [
      { id: "reach", label: "Resgate", description: "Alcance o astronauta." },
      { id: "loop", label: "Loop", description: "Use pelo menos um loop." },
      { id: "optimal", label: "Eficiência", description: "Use 6 blocos ou menos." },
    ],
    optimal: { commands: 6 },
    ambientHint: "A solução elegante usa a simetria do labirinto a seu favor.",
  }),
];

export function getPhaseById(id: string): PhaseDefinition | undefined {
  return PHASES.find((phase) => phase.id === id);
}
