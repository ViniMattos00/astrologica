import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { COMMAND_DEFINITIONS } from "../core/commandCatalog";
import type { CommandBlock, CommandType } from "../core/types";
import { useGameStore } from "../state/gameStore";
import type { ProgramBranch } from "../core/programUtils";
import { COMMAND_STYLE } from "./CommandPalette";

type ContainerId = string;

interface DragMeta {
  type: "block";
  blockId: string;
  containerId: ContainerId;
  index: number;
  parentId: string | null;
  branch: ProgramBranch;
}

interface ContainerMeta {
  type: "container";
  containerId: ContainerId;
  parentId: string | null;
  branch: ProgramBranch;
  length: number;
}

function buildContainerId(branch: ProgramBranch, parentId: string | null): ContainerId {
  if (branch === "root") return "root";
  return `${branch}:${parentId}`;
}

function parseContainerId(containerId: ContainerId): { parentId: string | null; branch: ProgramBranch } {
  if (containerId === "root") {
    return { parentId: null, branch: "root" };
  }
  const [branch, parentId] = containerId.split(":");
  if (branch === "children" || branch === "elseChildren") {
    return { parentId: parentId ?? null, branch: branch as ProgramBranch };
  }
  return { parentId: null, branch: "root" };
}

// ── Inner "Add block" dropdown ────────────────────────────────────────────────
interface AddBlockMenuProps {
  commands: CommandType[];
  onAdd: (command: CommandType) => void;
}

