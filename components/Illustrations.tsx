/**
 * Живые схемы. Чистый инлайновый SVG, анимация — CSS-классами из globals.css,
 * поэтому prefers-reduced-motion отключает движение автоматически.
 */

export function BusbarScene({
  taps = 1,
  tapCurrent = 63,
  busCurrent = 630,
  mount = "plug",
  ok = true,
  dark = false,
  className = "",
}: {
  taps?: number;
  tapCurrent?: number;
  busCurrent?: number;
  mount?: "plug" | "bolt";
  ok?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const accent = ok ? "#00aec0" : "#e24a5e";
  const line = dark ? "rgba(255,255,255,0.18)" : "#c9d6dd";
  const body = dark ? "rgba(255,255,255,0.06)" : "#ffffff";
  const text = dark ? "#8fb4c0" : "#61798a";
  const ink = dark ? "#ffffff" : "#0b1a21";

  const n = Math.min(3, Math.max(1, taps));
  const xs = Array.from({ length: n }, (_, i) => 150 + i * (n === 1 ? 0 : 170) + (n === 1 ? 170 : 0));

  return (
    <svg viewBox="0 0 640 250" role="img" aria-label="Схема шинопровода с коробками отбора мощности" className={className}>
      <defs>
        <linearGradient id="railgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark ? "rgba(255,255,255,0.10)" : "#f4f8f9"} />
          <stop offset="1" stopColor={dark ? "rgba(255,255,255,0.03)" : "#e6eef1"} />
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* подвесы */}
      {[110, 330, 550].map((x) => (
        <g key={x} stroke={line} strokeWidth="2">
          <path d={`M${x} 18v34`} />
          <path d={`M${x - 12} 18h24`} />
        </g>
      ))}

      {/* магистраль */}
      <rect x="18" y="52" width="604" height="46" rx="9" fill="url(#railgrad)" stroke={line} strokeWidth="2" />
      {[64, 74, 84].map((y) => (
        <path key={y} d={`M30 ${y}h580`} stroke={line} strokeWidth="1.5" opacity="0.7" />
      ))}
      {/* бегущий ток */}
      <path d="M30 75h580" stroke={accent} strokeWidth="3" className="anim-dash" strokeLinecap="round" filter="url(#glow)" opacity="0.9" />

      {/* питание */}
      <g>
        <path d="M0 75h18" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <text x="26" y="42" fill={text} fontSize="12" fontFamily="var(--font-mono)">
          {busCurrent} А
        </text>
      </g>

      {/* отводы */}
      {xs.map((x, i) => (
        <g key={i}>
          {/* точка отвода на шине */}
          <rect x={x - 26} y="88" width="52" height="12" rx="4" fill={accent} opacity="0.9" />
          <path d={`M${x} 100v24`} stroke={accent} strokeWidth="3" className="anim-dash" strokeLinecap="round" />

          {/* корпус КОМ */}
          <rect x={x - 52} y="124" width="104" height="76" rx="12" fill={body} stroke={ok ? accent : "#e24a5e"} strokeWidth="2" />
          <rect x={x - 52} y="124" width="104" height="22" rx="12" fill={accent} opacity={dark ? 0.22 : 0.12} />
          <text x={x} y="139" textAnchor="middle" fill={ink} fontSize="11" fontWeight="700" fontFamily="var(--font-sans)">
            КОМ
          </text>

          {mount === "plug" ? (
            <g stroke={accent} strokeWidth="2.5" strokeLinecap="round">
              <path d={`M${x - 14} 106v10`} />
              <path d={`M${x + 14} 106v10`} />
            </g>
          ) : (
            <g fill={accent}>
              <circle cx={x - 16} cy="112" r="3.5" />
              <circle cx={x + 16} cy="112" r="3.5" />
            </g>
          )}

          <text x={x} y="170" textAnchor="middle" fill={ink} fontSize="19" fontWeight="700" fontFamily="var(--font-mono)">
            {tapCurrent} А
          </text>
          <text x={x} y="188" textAnchor="middle" fill={text} fontSize="10.5" fontFamily="var(--font-sans)">
            {mount === "plug" ? "Plug-in" : "Bolt-on"}
          </text>

          {/* кабель к потребителю */}
          <path d={`M${x} 200v22`} stroke={line} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={x} cy="228" r="5" fill="none" stroke={line} strokeWidth="2" className="anim-blip" />
        </g>
      ))}

      {!ok && (
        <g transform="translate(568 150)">
          <circle r="18" fill="#fdecee" stroke="#e24a5e" strokeWidth="2" />
          <path d="M0 -8v9M0 6v.1" stroke="#e24a5e" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

export function LoadGauge({ percent, label = "Загрузка корпуса" }: { percent: number; label?: string }) {
  const p = Math.max(0, Math.min(100, percent));
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = (c * 0.75 * p) / 100;
  const color = p > 90 ? "#e24a5e" : p > 70 ? "#b4703a" : "#00aec0";

  return (
    <svg viewBox="0 0 140 130" role="img" aria-label={`${label}: ${p} процентов`} className="w-full max-w-[170px]">
      <g transform="translate(70 70) rotate(135)">
        <circle r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="11" strokeDasharray={`${c * 0.75} ${c}`} strokeLinecap="round" />
        <circle
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .7s cubic-bezier(.22,1,.36,1), stroke .3s" }}
        />
      </g>
      <text x="70" y="70" textAnchor="middle" fill="#fff" fontSize="27" fontWeight="700" fontFamily="var(--font-mono)">
        {p}%
      </text>
      <text x="70" y="90" textAnchor="middle" fill="#8fb4c0" fontSize="10.5" fontFamily="var(--font-sans)">
        от номинала
      </text>
    </svg>
  );
}

/** Схема «данные → правила → артикул» для страницы архитектуры/лендинга */
export function PipelineScene({ className = "" }: { className?: string }) {
  const nodes = [
    { x: 70, t: "Справочник", s: "JSON в сборке" },
    { x: 250, t: "Правила", s: "9 проверок" },
    { x: 430, t: "Подбор", s: "мин. корпус" },
    { x: 610, t: "Артикул", s: "9 позиций" },
  ];
  return (
    <svg viewBox="0 0 680 130" role="img" aria-label="Порядок расчёта" className={className}>
      <path d="M70 62h540" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
      <path d="M70 62h540" stroke="#00aec0" strokeWidth="2.5" className="anim-dash" strokeLinecap="round" />
      {nodes.map((n, i) => (
        <g key={n.t}>
          <circle cx={n.x} cy="62" r="15" fill="#0b1a21" stroke="#00aec0" strokeWidth="2" />
          <text x={n.x} y="67" textAnchor="middle" fill="#00aec0" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
            {i + 1}
          </text>
          <text x={n.x} y="32" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="var(--font-sans)">
            {n.t}
          </text>
          <text x={n.x} y="100" textAnchor="middle" fill="#8fb4c0" fontSize="11" fontFamily="var(--font-sans)">
            {n.s}
          </text>
        </g>
      ))}
    </svg>
  );
}
