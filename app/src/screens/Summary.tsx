import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { byCategory, byDay, categories, monthRange, totals } from '../db/repo';
import { baht, dayKey, dayLabel, thaiMonthYear } from '../lib/format';
import { DayBars, Donut } from '../components/charts';
import { Empty, Seg, TopBar, TxRow } from '../components/ui';

/** S07 month summary: totals, donut by category, daily bars, drill into a category. */
export function Summary() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [focus, setFocus] = useState<number | null>(null);
  const [from, to] = monthRange(ym.y, ym.m);
  const txs = useLiveQuery(() => db.transactions.where('occurredAt').between(from, to, true, false).reverse().toArray(), [from, to]);
  const cats = useLiveQuery(categories, []) ?? [];
  const catMap = new Map(cats.map((c) => [c.id!, c]));

  const shift = (d: number) => { setFocus(null); setYm(({ y, m }) => { const t = new Date(y, m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; }); };
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth();
  const list = txs ?? [];
  const t = totals(list);
  const groups = byCategory(list, kind);
  const sum = kind === 'expense' ? t.expense : t.income;
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const perDay = byDay(list, kind);
  const dayVals = Array.from({ length: daysIn }, (_, i) => perDay.get(`${ym.y}-${String(ym.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`) ?? 0);
  const elapsed = isCurrent ? now.getDate() : daysIn;
  const focused = focus !== null ? list.filter((x) => x.categoryId === focus && x.type === kind) : [];

  return (
    <div className="stack">
      <TopBar title="สรุป" />
      <div className="month">
        <button onClick={() => shift(-1)} aria-label="เดือนก่อน">‹</button>
        <strong data-testid="month-label">{thaiMonthYear(new Date(ym.y, ym.m, 1))}</strong>
        <button onClick={() => shift(1)} aria-label="เดือนถัดไป" disabled={isCurrent}>›</button>
      </div>
      <div className="row" style={{ gap: 'var(--s2)' }}>
        <div className="card grow"><div className="xs muted">รายจ่าย</div><strong className="num expense" data-testid="sum-expense">฿{baht(t.expense)}</strong></div>
        <div className="card grow"><div className="xs muted">รายรับ</div><strong className="num income">฿{baht(t.income)}</strong></div>
        <div className="card grow"><div className="xs muted">คงเหลือ</div><strong className="num">฿{baht(t.income - t.expense)}</strong></div>
      </div>
      <Seg label="ดูแบบ" value={kind} onChange={(k) => { setKind(k); setFocus(null); }} options={[{ value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' }]} />

      {txs !== undefined && groups.length === 0 ? (
        <Empty art="📭" title={kind === 'expense' ? 'เดือนนี้ยังไม่มีรายจ่าย' : 'เดือนนี้ยังไม่มีรายรับ'} />
      ) : (
        <>
          <div className="card">
            <Donut caption={kind === 'expense' ? 'ใช้ไป' : 'ได้รับ'} total={sum}
              slices={groups.map((g) => ({ label: catMap.get(g.categoryId)?.name ?? '—', value: g.satang, color: catMap.get(g.categoryId)?.color ?? '#7A8790' }))} />
            <div role="list">
              {groups.map((g) => {
                const c = catMap.get(g.categoryId);
                const pct = sum ? Math.round((g.satang / sum) * 100) : 0;
                return (
                  <button key={g.categoryId} role="listitem" className="legend-row" aria-expanded={focus === g.categoryId}
                    onClick={() => setFocus(focus === g.categoryId ? null : g.categoryId)}>
                    <span className="dot" style={{ background: c?.color }} />
                    <span className="grow">
                      <span className="row between"><span>{c?.emoji} {c?.name ?? '—'}</span><span className="num">฿{baht(g.satang)}</span></span>
                      <span className="bar-track"><div style={{ width: pct + '%', background: c?.color }} /></span>
                    </span>
                    <span className="xs muted num" style={{ width: 36, textAlign: 'right' }}>{pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
          {focus !== null && (
            <section aria-label="รายการในหมวด">
              <h2 className="section-title">{catMap.get(focus)?.name} · {focused.length} รายการ</h2>
              <ul className="list">{focused.map((x) => <li key={x.id}><div className="xs muted">{dayLabel(dayKey(x.occurredAt), now)}</div><TxRow tx={x} cat={catMap.get(x.categoryId)} /></li>)}</ul>
            </section>
          )}
          <div className="card">
            <div className="row between small"><strong>{kind === 'expense' ? 'รายจ่ายรายวัน' : 'รายรับรายวัน'}</strong>
              <span className="muted">เฉลี่ย ฿{baht(Math.round(sum / Math.max(1, elapsed)))}/วัน</span></div>
            <DayBars days={daysIn} values={dayVals} color={kind === 'expense' ? 'var(--expense)' : 'var(--income)'} />
          </div>
        </>
      )}
    </div>
  );
}
