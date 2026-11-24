import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category } from '../db/db';
import { categories, deleteCategory } from '../db/repo';
import { Confirm, Seg, TopBar, toast } from '../components/ui';

const COLORS = ['#E0712C', '#B5651D', '#2F7DD1', '#C23A7A', '#6B5BD2', '#1E9E8A', '#D4A017', '#8C6D46', '#7A8790', '#1F7A3A'];

/** S08 categories + receiver rules. */
export function Categories() {
  const cats = useLiveQuery(categories, []) ?? [];
  const rules = useLiveQuery(() => db.rules.toArray(), []) ?? [];
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [edit, setEdit] = useState<Category | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const catMap = new Map(cats.map((c) => [c.id!, c]));

  async function save() {
    if (!edit) return;
    const name = edit.name.trim();
    if (!name) { toast('ใส่ชื่อหมวด'); return; }
    if (edit.id) await db.categories.update(edit.id, { name, emoji: edit.emoji || '📦', color: edit.color });
    else await db.categories.add({ ...edit, name, emoji: edit.emoji || '📦', sortOrder: Math.max(0, ...cats.filter((c) => c.type === type && c.sortOrder < 99 + (type === 'income' ? 100 : 0)).map((c) => c.sortOrder)) + 1 });
    setEdit(null);
    toast('บันทึกหมวดแล้ว');
  }

  return (
    <div className="stack">
      <TopBar title="หมวดหมู่" onBack />
      <Seg label="ประเภทหมวด" value={type} onChange={setType} options={[{ value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' }]} />
      <ul className="settings-list">
        {cats.filter((c) => c.type === type).map((c) => (
          <li key={c.id}>
            <button onClick={() => setEdit({ ...c })}>
              <span className="row"><span className="dot" style={{ background: c.color }} /> {c.emoji} {c.name}</span><span aria-hidden>✎</span>
            </button>
          </li>
        ))}
      </ul>
      <button className="btn btn-secondary" onClick={() => setEdit({ name: '', emoji: '', color: COLORS[cats.length % COLORS.length], type, sortOrder: 0 })}>＋ เพิ่มหมวด</button>

      {edit && (
        <div className="card stack" aria-label="แก้ไขหมวด">
          <div className="row">
            <label className="field" style={{ width: 80 }}>ไอคอน<input className="input" value={edit.emoji} maxLength={4} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} placeholder="📦" /></label>
            <label className="field grow">ชื่อ<input className="input" value={edit.name} autoFocus onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
          </div>
          <div className="row" role="group" aria-label="สี" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={`สี ${c}`} aria-pressed={edit.color === c} onClick={() => setEdit({ ...edit, color: c })}
                style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: edit.color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
          <div className="row">
            <button className="btn btn-primary grow" onClick={save}>บันทึก</button>
            <button className="btn btn-secondary" onClick={() => setEdit(null)}>ยกเลิก</button>
            {edit.id && <button className="btn btn-danger" onClick={() => { setDel(edit); setEdit(null); }}>ลบ</button>}
          </div>
        </div>
      )}

      <h2 className="section-title">ผู้รับที่แอปจำหมวดไว้ ({rules.length})</h2>
      {rules.length === 0 ? <p className="small muted" style={{ margin: 0 }}>เปลี่ยนหมวดตอนตรวจสลิป แล้วแอปจะจำไว้ใช้ครั้งหน้า</p> : (
        <ul className="settings-list">
          {rules.map((r) => (
            <li key={r.id}><button onClick={async () => { await db.rules.delete(r.id!); toast('ลืมกฎนี้แล้ว'); }}>
              <span className="ellipsis">{r.match} → {catMap.get(r.categoryId)?.emoji} {catMap.get(r.categoryId)?.name}</span><span className="xs muted">ลบ</span>
            </button></li>
          ))}
        </ul>
      )}
      <Confirm open={!!del} title={`ลบหมวด “${del?.name}”?`} body="รายการในหมวดนี้จะย้ายไปอยู่ในหมวดอื่นๆ" confirmLabel="ลบ" danger
        onClose={() => setDel(null)} onConfirm={async () => { try { await deleteCategory(del!.id!); toast('ลบหมวดแล้ว'); } catch (e) { toast((e as Error).message); } }} />
    </div>
  );
}