function AddBlockMenu({ commands, onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded border border-white/10 px-2 py-1 text-xs text-text-secondary hover:border-white/25 hover:text-white transition"
      >
        + bloco
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-background p-2 space-y-1">
      {commands.map((command) => {
        const style = COMMAND_STYLE[command];
        return (
          <button
            key={command}
            type="button"
            onClick={() => { onAdd(command); setOpen(false); }}
            style={{ borderLeftColor: style.border, borderLeftWidth: 3, background: style.glow }}
            className="flex w-full items-center gap-2 rounded border border-white/5 px-2 py-1 text-xs text-white hover:border-white/20 transition"
          >
            <span style={{ color: style.border }}>{style.icon}</span>
            {COMMAND_DEFINITIONS[command].label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-1 w-full text-xs text-text-secondary hover:text-white transition"
      >
        cancelar
      </button>
    </div>
  );
}

// ── Droppable container ───────────────────────────────────────────────────────
interface ProgramContainerProps {
  containerId: ContainerId;
  blocks: CommandBlock[];
  parentId: string | null;
  branch: ProgramBranch;
  availableCommands: CommandType[];
  onAddCommand: (command: CommandType, branch: ProgramBranch, parentId: string | null) => void;
  renderNode: (block: CommandBlock, index: number, containerId: ContainerId, parentId: string | null, branch: ProgramBranch) => JSX.Element;
  label?: string;
}

function ProgramContainer({
  containerId,
  blocks,
  parentId,
  branch,
  availableCommands,
  onAddCommand,
  renderNode,
  label,
}: ProgramContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: { type: "container", containerId, parentId, branch, length: blocks.length } satisfies ContainerMeta,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-2 transition ${
        isOver ? "border-accent/60 bg-accent/5" : "border-white/8 bg-white/2"
      }`}
    >
      {label && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary">{label}</p>
      )}
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[28px]">
          {blocks.length === 0 && (
            <p className="text-xs text-text-secondary/50 px-1">— vazio —</p>
          )}
          {blocks.map((block, index) => renderNode(block, index, containerId, parentId, branch))}
        </div>
      </SortableContext>
      <AddBlockMenu
        commands={availableCommands}
        onAdd={(command) => onAddCommand(command, branch, parentId)}
      />
    </div>
  );
}

// ── Sortable block node ───────────────────────────────────────────────────────
interface ProgramNodeProps {
  block: CommandBlock;
  index: number;
  containerId: ContainerId;
  parentId: string | null;
  branch: ProgramBranch;
  availableCommands: CommandType[];
  onAddCommand: (command: CommandType, branch: ProgramBranch, parentId: string | null) => void;
  onRemoveCommand: (commandId: string) => void;
  onUpdateParams: (commandId: string, params: Partial<CommandBlock["params"]>) => void;
}

function ProgramNode({
  block,
  index,
  containerId,
  parentId,
  branch,
  availableCommands,
  onAddCommand,
  onRemoveCommand,
  onUpdateParams,
}: ProgramNodeProps) {
  const definition = COMMAND_DEFINITIONS[block.type];
  const style = COMMAND_STYLE[block.type];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { type: "block", blockId: block.id, containerId, index, parentId, branch } satisfies DragMeta,
  });

  const cssStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    borderLeftColor: style.border,
    borderLeftWidth: 3,
    background: style.glow,
  };

  return (
    <div
      ref={setNodeRef}
      style={cssStyle}
      className="rounded-lg border border-white/8 text-sm text-white"
    >
      {/* Block header row */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab text-text-secondary select-none text-base leading-none hover:text-white"
          title="Arrastar"
        >
          ⠿
        </span>

        {/* Icon */}
        <span style={{ color: style.border }} className="text-sm leading-none shrink-0">
          {style.icon}
        </span>

        {/* Label */}
        <span className="flex-1 font-semibold text-xs leading-tight">{definition.label}</span>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemoveCommand(block.id)}
          className="rounded px-1.5 py-0.5 text-xs text-text-secondary hover:bg-danger/20 hover:text-danger transition"
          title="Remover"
        >
          ×
        </button>
      </div>

      {/* Loop repetition input */}
      {block.type === "loop" && (
        <div className="flex items-center gap-2 border-t border-white/6 px-2.5 py-1.5">
          <label className="text-[10px] uppercase tracking-wider text-text-secondary">repetir</label>
          <input
            type="number"
            min={1}
            max={99}
            value={block.params?.count ?? 2}
            onChange={(e) =>
              onUpdateParams(block.id, { count: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })
            }
            className="w-14 rounded border border-white/10 bg-background px-2 py-0.5 text-xs text-white text-center"
          />
          <span className="text-[10px] text-text-secondary">×</span>
        </div>
      )}

      {/* Children (loop body / if-true branch) */}
      {definition.supportsChildren && (
        <div className="border-t border-white/6 px-2.5 py-2">
          <ProgramContainer
            containerId={buildContainerId("children", block.id)}
            blocks={block.children ?? []}
            parentId={block.id}
            branch="children"
            availableCommands={availableCommands}
            onAddCommand={onAddCommand}
            label={
              block.type === "loop"
                ? "corpo do loop"
                : block.type === "do_while_path_clear" || block.type === "do_while_obstacle_ahead"
                ? "corpo do faça-enquanto"
                : "se verdadeiro"
            }
            renderNode={(child, childIndex, childContainerId, childParentId, childBranch) => (
              <ProgramNode
                key={child.id}
                block={child}
                index={childIndex}
                containerId={childContainerId}
                parentId={childParentId}
                branch={childBranch}
                availableCommands={availableCommands}
                onAddCommand={onAddCommand}
                onRemoveCommand={onRemoveCommand}
                onUpdateParams={onUpdateParams}
              />
            )}
          />
        </div>
      )}

      {/* Else branch */}
      {definition.supportsElse && (
        <div className="border-t border-white/6 px-2.5 py-2">
          <ProgramContainer
            containerId={buildContainerId("elseChildren", block.id)}
            blocks={block.elseChildren ?? []}
            parentId={block.id}
            branch="elseChildren"
            availableCommands={availableCommands}
            onAddCommand={onAddCommand}
            label="senão"
            renderNode={(child, childIndex, childContainerId, childParentId, childBranch) => (
              <ProgramNode
                key={child.id}
                block={child}
                index={childIndex}
                containerId={childContainerId}
                parentId={childParentId}
                branch={childBranch}
                availableCommands={availableCommands}
                onAddCommand={onAddCommand}
                onRemoveCommand={onRemoveCommand}
                onUpdateParams={onUpdateParams}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface ProgramEditorProps {
  commands: CommandType[];
}

export function ProgramEditor({ commands }: ProgramEditorProps) {
  const {
    program,
    appendCommand,
    insertCommand,
    moveCommand,
    removeCommand,
    updateCommandParams,
  } = useGameStore((state) => ({
    program: state.program,
    appendCommand: state.appendCommand,
    insertCommand: state.insertCommand,
    moveCommand: state.moveCommand,
    removeCommand: state.removeCommand,
    updateCommandParams: state.updateCommandParams,
  }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const activeMeta = event.active.data.current as DragMeta | undefined;
    const overMeta = event.over?.data.current as DragMeta | ContainerMeta | undefined;
    if (!activeMeta || activeMeta.type !== "block" || !overMeta) return;

    let targetContainerId: ContainerId;
    let targetIndex: number;

    if (overMeta.type === "block") {
      targetContainerId = overMeta.containerId;
      targetIndex = overMeta.index;
    } else {
      targetContainerId = overMeta.containerId;
      targetIndex = overMeta.length;
    }

    const originContainerId = activeMeta.containerId;
    let adjustedIndex = targetIndex;

    if (originContainerId === targetContainerId) {
      if (adjustedIndex > activeMeta.index) adjustedIndex -= 1;
      if (adjustedIndex === activeMeta.index) return;
    }

    const { parentId, branch } = parseContainerId(targetContainerId);
    moveCommand(activeMeta.blockId, { parentId, branch, index: adjustedIndex });
  };

  const renderNode = (
    block: CommandBlock,
    index: number,
    containerId: ContainerId,
    parentId: string | null,
    branch: ProgramBranch,
  ) => (
    <ProgramNode
      key={block.id}
      block={block}
      index={index}
      containerId={containerId}
      parentId={parentId}
      branch={branch}
      availableCommands={commands}
      onAddCommand={(command, targetBranch, targetParentId) =>
        insertCommand(command, { parentId: targetParentId, branch: targetBranch, index: Number.MAX_SAFE_INTEGER })
      }
      onRemoveCommand={removeCommand}
      onUpdateParams={updateCommandParams}
    />
  );

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold uppercase tracking-widest text-text-secondary">
        Programa
      </h2>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <ProgramContainer
          containerId="root"
          blocks={program}
          parentId={null}
          branch="root"
          availableCommands={commands}
          onAddCommand={(command) => appendCommand(command)}
          renderNode={renderNode}
        />
      </DndContext>
    </div>
  );
}
