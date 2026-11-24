import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { clearAll, exportCsv, getSetting, isBackup, makeBackup, restoreBackup, setSetting } from '../db/repo';
import { Confirm, TopBar, download, toast } from '../components/ui';
import { toLocalIso } from '../lib/format';

export function Settings() {
  const count = useLiveQuery(() => db.transactions.count(), []);
  const [myName, setMyName] = useState('');
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [askClear, setAskClear] = useState(false);
  const [pending, setPending] = useState<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSetting('myName', '').then(setMyName);
    getSetting<'system' | 'light' | 'dark'>('theme', 'system').then(setTheme);
  }, []);

  const stamp = toLocalIso(new Date()).slice(0, 10);

  return (
    <div>
      <TopBar title="ตั้งค่า" />
      <h2 className="section-title">ตัวฉัน</h2>
      <div className="card stack">
        <label className="field">ชื่อบัญชีของฉัน (ตามที่ขึ้นบนสลิป)
          <input className="input" value={myName} placeholder="เช่น สมชาย ใจดี" onChange={(e) => setMyName(e.target.value)}
            onBlur={() => { setSetting('myName', myName.trim()); toast('บันทึกชื่อแล้ว'); }} />
        </label>
        <div className="xs muted">ใช้แยกว่าสลิปไหนเป็นเงินเข้า (ผู้รับคือคุณ) หรือโอนระหว่างบัญชีตัวเอง ซึ่งจะไม่นับในยอดใช้จ่าย</div>
      </div>

      <h2 className="section-title">หน้าตา</h2>
      <div className="card">
        <label className="field">ธีม
          <select className="input" value={theme} onChange={(e) => {
            const v = e.target.value as typeof theme;
            setTheme(v); setSetting('theme', v);
            if (v === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
          }}>
            <option value="system">ตามเครื่อง</option><option value="light">สว่าง</option><option value="dark">มืด</option>
          </select>
        </label>
      </div>

      <h2 className="section-title">หมวดหมู่</h2>
      <ul className="settings-list">
        <li><a href="#/settings/categories"><span>จัดการหมวดหมู่และกฎจำผู้รับ</span><span aria-hidden>›</span></a></li>
      </ul>

      <h2 className="section-title">ข้อมูล ({count ?? 0} รายการ · เก็บในเครื่องนี้เท่านั้น)</h2>
      <ul className="settings-list">
        <li><button onClick={async () => download(`jodjai-${stamp}.csv`, await exportCsv(), 'text/csv;charset=utf-8')}><span>ส่งออกเป็น CSV (เปิดใน Excel ได้)</span><span aria-hidden>⬇</span></button></li>
        <li><button onClick={async () => download(`jodjai-backup-${stamp}.json`, JSON.stringify(await makeBackup()), 'application/json')}><span>สำรองข้อมูล (JSON)</span><span aria-hidden>⬇</span></button></li>
        <li><button onClick={() => fileRef.current?.click()}><span>กู้คืนจากไฟล์สำรอง</span><span aria-hidden>⬆</span></button></li>
        <li><button style={{ color: 'var(--danger)' }} onClick={() => setAskClear(true)}><span>ลบข้อมูลทั้งหมด</span><span aria-hidden>🗑</span></button></li>
      </ul>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" data-testid="restore-input" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          if (!isBackup(data)) throw new Error();
          setPending(data);
        } catch { toast('ไฟล์นี้ไม่ใช่ไฟล์สำรองของแอป'); }
      }} />
      <Confirm open={!!pending} title="กู้คืนข้อมูล?" body="ข้อมูลในเครื่องตอนนี้จะถูกแทนที่ด้วยข้อมูลจากไฟล์" confirmLabel="กู้คืน" danger
        onClose={() => setPending(null)} onConfirm={async () => {
          try { await restoreBackup(pending as never); toast('กู้คืนแล้ว'); getSetting('myName', '').then(setMyName); } catch { toast('กู้คืนไม่สำเร็จ'); }
        }} />
      <Confirm open={askClear} title="ลบข้อมูลทั้งหมด?" body="รายการ หมวดหมู่ และรูปสลิปทั้งหมดจะหายไป กู้คืนไม่ได้ถ้าไม่ได้สำรองไว้" confirmLabel="ลบทั้งหมด" danger
        onClose={() => setAskClear(false)} onConfirm={async () => { await clearAll(); setMyName(''); toast('ลบข้อมูลแล้ว'); }} />

      <p className="xs muted" style={{ marginTop: 'var(--s5)', textAlign: 'center' }}>จดใจ · แอปจดรายจ่ายจากสลิป ใช้ส่วนตัว</p>
    </div>
  );
}
