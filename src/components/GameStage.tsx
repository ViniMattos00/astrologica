import { useEffect, useMemo, useState } from "react";
import { Stage, Layer, Rect, Group, Circle, Text, Line, Image as KonvaImage } from "react-konva";
import type { GameSnapshot, PhaseDefinition, Vector2 } from "../core/types";

// ── Constants ────────────────────────────────────────────────────────────────
const CELL_PAD = 3;

function computeCellSize(cols: number, rows: number): number {
  const byW = Math.floor(520 / cols);
  const byH = Math.floor(420 / rows);
  return Math.max(58, Math.min(90, Math.min(byW, byH)));
}

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── SVG assets ───────────────────────────────────────────────────────────────
// Top-down rover, front = RIGHT side (east)
const ROVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <ellipse cx="32" cy="32" rx="28" ry="21" fill="black" opacity="0.25"/>
  <!-- Wheels top -->
  <rect x="5"  y="4"  width="12" height="8" rx="3" fill="#1f2937" stroke="#111827" stroke-width="0.5"/>
  <rect x="22" y="4"  width="12" height="8" rx="3" fill="#1f2937" stroke="#111827" stroke-width="0.5"/>
  <rect x="39" y="4"  width="12" height="8" rx="3" fill="#1f2937" stroke="#111827" stroke-width="0.5"/>
  <!-- Wheels bottom -->
  <rect x="5"  y="52" width="12" height="8" rx="3" fill="#1f2937" stroke="#111827" stroke-width="0.5"/>
  <rect x="22" y="52" width="12" height="8" rx="3" fill="#1f2937" stroke="#111827" stroke-width="0.5"/>
  <rect x="39" y="52" width="12" height="8" rx="3" fill="#1f2937" stroke="#111827" stroke-width="0.5"/>
  <!-- Suspension bars -->
  <rect x="4" y="11" width="47" height="4" rx="1.5" fill="#374151"/>
  <rect x="4" y="49" width="47" height="4" rx="1.5" fill="#374151"/>
  <!-- Main body shell -->
  <rect x="6" y="15" width="46" height="34" rx="5" fill="#9ca3af"/>
  <rect x="8" y="17" width="42" height="30" rx="4" fill="#6b7280"/>
  <!-- Solar panels (back/left half) -->
  <rect x="9"  y="19" width="16" height="10" rx="2" fill="#1e40af" opacity="0.9"/>
  <line x1="14" y1="19" x2="14" y2="29" stroke="#60a5fa" stroke-width="0.9" opacity="0.7"/>
  <line x1="19" y1="19" x2="19" y2="29" stroke="#60a5fa" stroke-width="0.9" opacity="0.7"/>
  <rect x="9"  y="35" width="16" height="10" rx="2" fill="#1e40af" opacity="0.9"/>
  <line x1="14" y1="35" x2="14" y2="45" stroke="#60a5fa" stroke-width="0.9" opacity="0.7"/>
  <line x1="19" y1="35" x2="19" y2="45" stroke="#60a5fa" stroke-width="0.9" opacity="0.7"/>
  <!-- Instrument bay (front half) -->
  <rect x="27" y="19" width="20" height="26" rx="3" fill="#4b5563"/>
  <rect x="29" y="21" width="8"  height="8" rx="1" fill="#374151"/>
  <rect x="39" y="21" width="6"  height="8" rx="1" fill="#374151"/>
  <circle cx="37" cy="37" r="5" fill="#374151"/>
  <circle cx="37" cy="37" r="2" fill="#1f2937"/>
  <!-- Front camera/eye -->
  <circle cx="55" cy="32" r="6" fill="#0284c7" opacity="0.95"/>
  <circle cx="55" cy="32" r="3" fill="white"  opacity="0.9"/>
  <circle cx="55" cy="32" r="1.5" fill="#0ea5e9"/>
  <!-- RTG / engine back glow -->
  <circle cx="5" cy="32" r="4" fill="#f97316" opacity="0.75"/>
  <circle cx="5" cy="32" r="2" fill="#fed7aa" opacity="0.8"/>
