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

type ContainerId = string;

interface AddCommandMenuProps {
  commands: CommandType[];
  onAdd: (command: CommandType) => void;
  label?: string;
}

function AddCommandMenu({ commands, onAdd, label = "Adicionar" }: AddCommandMenuProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-2 rounded-md border border-accent/40 px-2 py-1 text-xs font-semibold text-accent hover:border-accent"
      >
        + {label}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-accent/40 bg-panel-dark p-2">
      <p className="mb-2 text-xs font-semibold text-text-secondary">Selecionar bloco</p>
      <div className="grid gap-1">
        {commands.map((command) => (
          <button
            key={command}
            type="button"
            onClick={() => {
              onAdd(command);
              setOpen(false);
            }}
            className="rounded border border-accent/30 px-2 py-1 text-left text-xs text-white transition hover:border-accent"
          >
            {COMMAND_DEFINITIONS[command].label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-3 w-full rounded bg-danger/20 px-2 py-1 text-xs text-danger hover:bg-danger/30"
      >
        cancelar
      </button>
    </div>
  );
}

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

interface ProgramContainerProps {
  containerId: ContainerId;
  blocks: CommandBlock[];
  parentId: string | null;
  branch: ProgramBranch;
  availableCommands: CommandType[];
  onAddCommand: (command: CommandType, branch: ProgramBranch, parentId: string | null) => void;
  renderNode: (block: CommandBlock, index: number, containerId: ContainerId, parentId: string | null, branch: ProgramBranch) => JSX.Element;
}

function ProgramContainer({
  containerId,
  blocks,
  parentId,
  branch,
  availableCommands,
  onAddCommand,
  renderNode,
}: ProgramContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: { type: "container", containerId, parentId, branch, length: blocks.length } satisfies ContainerMeta,
  });

  const outline = isOver ? "border-accent" : "border-panel-dark";

  return (
    <div ref={setNodeRef} className={`rounded-lg border ${outline} bg-panel/60 p-3 transition`}>
      <SortableContext
        items={blocks.map((block) => block.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {blocks.length === 0 && (
            <p className="text-sm text-text-secondary">Arraste blocos aqui ou adicione abaixo.</p>
          )}
          {blocks.map((block, index) => renderNode(block, index, containerId, parentId, branch))}
        </div>
      </SortableContext>
      <AddCommandMenu
        commands={availableCommands}
        onAdd={(command) => onAddCommand(command, branch, parentId)}
      />
    </div>
  );
}

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: {
      type: "block",
      blockId: block.id,
      containerId,
      index,
      parentId,
      branch,
    } satisfies DragMeta,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-accent/30 bg-panel p-3 text-sm text-white shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{definition.label}</p>
          <p className="text-xs text-text-secondary">{definition.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-accent/40 px-2 py-1 text-xs text-accent"
            {...attributes}
            {...listeners}
          >
            mover
          </button>
          <button
            type="button"
            onClick={() => onRemoveCommand(block.id)}
            className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:border-danger"
          >
            excluir
          </button>
        </div>
      </div>

      {block.type === "loop" && (
        <div className="mt-3">
          <label className="text-xs uppercase text-text-secondary">repetições</label>
          <input
            type="number"
            min={1}
            value={block.params?.count ?? 2}
            onChange={(event) =>
              onUpdateParams(block.id, { count: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })
            }
            className="mt-1 w-24 rounded border border-panel-dark bg-panel-dark px-2 py-1 text-sm text-white"
          />
        </div>
      )}

      {definition.supportsChildren && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-text-secondary">Blocos internos</p>
          <ProgramContainer
            containerId={buildContainerId("children", block.id)}
            blocks={block.children ?? []}
            parentId={block.id}
            branch="children"
            availableCommands={availableCommands}
            onAddCommand={onAddCommand}
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

      {definition.supportsElse && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase text-text-secondary">Blocos caso contrário</p>
          <ProgramContainer
            containerId={buildContainerId("elseChildren", block.id)}
            blocks={block.elseChildren ?? []}
            parentId={block.id}
            branch="elseChildren"
            availableCommands={availableCommands}
            onAddCommand={onAddCommand}
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const activeMeta = event.active.data.current as DragMeta | undefined;
    const overMeta = event.over?.data.current as (DragMeta | ContainerMeta | undefined);
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
      if (adjustedIndex > activeMeta.index) {
        adjustedIndex -= 1;
      }
      if (adjustedIndex === activeMeta.index) {
        return;
      }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Programa</h2>
        <button
          type="button"
          onClick={() => appendCommand(commands[0])}
          className="rounded-md border border-accent/40 px-3 py-1 text-sm text-accent hover:border-accent"
        >
          + adicionar ao final
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <ProgramContainer
          containerId="root"
          blocks={program}
          parentId={null}
          branch="root"
          availableCommands={commands}
          onAddCommand={(command, _branch, _parentId) => appendCommand(command)}
          renderNode={renderNode}
        />
      </DndContext>
    </div>
  );
}