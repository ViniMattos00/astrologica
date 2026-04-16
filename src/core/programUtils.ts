import { COMMAND_DEFINITIONS } from "./commandCatalog";
import { copyProgram } from "./gameEngine";
import type { CommandBlock } from "./types";

export type ProgramBranch = "root" | "children" | "elseChildren";

export interface InsertTarget {
  parentId: string | null;
  branch: ProgramBranch;
  index: number;
}

interface TraversalFrame {
  parentId: string | null;
  branch: ProgramBranch;
  blocks: CommandBlock[];
}

export function flattenBlocks(program: CommandBlock[]): CommandBlock[] {
  const result: CommandBlock[] = [];
  const stack: CommandBlock[] = [...program];
  while (stack.length > 0) {
    const block = stack.shift()!;
    result.push(block);
    if (block.children) {
      stack.push(...block.children);
    }
    if (block.elseChildren) {
      stack.push(...block.elseChildren);
    }
  }
  return result;
}

function traversal(program: CommandBlock[]): TraversalFrame[] {
  return [
    {
      parentId: null,
      branch: "root",
      blocks: program,
    },
  ];
}

export function findBlockById(program: CommandBlock[], blockId: string): CommandBlock | null {
  const queue = [...program];
  while (queue.length > 0) {
    const block = queue.shift()!;
    if (block.id === blockId) return block;
    if (block.children) queue.push(...block.children);
    if (block.elseChildren) queue.push(...block.elseChildren);
  }
  return null;
}

export function findPathToBlock(program: CommandBlock[], blockId: string): string[] | null {
  function helper(blocks: CommandBlock[], path: string[]): string[] | null {
    for (const block of blocks) {
      if (block.id === blockId) {
        return [...path, block.id];
      }
      if (block.children) {
        const result = helper(block.children, [...path, block.id]);
        if (result) return result;
      }
      if (block.elseChildren) {
        const result = helper(block.elseChildren, [...path, block.id]);
        if (result) return result;
      }
    }
    return null;
  }
  return helper(program, []);
}

export function removeBlock(program: CommandBlock[], blockId: string): {
  program: CommandBlock[];
  removed?: CommandBlock;
} {
  const cloned = copyProgram(program);
  const queue: TraversalFrame[] = traversal(cloned);
  while (queue.length > 0) {
    const frame = queue.shift()!;
    const index = frame.blocks.findIndex((block) => block.id === blockId);
    if (index >= 0) {
      const [removed] = frame.blocks.splice(index, 1);
      return { program: cloned, removed };
    }
    frame.blocks.forEach((block) => {
      if (block.children) {
        queue.push({ parentId: block.id, branch: "children", blocks: block.children });
      }
      if (block.elseChildren) {
        queue.push({ parentId: block.id, branch: "elseChildren", blocks: block.elseChildren });
      }
    });
  }
  return { program, removed: undefined };
}

export function insertBlock(
  program: CommandBlock[],
  target: InsertTarget,
  block: CommandBlock,
): CommandBlock[] {
  const cloned = copyProgram(program);
  const blockClone: CommandBlock = {
    ...block,
    children: block.children ? copyProgram(block.children) : undefined,
    elseChildren: block.elseChildren ? copyProgram(block.elseChildren) : undefined,
  };

  if (target.branch === "root") {
    const list = cloned;
    const index = Math.max(0, Math.min(target.index, list.length));
    list.splice(index, 0, blockClone);
    return list;
  }

  if (!target.parentId) {
    return cloned;
  }

  const parent = findBlockById(cloned, target.parentId);
  if (!parent) {
    return cloned;
  }

  const definition = COMMAND_DEFINITIONS[parent.type];
  if (target.branch === "children" && definition.supportsChildren) {
    parent.children = parent.children ? [...parent.children] : [];
    const index = Math.max(0, Math.min(target.index, parent.children.length));
    parent.children.splice(index, 0, blockClone);
  } else if (target.branch === "elseChildren" && definition.supportsElse) {
    parent.elseChildren = parent.elseChildren ? [...parent.elseChildren] : [];
    const index = Math.max(0, Math.min(target.index, parent.elseChildren.length));
    parent.elseChildren.splice(index, 0, blockClone);
  }

  return cloned;
}

export function updateBlockParams(
  program: CommandBlock[],
  blockId: string,
  params: Partial<CommandBlock["params"]>,
): CommandBlock[] {
  const cloned = copyProgram(program);
  const block = findBlockById(cloned, blockId);
  if (!block) return program;
  block.params = {
    ...block.params,
    ...params,
  };
  return cloned;
}

export function isTargetWithinBlock(
  program: CommandBlock[],
  sourceBlockId: string,
  target: InsertTarget,
): boolean {
  if (!target.parentId) return false;
  const path = findPathToBlock(program, target.parentId);
  if (!path) return false;
  return path.includes(sourceBlockId);
}