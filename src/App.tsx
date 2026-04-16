import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { CommandBlock, ExecutionStep, GameSnapshot, Vector2 } from "./core/types";
import { copyProgram, executeProgram } from "./core/gameEngine";
import { CommandPalette } from "./components/CommandPalette";
import { ProgramEditor } from "./components/ProgramEditor";
import { GameStage } from "./components/GameStage";
import { useGameStore } from "./state/gameStore";
import { evaluateScore, toScoreRecord, type ScoreResult } from "./core/scoring";
import { loadProgress, recordScore, unlockPhase } from "./services/storage";
import { COMMAND_DEFINITIONS } from "./core/commandCatalog";
import "./index.css";

const RUN_INTERVAL = 800;

interface SimulationState {
  id: string;
  steps: ExecutionStep[];
  reachedGoal: boolean;
  program: CommandBlock[];
}

function App() {
  const {
    phases,
    activePhaseId,
    availableCommands,
    setActivePhase,
  } = useGameStore(
    useShallow((state) => ({
      phases: state.phases,
      activePhaseId: state.activePhaseId,
      availableCommands: state.availableCommands,
      setActivePhase: state.setActivePhase,
    })),
  );

  const program = useGameStore((state) => state.program);
  const appendCommand = useGameStore((state) => state.appendCommand);

  const phase = useMemo(
    () => phases.find((item) => item.id === activePhaseId) ?? phases[0],
    [phases, activePhaseId],
  );

  const [progress, setProgress] = useState(loadProgress);
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);

  const baseSnapshot: GameSnapshot = useMemo(
    () => ({
      rover: { ...phase.rover },
      astronaut: { ...phase.astronaut },
      grid: phase.grid,
      reachedAstronaut: false,
      commandPath: "root",
    }),
    [phase],
  );

  const currentStep = simulation?.steps[currentIndex];
  const currentSnapshot = currentStep?.snapshot ?? baseSnapshot;

  const path = useMemo<Vector2[]>(() => {
    if (!simulation) {
      return [{ ...phase.rover.position }];
    }
    const limit = Math.min(currentIndex + 1, simulation.steps.length);
    return simulation.steps.slice(0, limit).map((step) => ({ ...step.snapshot.rover.position }));
  }, [simulation, currentIndex, phase.rover.position]);

  useEffect(() => {
    setSimulation(null);
    setCurrentIndex(0);
    setIsPlaying(false);
    setScore(null);
  }, [phase.id, program]);

  useEffect(() => {
    if (!isPlaying || !simulation) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => {
        if (!simulation) return prev;
        if (prev >= simulation.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, RUN_INTERVAL);
    return () => window.clearInterval(timer);
  }, [isPlaying, simulation]);

  useEffect(() => {
    if (!simulation) return;
    if (score) return;
    if (currentIndex !== simulation.steps.length - 1) return;

    const result = evaluateScore(simulation.program, phase, simulation.reachedGoal);
    setScore(result);
    const record = toScoreRecord(result);
    const updated = recordScore(phase.id, record);
    let finalProgress = updated;
    const phaseIndex = phases.findIndex((item) => item.id === phase.id);
    const nextPhase = phases[phaseIndex + 1];
    if (nextPhase && result.stars >= 2 && !updated.unlockedPhases.includes(nextPhase.id)) {
      finalProgress = unlockPhase(nextPhase.id);
    }
    setProgress(finalProgress);
  }, [simulation, currentIndex, phase, phases, score]);

  const ensureSimulation = () => {
    if (simulation) return simulation;
    const snapshot = copyProgram(program);
    const result = executeProgram(snapshot, phase);
    const newSimulation: SimulationState = {
      id: `${phase.id}-${Date.now()}`,
      steps: result.steps,
      reachedGoal: result.reachedGoal,
      program: snapshot,
    };
    setSimulation(newSimulation);
    setCurrentIndex(0);
    setScore(null);
    return newSimulation;
  };

  const handleRun = () => {
    const newSimulation = ensureSimulation();
    if (!newSimulation) return;
    setScore(null);
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleStepForward = () => {
    const newSimulation = ensureSimulation();
    if (!newSimulation) return;
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(prev + 1, newSimulation.steps.length - 1));
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleReset = () => {
    setSimulation(null);
    setCurrentIndex(0);
    setIsPlaying(false);
    setScore(null);
  };

  const currentCommandLabel = useMemo(() => {
    if (!currentStep) return "Pronto para executar";
    if (!currentStep.block) {
      if (currentStep.commandId === "__start__") return "Estado inicial";
      if (currentStep.commandId === "__success__") return "Missão concluída";
      return "Programa finalizado";
    }
    return COMMAND_DEFINITIONS[currentStep.block.type].label;
  }, [currentStep]);

  const lockedPhases = useMemo(
    () => new Set(progress.unlockedPhases),
    [progress.unlockedPhases],
  );

  const currentScore = score;
  return (
    <div className="min-h-screen bg-background text-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-panel-dark bg-panel-dark/60 p-6 space-y-6">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Missão</p>
            <h1 className="text-2xl font-semibold text-white">AstroLogica</h1>
            <p className="text-sm text-text-secondary">
              Programe o rover para resgatar o astronauta usando lógica visual.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-text-secondary">Fases</h2>
            <div className="space-y-2">
              {phases.map((mission) => {
                const unlocked = lockedPhases.has(mission.id);
                const best = progress.bestScores[mission.id];
                return (
                  <button
                    key={mission.id}
                    type="button"
                    onClick={() => unlocked && setActivePhase(mission.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      mission.id === phase.id
                        ? "border-accent bg-panel"
                        : "border-panel-dark bg-panel-dark hover:border-accent/40"
                    } ${unlocked ? "text-white" : "text-text-secondary opacity-60"}`}
                    disabled={!unlocked}
                  >
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{mission.title}</span>
                      <span className="text-xs text-accent">
                        {best ? `${"★".repeat(best.stars)}${"☆".repeat(3 - best.stars)}` : "---"}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{mission.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-text-secondary">Objetivos</h2>
            <ul className="space-y-1 text-xs text-text-secondary">
              {phase.objectives.map((objective) => (
                <li key={objective.id} className="rounded border border-panel-dark bg-panel px-2 py-1">
                  <p className="font-semibold text-white">{objective.label}</p>
                  <p>{objective.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <main className="flex flex-1 flex-col lg:flex-row">
          <section className="flex flex-1 flex-col gap-6 p-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto rounded-xl border border-panel-dark bg-panel/40 p-4">
                  <GameStage phase={phase} snapshot={currentSnapshot} path={path} />
                </div>
                <div className="rounded-xl border border-panel-dark bg-panel/60 p-4 text-sm">
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-text-secondary">Comando atual</p>
                      <p className="text-lg font-semibold text-white">{currentCommandLabel}</p>
                    </div>
                    <span className="rounded-full border border-panel-dark px-3 py-1 text-xs text-text-secondary">
                      etapa {currentIndex + 1}/{simulation?.steps.length ?? 1}
                    </span>
                  </header>
                  {currentStep?.message && (
                    <p className="mt-2 text-xs text-warning">{currentStep.message}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-panel-dark bg-panel/60 p-4 text-sm">
                <h2 className="text-lg font-semibold text-white">Controle</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRun}
                    className="rounded border border-accent/50 px-3 py-1 text-sm text-accent hover:border-accent"
                  >
                    Executar
                  </button>
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={!isPlaying}
                    className="rounded border border-panel-dark px-3 py-1 text-sm text-text-secondary enabled:hover:border-accent"
                  >
                    Pausar
                  </button>
                  <button
                    type="button"
                    onClick={handleStepForward}
                    className="rounded border border-panel-dark px-3 py-1 text-sm text-text-secondary hover:border-accent"
                  >
                    Passo
                  </button>
                  <button
                    type="button"
                    onClick={handleStepBack}
                    disabled={currentIndex === 0}
                    className="rounded border border-panel-dark px-3 py-1 text-sm text-text-secondary enabled:hover:border-accent"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded border border-danger/50 px-3 py-1 text-sm text-danger hover:border-danger"
                  >
                    Resetar
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs text-text-secondary">
                  <p>
                    Status: <span className="text-white">{isPlaying ? "Executando" : "Pronto"}</span>
                  </p>
                  <p>
                    Solução ótima: <span className="text-white">{phase.optimal.commands} comandos</span>
                  </p>
                  {currentScore && (
                    <div className="rounded border border-panel-dark bg-panel p-3 text-white">
                      <p className="text-sm font-semibold text-accent">
                        {"★".repeat(currentScore.stars)}{"☆".repeat(3 - currentScore.stars)}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {currentScore.commandsUsed} comandos utilizados
                      </p>
                      <p className="mt-1 text-xs text-white">{currentScore.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="w-full border-t border-panel-dark bg-panel-dark/40 p-6 lg:w-[30rem] lg:border-t-0 lg:border-l overflow-y-auto">
            <div className="space-y-8">
              <CommandPalette commands={availableCommands} onAdd={appendCommand} />
              <ProgramEditor commands={availableCommands} />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
