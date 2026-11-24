import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addTx, categories, saveRule } from '../db/repo';
import { baht, parseBaht } from '../lib/format';
import { newItem, processItem, warmUp, type ImportItem } from '../slip/pipeline';
import { Seg, TopBar, toast } from '../components/ui';
import { go } from '../router';

/** S03 pick slips + S04 review what was read, on one route. */
export function Import({ shared }: { shared: boolean }) {
  const cats = useLiveQuery(categories, []) ?? [];
  const [items, setItems] = useState<ImportItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [warming, setWarming] = useState(false);
  const [over, setOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialCat = useRef(new Map<string, number>());
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (key: string, p: Partial<ImportItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  async function start(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) { toast('เลือกได้เฉพาะไฟล์รูปภาพ'); return; }
    const fresh = imgs.map(newItem);
    setItems((xs) => [...xs, ...fresh]);
    setBusy(true);
    setWarming(true);
    try { await warmUp(); } catch { toast('โหลดตัวอ่านข้อความไม่สำเร็จ'); }
    setWarming(false);
    const seen = new Set<string>();
    for (const it of fresh) {
      patch(it.key, { status: 'reading' });
      const done = await processItem(it, seen);
      initialCat.current.set(it.key, done.categoryId);
      setItems((xs) => xs.map((x) => (x.key === it.key ? done : x)));
    }
    setBusy(false);
  }

  // Files shared to the PWA from another app (Web Share Target).
  useEffect(() => {
    if (!shared || !('caches' in window)) return;
    (async () => {
      const cache = await caches.open('share-target');
      const keys = await cache.keys();
      const files: File[] = [];
      for (const req of keys) {
        const res = await cache.match(req);
        if (res) files.push(new File([await res.blob()], decodeURIComponent(req.url.split('/').pop() ?? 'slip.jpg'), { type: res.headers.get('content-type') ?? 'image/jpeg' }));
        await cache.delete(req);
      }
      if (files.length) start(files);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared]);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = items.filter((i) => i.status === 'ready');
  const chosen = ready.filter((i) => i.include && parseBaht(i.amount) !== null);
  const total = chosen.filter((i) => i.type === 'expense').reduce((a, i) => a + (parseBaht(i.amount) ?? 0), 0);
  const doneCount = items.filter((i) => i.status !== 'queued' && i.status !== 'reading').length;

  async function saveAll() {
    setSaving(true);
    let n = 0;
    for (const it of chosen) {
      const d = it.draft!;
      const slipImageId = it.thumb ? await db.slipImages.add({ blob: it.thumb, createdAt: new Date().toISOString() }) : undefined;
      try {
        await addTx({
          type: it.type, amountSatang: parseBaht(it.amount)!, occurredAt: it.occurredAt.length === 16 ? it.occurredAt + ':00' : it.occurredAt,
          categoryId: it.categoryId, receiver: it.receiver.trim(), sender: it.sender.trim(), bank: d.bank?.code ?? '', note: it.note.trim(),
          source: 'slip', slipRef: d.transRef ?? undefined, imageHash: it.imageHash, slipImageId, confidence: d.confidence,
        });
        n++;
      } catch {
        if (slipImageId) await db.slipImages.delete(slipImageId);
      }
      const party = it.type === 'income' ? it.sender : it.receiver;
      if (party.trim() && initialCat.current.get(it.key) !== it.categoryId) await saveRule(party.trim(), it.categoryId);
    }
    setSaving(false);
    toast(`บันทึก ${n} รายการแล้ว`);
    go('/');
  }

  return (
    <div className="stack">
      <TopBar title="นำเข้าสลิป" />
      <label className={`drop ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); start([...e.dataTransfer.files]); }}>
        <div style={{ fontSize: 40 }} aria-hidden>🧾</div>
        <strong>เลือกรูปสลิปโอนเงิน</strong>
        <div className="small muted">เลือกได้หลายรูป · อ่านในเครื่องนี้ ไม่ส่งรูปออกไปไหน</div>
        <input ref={inputRef} className="sr-only" type="file" accept="image/*" multiple data-testid="file-input"
          onChange={(e) => { start([...(e.target.files ?? [])]); e.target.value = ''; }} />
      </label>

      {busy && (
        <div className="stack" style={{ gap: 'var(--s2)' }} aria-live="polite">
          <div className="small muted">{warming ? 'กำลังเตรียมตัวอ่านภาษาไทย (ครั้งแรกอาจใช้เวลาสักครู่)…' : `กำลังอ่าน ${doneCount}/${items.length}`}</div>
          <div className="progress"><div style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} /></div>
        </div>
      )}

      <ul className="list stack" aria-label="สลิปที่อ่านได้">
        {items.map((it) => (
          <li key={it.key} className="card review" data-testid="review-item" data-status={it.status}>
            <img src={it.previewUrl} alt={`สลิป ${it.file.name}`} />
            {it.status === 'queued' || it.status === 'reading' ? (
              <div className="stack" style={{ gap: 'var(--s2)' }}>
                <span className="small muted">{it.status === 'reading' ? 'กำลังอ่าน…' : 'รอคิว'}</span>
                <div className="skel" /><div className="skel" style={{ width: '60%' }} />
              </div>
            ) : it.status !== 'ready' ? (
              <div className="stack" style={{ gap: 'var(--s2)' }}>
                <span className={`badge ${it.status === 'duplicate' ? '' : 'badge-warn'}`}>{it.status === 'duplicate' ? 'ซ้ำ' : 'อ่านไม่สำเร็จ'}</span>
                <span className="small muted">{it.error}</span>
                <button className="btn btn-ghost" style={{ alignSelf: 'start', padding: 0 }} onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))}>เอาออก</button>
              </div>
            ) : (
              <div className="stack" style={{ gap: 'var(--s2)' }}>
                <label className="row small">
                  <input type="checkbox" checked={it.include} onChange={(e) => patch(it.key, { include: e.target.checked })} />
                  บันทึกรายการนี้
                  {it.draft!.confidence < 0.7 && <span className="badge badge-warn">ตรวจอีกครั้ง</span>}
                </label>
                {it.draft!.issues.length > 0 && <div className="xs" style={{ color: 'var(--warn)' }}>{it.draft!.issues.join(' · ')}</div>}
                <div className="fields">
                  <label className="field full">จำนวนเงิน
                    <input className="input num" inputMode="decimal" value={it.amount} data-testid="review-amount"
                      aria-invalid={it.include && parseBaht(it.amount) === null} onChange={(e) => patch(it.key, { amount: e.target.value })} />
                  </label>
                  <label className="field full">{it.type === 'income' ? 'ได้รับจาก' : 'จ่ายให้'}
                    <input className="input" value={it.type === 'income' ? it.sender : it.receiver} data-testid="review-party"
                      onChange={(e) => patch(it.key, it.type === 'income' ? { sender: e.target.value } : { receiver: e.target.value })} />
                  </label>
                  <label className="field full">วันเวลา
                    <input className="input" type="datetime-local" value={it.occurredAt} data-testid="review-date" onChange={(e) => patch(it.key, { occurredAt: e.target.value })} />
                  </label>
                  {it.type !== 'transfer' && (
                    <label className="field full">หมวดหมู่
                      <select className="input" value={it.categoryId} onChange={(e) => patch(it.key, { categoryId: +e.target.value })}>
                        {cats.filter((c) => c.type === (it.type === 'income' ? 'income' : 'expense')).map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                      </select>
                    </label>
                  )}
                  <div className="full">
                    <Seg label="ประเภท" value={it.type} onChange={(type) => {
                      const ct = type === 'income' ? 'income' : 'expense';
                      const cur = cats.find((c) => c.id === it.categoryId);
                      patch(it.key, { type, categoryId: cur?.type === ct ? it.categoryId : cats.find((c) => c.type === ct)?.id ?? it.categoryId });
                    }} options={[{ value: 'expense', label: 'จ่าย' }, { value: 'income', label: 'รับ' }, { value: 'transfer', label: 'โอนตัวเอง' }]} />
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {ready.length > 0 && (
        <div className="card stack" style={{ position: 'sticky', bottom: 'calc(var(--nav-h) + var(--s3))' }}>
          <div className="row between small"><span>เลือก {chosen.length} รายการ</span><span className="num">รายจ่ายรวม ฿{baht(total)}</span></div>
          <button className="btn btn-primary btn-block" disabled={!chosen.length || busy || saving} onClick={saveAll} data-testid="save-all">
            {saving ? 'กำลังบันทึก…' : `บันทึก ${chosen.length} รายการ`}
          </button>
          <div className="xs muted">เปลี่ยนหมวดของผู้รับคนไหน ครั้งหน้าแอปจะจำให้</div>
        </div>
      )}
    </div>
  );
}
