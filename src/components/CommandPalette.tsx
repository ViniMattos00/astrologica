import { COMMAND_DEFINITIONS } from "../core/commandCatalog";
import type { CommandType } from "../core/types";

interface CommandPaletteProps {
  commands: CommandType[];
  onAdd: (command: CommandType) => void;
}

export function CommandPalette({ commands, onAdd }: CommandPaletteProps) {
  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-white">Blocos disponíveis</h2>
        <p className="text-sm text-text-secondary">
          Combine os blocos para traçar a rota do rover.
        </p>
      </header>
      <div className="grid gap-2">
        {commands.map((command) => {
          const definition = COMMAND_DEFINITIONS[command];
          return (
            <button
              key={command}
              type="button"
              onClick={() => onAdd(command)}
              className="group rounded-lg border border-accent/40 bg-panel px-4 py-3 text-left transition hover:border-accent hover:shadow-glow"
            >
              <p className="text-sm font-semibold text-white group-hover:text-accent">
                {definition.label}
              </p>
              <p className="text-xs text-text-secondary">{definition.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}