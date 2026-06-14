import { COMMAND_DEFINITIONS } from "../core/commandCatalog";
import type { CommandType } from "../core/types";

export const COMMAND_STYLE: Record<CommandType, { border: string; glow: string; icon: string }> = {
  move_forward:           { border: "#3b82f6", glow: "rgba(59,130,246,0.15)",   icon: "▲" },
  turn_left:              { border: "#8b5cf6", glow: "rgba(139,92,246,0.15)",   icon: "↺" },
  turn_right:             { border: "#8b5cf6", glow: "rgba(139,92,246,0.15)",   icon: "↻" },
  loop:                   { border: "#f97316", glow: "rgba(249,115,22,0.15)",   icon: "⟳" },
  if_path_clear:          { border: "#22c55e", glow: "rgba(34,197,94,0.15)",    icon: "?" },
  if_obstacle_ahead:      { border: "#eab308", glow: "rgba(234,179,8,0.15)",    icon: "!" },
  do_while_path_clear:    { border: "#ec4899", glow: "rgba(236,72,153,0.15)",   icon: "↻?" },
  do_while_obstacle_ahead:{ border: "#f43f5e", glow: "rgba(244,63,94,0.15)",    icon: "↻!" },
};

interface CommandPaletteProps {
  commands: CommandType[];
  onAdd: (command: CommandType) => void;
}

export function CommandPalette({ commands, onAdd }: CommandPaletteProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold uppercase tracking-widest text-text-secondary">
        Blocos
      </h2>
      <div className="space-y-1.5">
        {commands.map((command) => {
          const def = COMMAND_DEFINITIONS[command];
          const style = COMMAND_STYLE[command];
          return (
            <button
              key={command}
              type="button"
              onClick={() => onAdd(command)}
              style={{ borderLeftColor: style.border, borderLeftWidth: 3, background: style.glow }}
              className="flex w-full items-center gap-2.5 rounded-lg border border-white/8 px-3 py-2 text-left transition hover:border-white/20"
            >
              <span style={{ color: style.border }} className="text-base leading-none shrink-0">
                {style.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{def.label}</p>
                <p className="text-xs text-text-secondary leading-tight">{def.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
