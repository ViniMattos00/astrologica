import type { PersistedProgress, ScoreRecord } from "../core/types";

const STORAGE_KEY = "astrologica-progress";

const DEFAULT_PROGRESS: PersistedProgress = {
  bestScores: {},
  unlockedPhases: ["phase_1"],
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

// Maps obsolete phase IDs (from earlier prototypes) to current IDs
const PHASE_ID_MIGRATIONS: Record<string, string> = {
  "phase-01-basic": "phase_1",
  "phase-02-turn":  "phase_2",
  "phase-03-loops": "phase_3",
  "phase-04-conditionals": "phase_4",
};

export function loadProgress(): PersistedProgress {
  const raw = readRaw();
  if (!raw) return DEFAULT_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as PersistedProgress;
    // Migrate any old-format phase IDs and always ensure phase_1 is unlocked
    const unlocked: string[] = (parsed.unlockedPhases ?? DEFAULT_PROGRESS.unlockedPhases)
      .map((id) => PHASE_ID_MIGRATIONS[id] ?? id);
    if (!unlocked.includes("phase_1")) unlocked.unshift("phase_1");
    return {
      bestScores: parsed.bestScores ?? {},
      unlockedPhases: unlocked,
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