import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { CommandBlock, ExecutionStep, GameSnapshot, Vector2 } from "./core/types";
import { calculateCommandUsage, copyProgram, executeProgram } from "./core/gameEngine";
import { CommandPalette } from "./components/CommandPalette";
import { ProgramEditor } from "./components/ProgramEditor";
import { GameStage } from "./components/GameStage";
import { useGameStore } from "./state/gameStore";
import { evaluateScore, toScoreRecord, type ScoreResult } from "./core/scoring";
import { loadProgress, recordScore, unlockPhase } from "./services/storage";
import { COMMAND_DEFINITIONS } from "./core/commandCatalog";
import "./index.css";

// ── Constants ─────────────────────────────────────────────────────────────────
const SPEED_OPTIONS = [
  { label: "0.5×", ms: 1400 },
  { label: "1×",   ms: 750  },
  { label: "2×",   ms: 350  },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
interface SimulationState {
  id: string;
  steps: ExecutionStep[];
  reachedGoal: boolean;
  program: CommandBlock[];
}

// ── ScoreOverlay ──────────────────────────────────────────────────────────────
interface ScoreOverlayProps {
  score: ScoreResult;
  hasNext: boolean;
  onNext: () => void;
  onRetry: () => void;
}

function ScoreOverlay({ score, hasNext, onNext, onRetry }: ScoreOverlayProps) {
  const filled = score.stars;
  const empty  = 3 - filled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 backdrop-blur-sm animate-fade-in-scale">
      <div className="rounded-2xl border border-white/10 bg-panel shadow-2xl p-8 text-center w-80">

        {/* Stars */}
        <div className="flex justify-center gap-1 mb-3">
          {Array.from({ length: filled }, (_, i) => (
            <span
              key={`full-${i}`}
              className="text-3xl animate-star-drop"
              style={{ animationDelay: `${0.05 + i * 0.13}s` }}
            >
              ⭐
            </span>
          ))}
          {Array.from({ length: empty }, (_, i) => (
            <span key={`empty-${i}`} className="text-3xl opacity-20">☆</span>
          ))}
        </div>

        {/* Title */}
        <h2 className={`text-xl font-bold mb-1 ${score.reachedGoal ? "text-white" : "text-warning"}`}>
          {score.reachedGoal ? "Missão Concluída!" : "Astronauta não resgatado"}
        </h2>

        {/* Feedback */}
        <p className="text-sm text-text-secondary mb-2">{score.feedback}</p>

        {/* Stats */}
        <p className="text-xs text-text-secondary mb-6 font-mono">
          {score.commandsUsed} bloco{score.commandsUsed !== 1 ? "s" : ""} utilizados
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm text-text-secondary hover:border-white/35 hover:text-white transition"
          >
            ↺ Tentar Novamente
          </button>
          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent/85 transition animate-success"
            >
              Próxima →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const {
    phases,
    activePhaseId,
    availableCommands,
    setActivePhase,
    resetProgram,
  } = useGameStore(
    useShallow((state) => ({
      phases: state.phases,
      activePhaseId: state.activePhaseId,
      availableCommands: state.availableCommands,
      setActivePhase: state.setActivePhase,
      resetProgram: state.resetProgram,
    })),
  );

  const program    = useGameStore((state) => state.program);
  const appendCommand = useGameStore((state) => state.appendCommand);

  const phase = useMemo(
    () => phases.find((p) => p.id === activePhaseId) ?? phases[0],
    [phases, activePhaseId],
  );

  const [progress,      setProgress]      = useState(loadProgress);
  const [simulation,    setSimulation]    = useState<SimulationState | null>(null);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [isPlaying,     setIsPlaying]     = useState(false);
  const [score,         setScore]         = useState<ScoreResult | null>(null);
  const [speedIndex,    setSpeedIndex]    = useState(1);

  const runInterval = SPEED_OPTIONS[speedIndex].ms;

  // ── Derived snapshots ──────────────────────────────────────────────────────
  const baseSnapshot: GameSnapshot = useMemo(() => ({
    rover: { ...phase.rover },
    astronaut: { ...phase.astronaut },
    grid: phase.grid,
    reachedAstronaut: false,
    commandPath: "root",
  }), [phase]);

  const currentStep     = simulation?.steps[currentIndex];
  const currentSnapshot = currentStep?.snapshot ?? baseSnapshot;

  const path = useMemo<Vector2[]>(() => {
    if (!simulation) return [{ ...phase.rover.position }];
    const limit = Math.min(currentIndex + 1, simulation.steps.length);
    return simulation.steps.slice(0, limit).map((s) => ({ ...s.snapshot.rover.position }));
  }, [simulation, currentIndex, phase.rover.position]);

  // ── Reset on phase or program change ──────────────────────────────────────
  useEffect(() => {
    setSimulation(null);
    setCurrentIndex(0);
    setIsPlaying(false);
    setScore(null);
  }, [phase.id, program]);

  // ── Playback ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !simulation) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= simulation.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, runInterval);
    return () => window.clearInterval(timer);
  }, [isPlaying, simulation, runInterval]);

  // ── Score evaluation at end of execution ──────────────────────────────────
  useEffect(() => {
    if (!simulation)                                      return;
    if (score)                                            return;
    if (currentIndex !== simulation.steps.length - 1)    return;

    const result  = evaluateScore(simulation.program, phase, simulation.reachedGoal);
    setScore(result);

    const record       = toScoreRecord(result);
    const updated      = recordScore(phase.id, record);
    let finalProgress  = updated;

    const phaseIndex = phases.findIndex((p) => p.id === phase.id);
    const nextPhase  = phases[phaseIndex + 1];
    if (nextPhase && result.stars >= 2 && !updated.unlockedPhases.includes(nextPhase.id)) {
      finalProgress = unlockPhase(nextPhase.id);
    }
    setProgress(finalProgress);
  }, [simulation, currentIndex, phase, phases, score]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const ensureSimulation = (): SimulationState => {
    if (simulation) return simulation;
    const snap   = copyProgram(program);
    const result = executeProgram(snap, phase);
    const newSim: SimulationState = {
      id: `${phase.id}-${Date.now()}`,
      steps: result.steps,
      reachedGoal: result.reachedGoal,
      program: snap,
    };
    setSimulation(newSim);
    setCurrentIndex(0);
    setScore(null);
    return newSim;
  };

  const handleRun = () => {
    const sim = ensureSimulation();
    setScore(null);
    setCurrentIndex(0);
    setIsPlaying(true);
    // if simulation was already at end, reset it
    if (simulation && currentIndex === simulation.steps.length - 1) {
      setCurrentIndex(0);
    }
    void sim;
  };

  const handlePause        = () => setIsPlaying(false);
  const handleStepForward  = () => {
    const sim = ensureSimulation();
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(prev + 1, sim.steps.length - 1));
  };
  const handleStepBack     = () => { setIsPlaying(false); setCurrentIndex((prev) => Math.max(prev - 1, 0)); };
  const handleReset        = () => { setSimulation(null); setCurrentIndex(0); setIsPlaying(false); setScore(null); };

  // Bug fix: clear simulation state BEFORE changing phase, so the score
  // evaluation effect (which guards on `if (!simulation) return`) never
  // fires on the new phase's first render with stale data.
  const handleNextPhase = () => {
    const idx  = phases.findIndex((p) => p.id === phase.id);
    const next = phases[idx + 1];
    if (!next) return;
    setSimulation(null);    // ← critical: clear FIRST
    setCurrentIndex(0);
    setIsPlaying(false);
    setScore(null);
    setActivePhase(next.id);
  };

  const handleSelectPhase = (phaseId: string) => {
    setSimulation(null);
    setCurrentIndex(0);
    setIsPlaying(false);
    setScore(null);
    setActivePhase(phaseId);
  };

  // ── Derived UI values ──────────────────────────────────────────────────────
  const unlockedSet  = useMemo(() => new Set(progress.unlockedPhases), [progress.unlockedPhases]);
  const commandCount = useMemo(() => calculateCommandUsage(program), [program]);
  const phaseIndex   = phases.findIndex((p) => p.id === phase.id);
  const nextPhase    = phases[phaseIndex + 1];
  const hasNext      = !!nextPhase && score?.reachedGoal === true;

  const isAtLastStep    = simulation !== null && currentIndex === simulation.steps.length - 1;
  const showScoreOverlay = score !== null && !isPlaying && isAtLastStep;

  const currentCommandLabel = useMemo(() => {
    if (!currentStep)                                     return "Pronto para executar";
    if (!currentStep.block) {
      if (currentStep.commandId === "__start__")          return "Estado inicial";
      if (currentStep.commandId === "__success__")        return "✓ Missão concluída!";
      return "Programa finalizado";
    }
    return COMMAND_DEFINITIONS[currentStep.block.type].label;
  }, [currentStep]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-panel-dark px-6 py-2.5 shrink-0 bg-panel-dark/60 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="text-accent text-xl leading-none">⬡</span>
          <span className="font-bold tracking-widest text-white text-base uppercase">AstroLogica</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="text-white font-semibold">{phase.title}</span>
          <span className="opacity-40">·</span>
          <span>Fase {phaseIndex + 1}/{phases.length}</span>
          <span className="opacity-40">·</span>
          <span>
            <span className="text-white font-mono">{commandCount}</span> bloco{commandCount !== 1 ? "s" : ""}
          </span>
          <span className="opacity-40">·</span>
          <span>ótimo: <span className="text-white font-mono">{phase.optimal.commands}</span></span>
        </div>

        {/* Speed controls */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-secondary mr-1">velocidade</span>
          {SPEED_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setSpeedIndex(i)}
              className={`rounded px-2 py-0.5 text-xs font-mono transition ${
                i === speedIndex
                  ? "bg-accent text-black font-bold"
                  : "border border-panel-dark text-text-secondary hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Body (3 columns) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: phase list ── */}
        <aside className="w-52 shrink-0 border-r border-panel-dark bg-panel-dark/40 flex flex-col overflow-hidden">
          <div className="p-3 flex-1 overflow-y-auto space-y-0.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary mb-2 px-1">Missões</p>
            {phases.map((p, i) => {
              const unlocked = unlockedSet.has(p.id);
              const best     = progress.bestScores[p.id];
              const active   = p.id === phase.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => unlocked && handleSelectPhase(p.id)}
                  disabled={!unlocked}
                  className={`w-full rounded-lg px-2.5 py-2 text-left transition text-xs ${
                    active
                      ? "bg-accent/12 border border-accent/40 text-white"
                      : unlocked
                      ? "border border-transparent hover:border-white/10 hover:bg-white/4 text-text-secondary hover:text-white"
                      : "border border-transparent text-text-secondary/35 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold truncate">
                      {unlocked ? `${i + 1}. ${p.title}` : `🔒 Fase ${i + 1}`}
                    </span>
                    {best && (
                      <span className="text-[9px] text-warning shrink-0 tracking-tight">
                        {"★".repeat(best.stars)}{"☆".repeat(3 - best.stars)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Objectives */}
          <div className="border-t border-panel-dark p-3 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary">Objetivos</p>
            {phase.objectives.map((obj) => {
              const achieved =
                score !== null &&
                (
                  (obj.id === "reach"     && score.reachedGoal) ||
                  (obj.id === "optimal"   && score.commandsUsed <= phase.optimal.commands) ||
                  (obj.id === "loop"      && program.some((b) => b.type === "loop")) ||
                  (obj.id === "condition" && program.some((b) => b.type === "if_path_clear" || b.type === "if_obstacle_ahead")) ||
                  (obj.id === "do_while"  && program.some((b) => b.type === "do_while_path_clear" || b.type === "do_while_obstacle_ahead"))
                );
              return (
                <div
                  key={obj.id}
                  className={`rounded border px-2 py-1 text-[10px] leading-tight transition ${
                    achieved
                      ? "border-success/40 bg-success/5 text-success"
                      : "border-panel-dark text-text-secondary"
                  }`}
                >
                  <span className="mr-1">{achieved ? "✓" : "○"}</span>
                  <span className="font-semibold">{obj.label}:</span>{" "}
                  <span className="opacity-80">{obj.description}</span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Center: canvas + controls ── */}
        <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 overflow-auto">

          {/* Canvas wrapper */}
          <div className="relative rounded-xl border border-panel-dark bg-panel/20 shadow-2xl overflow-hidden">
            <GameStage phase={phase} snapshot={currentSnapshot} path={path} />

            {/* Score overlay */}
            {showScoreOverlay && (
              <ScoreOverlay
                score={score!}
                hasNext={hasNext}
                onNext={handleNextPhase}
                onRetry={handleReset}
              />
            )}
          </div>

          {/* Ambient hint */}
          {phase.ambientHint && !simulation && (
            <p className="text-xs text-text-secondary text-center max-w-sm opacity-60 animate-fade-in-up">
              💡 {phase.ambientHint}
            </p>
          )}

          {/* Step status bar */}
          {simulation && (
            <div className="flex items-center gap-3 text-xs text-text-secondary font-mono">
              <span>{currentCommandLabel}</span>
              <span className="opacity-40">·</span>
              <span>passo {currentIndex + 1}/{simulation.steps.length}</span>
              {currentStep?.message && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-warning">{currentStep.message}</span>
                </>
              )}
            </div>
          )}

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStepBack}
              disabled={!simulation || currentIndex === 0}
              title="Passo anterior"
              className="rounded-lg border border-panel-dark w-9 h-9 flex items-center justify-center text-text-secondary enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-25 transition text-sm"
            >
              ◀◀
            </button>

            {isPlaying ? (
              <button
                type="button"
                onClick={handlePause}
                className="rounded-lg border border-accent/50 bg-accent/10 px-6 h-9 text-sm font-semibold text-accent hover:bg-accent/20 transition"
              >
                ⏸ Pausar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRun}
                className="rounded-lg bg-accent px-6 h-9 text-sm font-bold text-black hover:bg-accent/90 transition"
              >
                ▶ Executar
              </button>
            )}

            <button
              type="button"
              onClick={handleStepForward}
              disabled={simulation !== null && isAtLastStep}
              title="Próximo passo"
              className="rounded-lg border border-panel-dark w-9 h-9 flex items-center justify-center text-text-secondary enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-25 transition text-sm"
            >
              ▶▶
            </button>

            <button
              type="button"
              onClick={handleReset}
              title="Reiniciar simulação"
              className="rounded-lg border border-panel-dark w-9 h-9 flex items-center justify-center text-danger/60 hover:border-danger/50 hover:text-danger transition text-base"
            >
              ↺
            </button>
          </div>
        </main>

        {/* ── Right panel: palette + editor ── */}
        <aside className="w-72 shrink-0 border-l border-panel-dark bg-panel-dark/40 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <CommandPalette commands={availableCommands} onAdd={appendCommand} />
            <ProgramEditor commands={availableCommands} />
          </div>

          {/* Clear program button */}
          <div className="border-t border-panel-dark p-3">
            <button
              type="button"
              onClick={() => { resetProgram(); handleReset(); }}
              className="w-full rounded-lg border border-danger/15 py-1.5 text-xs text-danger/50 hover:border-danger/40 hover:text-danger transition"
            >
              Limpar Programa
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
