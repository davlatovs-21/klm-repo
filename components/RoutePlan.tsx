"use client";

import { useRef, useState } from "react";
import {
  planNodes, planBounds, pointAtDistance, distanceAtPoint, snapToGrid, segmentsToPoint,
  isVertical, turnBetween, SNAP_M, CROSSING_LABEL,
  type Route, type Segment,
} from "@/lib/core/route";

/**
 * Схема трассы — вид сверху, модуль M3.2 ТЗ.
 *
 * Векторная, не растровая: масштабируется без потерь, каждый маркер — обычный
 * элемент DOM, поэтому перетаскивание и клавиатура работают без отдельного слоя.
 *
 * Вся геометрия живёт в lib/core/route.ts и покрыта тестами; здесь только
 * перевод в координаты холста и обработка указателя.
 */

const PAD_MM = 6_000;
const GRID_MM = SNAP_M * 1000;
/** Больше этого числа клеток по стороне сетка превращается в кашу и не рисуется.
    Считается из масштаба плана, а не из размеров DOM: во время отрисовки
    измерять элемент нельзя, да и результат не должен зависеть от ширины окна. */
const GRID_MAX_CELLS = 160;

/** Склонение по числу: «2 участка», а не «2 участков» — описание читает экранный диктор */
const plural = (n: number, one: string, few: string, many: string) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
};

type Props = {
  route: Route;
  onChange: (next: Route) => void;
  nextId: (prefix: string) => string;
};

