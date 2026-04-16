import type { PersistedProgress, ScoreRecord } from "../core/types";

const STORAGE_KEY = "astrologica-progress";

const DEFAULT_PROGRESS: PersistedProgress = {
  bestScores: {},
  unlockedPhases: ["phase-01-basic"],
};

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Falha ao acessar o localStorage", error);
    return null;
  }
}

function writeRaw(value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch (error) {
    console.warn("Falha ao persistir progresso", error);
  }
}

export function loadProgress(): PersistedProgress {
  const raw = readRaw();
  if (!raw) return DEFAULT_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as PersistedProgress;
    return {
      bestScores: parsed.bestScores ?? {},
      unlockedPhases: parsed.unlockedPhases ?? DEFAULT_PROGRESS.unlockedPhases,
    };
  } catch (error) {
    console.warn("Falha ao interpretar progresso salvo", error);
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: PersistedProgress) {
  writeRaw(JSON.stringify(progress));
}

export function recordScore(phaseId: string, score: ScoreRecord): PersistedProgress {
  const current = loadProgress();
  const best = current.bestScores[phaseId];
  if (!best || score.stars > best.stars || score.commandsUsed < best.commandsUsed) {
    current.bestScores[phaseId] = score;
  }
  saveProgress(current);
  return current;
}

export function unlockPhase(nextPhaseId: string): PersistedProgress {
  const current = loadProgress();
  if (!current.unlockedPhases.includes(nextPhaseId)) {
    current.unlockedPhases.push(nextPhaseId);
    saveProgress(current);
  }
  return current;
}