</svg>`;

// Top-down astronaut
const ASTRONAUT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <!-- PLSS backpack (left = back side) -->
  <rect x="4" y="20" width="15" height="24" rx="4" fill="#e2e8f0"/>
  <rect x="6" y="22" width="11" height="9"  rx="2" fill="#94a3b8"/>
  <circle cx="9"  cy="37" r="2" fill="#475569"/>
  <circle cx="14" cy="37" r="2" fill="#475569"/>
  <!-- Life support hose -->
  <path d="M 19 27 Q 17 32 19 37" stroke="#94a3b8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Suit body (torso) -->
  <ellipse cx="34" cy="44" rx="14" ry="9" fill="#f1f5f9"/>
  <!-- Helmet ring -->
  <circle cx="36" cy="28" r="20" fill="#cbd5e1"/>
  <!-- Helmet dome -->
  <circle cx="36" cy="28" r="18" fill="#f8fafc"/>
  <!-- Gold visor -->
  <ellipse cx="38" cy="28" rx="11" ry="9" fill="#f59e0b" opacity="0.85"/>
  <!-- Visor reflection -->
  <ellipse cx="33" cy="23" rx="4" ry="2.5" fill="white" opacity="0.6"/>
  <!-- Helmet edge ring -->
  <circle cx="36" cy="28" r="17.5" fill="none" stroke="#e2e8f0" stroke-width="2"/>
  <!-- Mission patch placeholder -->
  <rect x="22" y="41" width="10" height="5" rx="1" fill="#1e40af" opacity="0.55"/>
</svg>`;

// Astronaut reached (green tint visor)
const ASTRONAUT_REACHED_SVG = ASTRONAUT_SVG.replace(
  `fill="#f59e0b" opacity="0.85"`,
  `fill="#10b981" opacity="0.9"`,
);

// ── Lunar terrain colours ────────────────────────────────────────────────────
const CELL_COLORS = {
  empty:     { fill: "#191b22", stroke: "#252730" },
  obstacle:  { fill: "#1a0f28", stroke: "#7c3aed" },  // deep purple + vivid violet border
  start:     { fill: "#131d14", stroke: "#1e3220" },
  astronaut: { fill: "#131924", stroke: "#1e2a38" },
  beacon:    { fill: "#1a1510", stroke: "#2e2218" },
} as const;

// ── SVG → HTML Image hook ─────────────────────────────────────────────────────
function useSvgImage(svg: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = new window.Image();
    el.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    el.onload = () => setImg(el);
    return () => { el.onload = null; };
  }, [svg]);
  return img;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface GameStageProps {
  phase: PhaseDefinition;
  snapshot: GameSnapshot;
  path?: Vector2[];
}

