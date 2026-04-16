import { useMemo } from "react";
import { Stage, Layer, Rect, Group, RegularPolygon, Circle, Text } from "react-konva";
import type { GameSnapshot, PhaseDefinition, Vector2 } from "../core/types";

const CELL_SIZE = 64;
const GRID_GAP = 2;

function cellPosition(x: number, y: number) {
  return {
    x: x * CELL_SIZE,
    y: y * CELL_SIZE,
  };
}

interface GameStageProps {
  phase: PhaseDefinition;
  snapshot: GameSnapshot;
  path?: Vector2[];
}

export function GameStage({ phase, snapshot, path = [] }: GameStageProps) {
  const width = phase.grid.width * CELL_SIZE;
  const height = phase.grid.height * CELL_SIZE;

  const roverRotation = useMemo(() => {
    switch (snapshot.rover.direction) {
      case "north":
        return -90;
      case "east":
        return 0;
      case "south":
        return 90;
      case "west":
      default:
        return 180;
    }
  }, [snapshot.rover.direction]);

  return (
    <Stage
      width={width}
      height={height}
      className="rounded-xl border border-panel-dark bg-panel-dark shadow-inner"
    >
      <Layer>
        {phase.grid.layout.map((row, y) =>
          row.map((cell, x) => {
            const { x: px, y: py } = cellPosition(x, y);
            let fill = "#11152c";
            if (cell.type === "obstacle") fill = "#1f254d";
            if (cell.type === "astronaut") fill = "#233a6b";
            if (cell.type === "start") fill = "#1a2852";

            return (
              <Rect
                key={`${x}-${y}`}
                x={px + GRID_GAP}
                y={py + GRID_GAP}
                width={CELL_SIZE - GRID_GAP * 2}
                height={CELL_SIZE - GRID_GAP * 2}
                cornerRadius={8}
                fill={fill}
                stroke="#1e2a4d"
                strokeWidth={1}
              />
            );
          }),
        )}
      </Layer>

      <Layer>
        {path.map((point, index) => {
          const { x, y } = cellPosition(point.x, point.y);
          return (
            <Circle
              key={`path-${index}`}
              x={x + CELL_SIZE / 2}
              y={y + CELL_SIZE / 2}
              radius={6}
              fill="#5dd0ff50"
            />
          );
        })}
      </Layer>

      <Layer>
        <Group>
          {(() => {
            const { x, y } = cellPosition(snapshot.astronaut.position.x, snapshot.astronaut.position.y);
            const centerX = x + CELL_SIZE / 2;
            const centerY = y + CELL_SIZE / 2;
            return (
              <Group>
                <Circle
                  x={centerX}
                  y={centerY}
                  radius={CELL_SIZE / 3}
                  fill={snapshot.reachedAstronaut ? "#54f2c4" : "#5dd0ff"}
                  opacity={0.4}
                />
                <Text
                  x={centerX - 10}
                  y={centerY - 12}
                  text="SOS"
                  fontSize={14}
                  fill="#ffffff"
                />
              </Group>
            );
          })()}
        </Group>

        <Group>
          {(() => {
            const { x, y } = cellPosition(snapshot.rover.position.x, snapshot.rover.position.y);
            const centerX = x + CELL_SIZE / 2;
            const centerY = y + CELL_SIZE / 2;
            return (
              <Group x={centerX} y={centerY} rotation={roverRotation}>
                <RegularPolygon
                  sides={3}
                  radius={CELL_SIZE / 3}
                  fill="#ffffff"
                  stroke="#5dd0ff"
                  strokeWidth={2}
                />
              </Group>
            );
          })()}
        </Group>
      </Layer>
    </Stage>
  );
}