export default function RoutePlan({ route, onChange, nextId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverMm, setHoverMm] = useState<number | null>(null);

  const nodes = planNodes(route.segments);
  const bounds = planBounds(nodes);
  const totalMm = nodes[nodes.length - 1]?.atMm ?? 0;

  const minX = bounds.minX - PAD_MM;
  const minY = bounds.minY - PAD_MM;
  const width = Math.max(bounds.maxX - bounds.minX, 10_000) + PAD_MM * 2;
  const height = Math.max(bounds.maxY - bounds.minY, 10_000) + PAD_MM * 2;

  /** Ось Y на плане направлена на север, в SVG — вниз, поэтому знак меняется */
  const toSvgY = (yMm: number) => bounds.maxY + bounds.minY - yMm;

  /** Экранная точка → координаты плана в миллиметрах */
  const toPlan = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const kx = width / rect.width;
    const ky = height / rect.height;
    const xMm = minX + (e.clientX - rect.left) * kx;
    const ySvg = minY + (e.clientY - rect.top) * ky;
    return { xMm, yMm: bounds.maxY + bounds.minY - ySvg };
  };

  const strokeW = Math.max(width, height) / 160;
  const dot = strokeW * 1.6;
  const fontSize = Math.max(width, height) / 55;
  const showGrid = Math.max(width, height) / GRID_MM <= GRID_MAX_CELLS;

  const endNode = nodes[nodes.length - 1];

  /* ── перетаскивание отвода вдоль трассы ─────────────────────── */

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toPlan(e);
    if (!p) return;

    if (!dragging) {
      // подсветка позиции под указателем помогает целиться перед добавлением
      setHoverMm(totalMm > 0 ? distanceAtPoint(route.segments, p.xMm, p.yMm) : null);
      return;
    }
    const positionM = snapToGrid(distanceAtPoint(route.segments, p.xMm, p.yMm) / 1000);
    onChange({
      ...route,
      taps: route.taps.map((t) => (t.id === dragging ? { ...t, positionM } : t)),
    });
  };

  /* ── клик по свободному месту продлевает трассу ─────────────── */

  const onCanvasClick = (e: React.PointerEvent) => {
    if (dragging) return;
    const p = toPlan(e);
    if (!p) return;

    // цель прижимается к сетке 0,5 м — окна отбора идут с этим шагом
    const targetX = Math.round(p.xMm / GRID_MM) * GRID_MM;
    const targetY = Math.round(p.yMm / GRID_MM) * GRID_MM;

    const parts = segmentsToPoint(endNode.xMm, endNode.yMm, targetX, targetY);
    if (parts.length === 0) return;

    const last = route.segments.at(-1);
    const added: Segment[] = parts.map((part) => ({
      id: nextId("s"),
      direction: part.direction,
      lengthMm: part.lengthMm,
      ratedA: last?.ratedA,
    }));

    /* если первый новый участок продолжает направление последнего — не плодим
       лишний узел, а удлиняем существующий: угла там нет */
    if (last && added[0] && last.direction === added[0].direction && !isVertical(last.direction)) {
      const merged = { ...last, lengthMm: last.lengthMm + added[0].lengthMm };
      onChange({ ...route, segments: [...route.segments.slice(0, -1), merged, ...added.slice(1)] });
      return;
    }
    onChange({ ...route, segments: [...route.segments, ...added] });
  };

  if (route.segments.length === 0)
    return (
      <div className="grid h-[260px] place-items-center rounded-xl2 border border-dashed border-line-2 text-[13px] text-mute">
        Добавьте участок — схема появится здесь
      </div>
    );

  return (
    <div className="rounded-xl2 border border-line bg-[#f9fbfc]">
      <svg
        ref={svgRef}
        viewBox={`${minX} ${minY} ${width} ${height}`}
        className="h-[clamp(240px,42vh,460px)] w-full touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => { setDragging(null); setHoverMm(null); }}
        onClick={onCanvasClick as unknown as React.MouseEventHandler<SVGSVGElement>}
        role="img"
        aria-label={`Схема трассы длиной ${(totalMm / 1000).toFixed(1)} м: ${plural(route.segments.length, "участок", "участка", "участков")}, ${plural(route.taps.length, "отвод", "отвода", "отводов")}`}
      >
        {showGrid && (
          <>
            <defs>
              <pattern id="grid" width={GRID_MM} height={GRID_MM} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID_MM} 0 L 0 0 0 ${GRID_MM}`} fill="none" stroke="#d7e3e8" strokeWidth={strokeW / 6} />
              </pattern>
            </defs>
            <rect x={minX} y={minY} width={width} height={height} fill="url(#grid)" />
          </>
        )}

        {/* трасса */}
        <polyline
          points={nodes.map((n) => `${n.xMm},${toSvgY(n.yMm)}`).join(" ")}
          fill="none"
          stroke="var(--color-cur)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* подписи длин участков */}
        {route.segments.map((s, i) => {
          if (isVertical(s.direction)) return null;
          const a = nodes[i];
          const b = nodes[i + 1];
          return (
            <text
              key={s.id}
              x={(a.xMm + b.xMm) / 2}
              y={toSvgY((a.yMm + b.yMm) / 2) - strokeW * 1.6}
              textAnchor="middle"
              fontSize={fontSize}
              fill="#5b7683"
              className="font-mono"
            >
              {(s.lengthMm / 1000).toFixed(1)} м
            </text>
          );
        })}

        {/* узлы: углы и вертикальные участки */}
        {nodes.map((n, i) => {
          const prev = route.segments[i - 1];
          const next = route.segments[i];
          const vertical = route.segments[i - 1] && isVertical(route.segments[i - 1].direction);
          const turn = prev && next ? turnBetween(prev.direction, next.direction) : null;
          if (!turn && !vertical) return null;

          return (
            <g key={`n${i}`}>
              <circle
                cx={n.xMm}
                cy={toSvgY(n.yMm)}
                r={dot * 0.8}
                fill="#fff"
                stroke={turn?.kind === "reversal" ? "var(--color-fault)" : "var(--color-cur-d)"}
                strokeWidth={strokeW / 1.6}
              />
              {vertical && (
                <text
                  x={n.xMm + dot * 1.6}
                  y={toSvgY(n.yMm) - dot}
                  fontSize={fontSize}
                  fill="var(--color-cur-d)"
                  className="font-mono"
                >
                  {prev.direction === "up" ? "↑" : "↓"} {(prev.lengthMm / 1000).toFixed(1)} м
                </text>
              )}
            </g>
          );
        })}

        {/* точка питания */}
        {(["start", "both"] as const).includes(route.feed as "start" | "both") && (
          <rect
            x={nodes[0].xMm - dot}
            y={toSvgY(nodes[0].yMm) - dot}
            width={dot * 2}
            height={dot * 2}
            fill="var(--color-ink)"
            rx={dot / 3}
          />
        )}
        {route.feed === "both" && (
          <rect
            x={endNode.xMm - dot}
            y={toSvgY(endNode.yMm) - dot}
            width={dot * 2}
            height={dot * 2}
            fill="var(--color-ink)"
            rx={dot / 3}
          />
        )}
        {route.feed === "center" &&
          (() => {
            const p = pointAtDistance(route.segments, totalMm / 2);
            return (
              <rect
                x={p.xMm - dot}
                y={toSvgY(p.yMm) - dot}
                width={dot * 2}
                height={dot * 2}
                fill="var(--color-ink)"
                rx={dot / 3}
              />
            );
          })()}

        {/* пересечения границ */}
        {route.crossings.map((c) => {
          const p = pointAtDistance(route.segments, c.positionM * 1000);
          const color = c.kind === "fire" ? "var(--color-fault)" : c.kind === "expansion" ? "var(--color-copper)" : "#5b7683";
          return (
            <line
              key={c.id}
              x1={p.xMm - dot * 1.4}
              y1={toSvgY(p.yMm) - dot * 1.4}
              x2={p.xMm + dot * 1.4}
              y2={toSvgY(p.yMm) + dot * 1.4}
              stroke={color}
              strokeWidth={strokeW}
              strokeLinecap="round"
              role="img"
              aria-label={`${CROSSING_LABEL[c.kind]} на ${c.positionM} м`}
            />
          );
        })}

        {/* отводы — перетаскиваются вдоль трассы */}
        {route.taps.map((t) => {
          const p = pointAtDistance(route.segments, t.positionM * 1000);
          const outside = t.positionM < 0 || t.positionM * 1000 > totalMm;
          return (
            <g
              key={t.id}
              onPointerDown={(e) => { e.stopPropagation(); setDragging(t.id); }}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab"
              role="img"
              aria-label={`${t.purpose ? `${t.purpose}: ` : ""}${t.currentA} А на ${t.positionM} м, перетаскивается вдоль трассы`}
            >
              <circle
                cx={p.xMm}
                cy={toSvgY(p.yMm)}
                r={dot * 1.15}
                fill={outside ? "var(--color-fault)" : "var(--color-copper)"}
                stroke="#fff"
                strokeWidth={strokeW / 2}
              />
              <text
                x={p.xMm}
                y={toSvgY(p.yMm) + dot * 3}
                textAnchor="middle"
                fontSize={fontSize}
                fill="#5b7683"
                className="font-mono"
              >
                {t.currentA} А
              </text>
            </g>
          );
        })}
      </svg>

      <p className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-[11.5px] text-mute">
        <span>Клик по схеме продлевает трассу · отводы перетаскиваются вдоль неё · шаг сетки {SNAP_M} м</span>
        {hoverMm != null && <span className="font-mono">{(hoverMm / 1000).toFixed(1)} м от начала</span>}
      </p>
    </div>
  );
}