export function GameStage({ phase, snapshot, path = [] }: GameStageProps) {
  const CS = computeCellSize(phase.grid.width, phase.grid.height);
  const stageW = phase.grid.width  * CS;
  const stageH = phase.grid.height * CS;

  // Preload images
  const roverImg      = useSvgImage(ROVER_SVG);
  const astronautImg  = useSvgImage(snapshot.reachedAstronaut ? ASTRONAUT_REACHED_SVG : ASTRONAUT_SVG);

  // Smooth pulse for beacon ring
  const [pulse, setPulse] = useState(0.6);
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => { t += 0.07; setPulse(0.5 + 0.35 * Math.sin(t)); }, 45);
    return () => clearInterval(id);
  }, []);

  // Rover rotation
  const roverRotation = useMemo(() => {
    const map = { north: -90, east: 0, south: 90, west: 180 } as const;
    return map[snapshot.rover.direction];
  }, [snapshot.rover.direction]);

  // Path line points
  const pathPoints = useMemo(
    () => path.flatMap((p) => [p.x * CS + CS / 2, p.y * CS + CS / 2]),
    [path, CS],
  );

  // Stars (seeded by grid size)
  const stars = useMemo(() => {
    const rand = seededRandom(phase.grid.width * 997 + phase.grid.height * 37 + 13);
    return Array.from({ length: Math.round(stageW * stageH / 700) }, () => ({
      x: rand() * stageW,
      y: rand() * stageH,
      r: rand() * 1.3 + 0.3,
      a: rand() * 0.5 + 0.1,
    }));
  }, [phase.grid.width, phase.grid.height, stageW, stageH]);

  // Craters per empty/start cell (seeded)
  const craters = useMemo(() =>
    phase.grid.layout.map((row, y) =>
      row.map((cell, x) => {
        if (cell.type === "obstacle") return [];
        const rand = seededRandom(x * 131 + y * 79 + 41);
        const n = Math.floor(rand() * 4);
        return Array.from({ length: n }, () => ({
          cx: rand() * (CS - 10) + 5,
          cy: rand() * (CS - 10) + 5,
          r:  rand() * 5 + 3,
          op: rand() * 0.25 + 0.1,
        }));
      }),
    ),
    [phase.grid.layout, CS],
  );

  // Rocky dots on obstacle cells
  const rockDots = useMemo(() =>
    phase.grid.layout.map((row, y) =>
      row.map((cell, x) => {
        if (cell.type !== "obstacle") return [];
        const rand = seededRandom(x * 211 + y * 97 + 13);
        const n = Math.floor(rand() * 6) + 3;
        return Array.from({ length: n }, () => ({
          cx: rand() * (CS - 8) + 4,
          cy: rand() * (CS - 8) + 4,
          r:  rand() * 4 + 2,
          op: rand() * 0.3 + 0.15,
        }));
      }),
    ),
    [phase.grid.layout, CS],
  );

  const rcx = snapshot.rover.position.x * CS + CS / 2;
  const rcy = snapshot.rover.position.y * CS + CS / 2;
  const acx = snapshot.astronaut.position.x * CS + CS / 2;
  const acy = snapshot.astronaut.position.y * CS + CS / 2;

  const imgSize = CS * 0.82;

  return (
    <Stage width={stageW} height={stageH}>

      {/* ── Layer 1: Deep space background + stars ── */}
      <Layer>
        <Rect x={0} y={0} width={stageW} height={stageH} fill="#070810" />
        {stars.map((s, i) => (
          <Circle key={i} x={s.x} y={s.y} radius={s.r} fill="#ffffff" opacity={s.a} />
        ))}
      </Layer>

      {/* ── Layer 2: Lunar surface cells ── */}
      <Layer>
        {phase.grid.layout.map((row, y) =>
          row.map((cell, x) => {
            const px = x * CS;
            const py = y * CS;
            const c  = CELL_COLORS[cell.type] ?? CELL_COLORS.empty;
            const inner = CS - CELL_PAD * 2;

            return (
              <Group key={`${x}-${y}`}>
                {/* Base cell */}
                <Rect
                  x={px + CELL_PAD} y={py + CELL_PAD}
                  width={inner} height={inner}
                  cornerRadius={6}
                  fill={c.fill} stroke={c.stroke}
                  strokeWidth={cell.type === "obstacle" ? 2 : 1}
                />

                {/* Craters on empty cells */}
                {craters[y][x].map((cr, ci) => (
                  <Circle
                    key={ci}
                    x={px + cr.cx} y={py + cr.cy}
                    radius={cr.r}
                    fill="#0a0b12"
                    stroke="#14151e"
                    strokeWidth={1}
                    opacity={cr.op}
                  />
                ))}

                {/* Rock texture on obstacle cells */}
                {rockDots[y][x].map((rd, ri) => (
                  <Circle
                    key={ri}
                    x={px + rd.cx} y={py + rd.cy}
                    radius={rd.r}
                    fill="#6d28d9"
                    opacity={rd.op * 1.8}
                  />
                ))}

                {/* START label */}
                {cell.type === "start" && (
                  <Text
                    x={px} y={py + inner - 5}
                    width={CS}
                    text="START"
                    align="center"
                    fontSize={7} fontStyle="bold"
                    fill="#4ade80" opacity={0.55}
                    letterSpacing={1}
                  />
                )}
              </Group>
            );
          }),
        )}
      </Layer>

      {/* ── Layer 3: Path trail ── */}
      <Layer>
        {pathPoints.length >= 4 && (
          <Line
            points={pathPoints}
            stroke="#5dd0ff" strokeWidth={1.5}
            opacity={0.15}
            lineCap="round" lineJoin="round"
          />
        )}
        {path.map((p, i) => (
          <Circle
            key={`trail-${i}`}
            x={p.x * CS + CS / 2} y={p.y * CS + CS / 2}
            radius={3}
            fill="#5dd0ff"
            opacity={0.12 + (i / Math.max(path.length, 1)) * 0.28}
          />
        ))}
      </Layer>

      {/* ── Layer 4: Entities ── */}
      <Layer>

        {/* Astronaut beacon ring (pulsing) + image */}
        <Group>
          <Circle
            x={acx} y={acy}
            radius={(CS / 2.1) * pulse}
            fill="transparent"
            stroke={snapshot.reachedAstronaut ? "#10b981" : "#5dd0ff"}
            strokeWidth={1.5}
            opacity={0.45}
          />
          {astronautImg ? (
            <KonvaImage
              image={astronautImg}
              x={acx - imgSize / 2} y={acy - imgSize / 2}
              width={imgSize} height={imgSize}
            />
          ) : (
            <Text x={acx - 10} y={acy - 8} text="🧑‍🚀" fontSize={20} />
          )}
          {/* Success overlay */}
          {snapshot.reachedAstronaut && (
            <Text
              x={acx - 10} y={acy - imgSize / 2 - 16}
              text="✓"
              fontSize={16} fontStyle="bold"
              fill="#10b981" opacity={0.9}
            />
          )}
        </Group>

        {/* Rover (rotated) + image */}
        <Group x={rcx} y={rcy} rotation={roverRotation} offsetX={0} offsetY={0}>
          {/* Subtle glow */}
          <Circle radius={CS / 2.2} fill="#5dd0ff" opacity={0.05} />
          {roverImg ? (
            <KonvaImage
              image={roverImg}
              x={-imgSize / 2} y={-imgSize / 2}
              width={imgSize} height={imgSize}
            />
          ) : (
            <Text x={-12} y={-12} text="🚗" fontSize={24} />
          )}
        </Group>
      </Layer>
    </Stage>
  );
}
