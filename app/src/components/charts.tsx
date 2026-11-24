import { baht, bahtShort } from '../lib/format';

export interface Slice { label: string; value: number; color: string }

/** Donut with a centre total. Segments separated by a surface-coloured gap. */
export function Donut({ slices, total, caption }: { slices: Slice[]; total: number; caption: string }) {
  const r = 70, c = 2 * Math.PI * r;
  let off = 0;
  const sum = slices.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <figure style={{ margin: 0, display: 'grid', placeItems: 'center' }}>
      <svg viewBox="0 0 180 180" width="200" height="200" role="img" aria-label={`${caption} ${baht(total)} บาท`}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="22" />
        {slices.map((s) => {
          const len = (s.value / sum) * c;
          const el = (
            <circle key={s.label} cx="90" cy="90" r={r} fill="none" stroke={s.color} strokeWidth="22"
              strokeDasharray={`${Math.max(0, len - (slices.length > 1 ? 2 : 0))} ${c}`} strokeDashoffset={-off}
              transform="rotate(-90 90 90)"><title>{`${s.label} ${baht(s.value)} บาท`}</title></circle>
          );
          off += len;
          return el;
        })}
        <text x="90" y="84" textAnchor="middle" fontSize="12" fill="var(--muted)">{caption}</text>
        <text x="90" y="106" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">฿{bahtShort(total)}</text>
      </svg>
    </figure>
  );
}

/** One bar per day of the month. */
export function DayBars({ days, values, color }: { days: number; values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const w = 320, h = 110, gap = 2, bw = (w - gap * (days - 1)) / days;
  return (
    <svg viewBox={`0 0 ${w} ${h + 16}`} width="100%" role="img" aria-label="รายจ่ายรายวัน">
      {values.map((v, i) => {
        const bh = v ? Math.max(2, (v / max) * h) : 0;
        return (
          <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx="2" fill={color}>
            <title>{`วันที่ ${i + 1}: ${baht(v)} บาท`}</title>
          </rect>
        );
      })}
      <line x1="0" x2={w} y1={h + 0.5} y2={h + 0.5} stroke="var(--border)" />
      {[1, 10, 20, days].map((d) => (
        <text key={d} x={(d - 1) * (bw + gap) + bw / 2} y={h + 13} fontSize="9" textAnchor="middle" fill="var(--muted)">{d}</text>
      ))}
    </svg>
  );
}
