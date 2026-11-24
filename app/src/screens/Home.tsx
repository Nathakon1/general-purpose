import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { categories, monthRange, totals } from '../db/repo';
import { baht, dayKey, dayLabel, toLocalIso } from '../lib/format';
import { Empty, TxRow } from '../components/ui';

export function Home() {
  const now = new Date();
  const [from, to] = monthRange(now.getFullYear(), now.getMonth());
  const month = useLiveQuery(() => db.transactions.where('occurredAt').between(from, to, true, false).toArray(), [from, to]);
  const recent = useLiveQuery(() => db.transactions.orderBy('occurredAt').reverse().limit(40).toArray(), []);
  const cats = useLiveQuery(categories, []);
  const catMap = new Map((cats ?? []).map((c) => [c.id!, c]));

  const todayKey = toLocalIso(now).slice(0, 10);
  const today = totals((month ?? []).filter((t) => dayKey(t.occurredAt) === todayKey));
  const m = totals(month ?? []);

  const groups = new Map<string, typeof recent>();
  for (const t of recent ?? []) {
    const k = dayKey(t.occurredAt);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }

  return (
    <div className="stack" style={{ paddingTop: 'var(--s4)' }}>
      <section className="hero" aria-label="สรุปวันนี้">
        <div className="sub">ใช้ไปวันนี้</div>
        <div className="big num" data-testid="today-expense">฿{baht(today.expense)}</div>
        <div className="hero-grid">
          <div><div className="sub">ใช้ไปเดือนนี้</div><strong className="num" data-testid="month-expense">฿{baht(m.expense)}</strong></div>
          <div><div className="sub">รายรับเดือนนี้</div><strong className="num">฿{baht(m.income)}</strong></div>
        </div>
      </section>

      <div className="row" style={{ gap: 'var(--s2)' }}>
        <a className="btn btn-primary grow" href="#/import">🧾 นำเข้าสลิป</a>
        <a className="btn btn-secondary grow" href="#/new">✏️ จดเอง</a>
      </div>

      <section aria-label="รายการล่าสุด">
        {recent === undefined ? (
          <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 56 }} />)}</div>
        ) : recent.length === 0 ? (
          <Empty art="🪙" title="ยังไม่มีรายการ">
            <p className="small" style={{ margin: 0 }}>โอนเงินเสร็จแล้วเลือกรูปสลิปมาที่นี่ แอปจะอ่านยอดให้เอง</p>
          </Empty>
        ) : (
          [...groups.entries()].map(([k, list]) => {
            const t = totals(list!);
            return (
              <div key={k}>
                <div className="day-head"><span>{dayLabel(k, now)}</span><span className="num">−{baht(t.expense)}</span></div>
                <ul className="list">{list!.map((tx) => <li key={tx.id}><TxRow tx={tx} cat={catMap.get(tx.categoryId)} /></li>)}</ul>
              </div>
            );
          })
        )}
      </section>
      <a className="fab" href="#/new" aria-label="เพิ่มรายการ">＋</a>
    </div>
  );
}
