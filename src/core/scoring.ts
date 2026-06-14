import type { CommandBlock, PhaseDefinition, ScoreRecord } from "./types";
import { calculateCommandUsage } from "./gameEngine";

export interface ScoreResult {
  commandsUsed: number;
  stars: number;
  feedback: string;
  reachedGoal: boolean;
}

export function evaluateScore(program: CommandBlock[], phase: PhaseDefinition, reachedGoal: boolean): ScoreResult {
  const commandsUsed = calculateCommandUsage(program);

  if (!reachedGoal) {
    return {
      commandsUsed,
      stars: 0,
      reachedGoal: false,
      feedback: "A missão falhou. Ajuste a estratégia e tente novamente.",
    };
  }

  const optimal = phase.optimal.commands;
  const ratio = commandsUsed / optimal;

  let stars = 1;
  let feedback = "Missão concluída, mas há espaço para otimização.";

  if (ratio <= 1.1) {
    stars = 3;
    feedback = "Execução impecável! Você atingiu a rota ideal.";
  } else if (ratio <= 1.4) {
    stars = 2;
    feedback = "Ótimo trabalho! Que tal reduzir alguns comandos?";
  }

  return {
    commandsUsed,
    stars,
    reachedGoal: true,
    feedback,
  };
}

export function toScoreRecord(result: ScoreResult): ScoreRecord {
  return {
    commandsUsed: result.commandsUsed,
    stars: result.stars,
    timestamp: Date.now(),
  };
}