"use client";
import type { Stats } from "@/lib/types";

const AXES: { key: keyof Stats; label: string }[] = [
  { key: "PAC", label: "PAC" },
  { key: "SHO", label: "SHO" },
  { key: "PAS", label: "PAS" },
  { key: "DRI", label: "DRI" },
  { key: "DEF", label: "DEF" },
  { key: "PHY", label: "PHY" },
];

export default function PlayerRadar({ stats, size = 180 }: { stats: Stats; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 26;
  const n = AXES.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (value / 100) * r;
    return [cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)];
  };
  const labelPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + (r + 14) * Math.cos(angle), cy + (r + 14) * Math.sin(angle)];
  };

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = AXES.map((a, i) => point(i, stats[a.key])).map((p) => p.join(",")).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={AXES.map((_, i) => point(i, ring * 100).join(",")).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" />;
      })}
      <polygon points={dataPts} fill="rgba(52,211,153,0.35)" stroke="#34d399" strokeWidth={2} />
      {AXES.map((a, i) => {
        const [x, y] = labelPoint(i);
        return (
          <text
            key={a.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill="rgba(255,255,255,0.7)"
          >
            {a.label} {stats[a.key]}
          </text>
        );
      })}
    </svg>
  );
}
