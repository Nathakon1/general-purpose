import { useState } from 'react';
import { setSetting } from '../db/repo';

const STEPS = [
  { art: '🧾', title: 'จดรายจ่ายจากสลิป', body: 'โอนเงินเสร็จ เลือกรูปสลิปมาที่แอป ระบบจะอ่านยอดเงิน วันเวลา และชื่อผู้รับให้' },
  { art: '🔒', title: 'ข้อมูลอยู่ในเครื่องคุณ', body: 'อ่านสลิปในเครื่องนี้ทั้งหมด ไม่ต้องสมัคร ไม่ส่งรูปขึ้นเซิร์ฟเวอร์ ใช้แบบออฟไลน์ได้' },
  { art: '📊', title: 'รู้ว่าเงินไปไหน', body: 'ดูยอดใช้วันนี้ เดือนนี้ และแยกตามหมวด แก้หมวดครั้งเดียว แอปจำให้ครั้งต่อไป' },
];

/** S01 first run. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [name, setName] = useState('');
  const last = i === STEPS.length;
  const finish = async () => { if (name.trim()) await setSetting('myName', name.trim()); await setSetting('onboarded', true); onDone(); };
  return (
    <main className="onb">
      {!last ? (
        <>
          <div className="art" aria-hidden>{STEPS[i].art}</div>
          <h1>{STEPS[i].title}</h1>
          <p>{STEPS[i].body}</p>
        </>
      ) : (
        <>
          <div className="art" aria-hidden>👋</div>
          <h1>ชื่อบัญชีของคุณ</h1>
          <p>ใส่ชื่อตามที่ขึ้นบนสลิป เพื่อแยกเงินเข้ากับเงินออก (ข้ามได้ ตั้งทีหลังได้)</p>
          <input className="input" aria-label="ชื่อบัญชีของคุณ" placeholder="เช่น สมชาย ใจดี" value={name} onChange={(e) => setName(e.target.value)} />
        </>
      )}
      <div className="dots" aria-label={`ขั้นที่ ${i + 1} จาก ${STEPS.length + 1}`}>
        {[...STEPS, null].map((_, k) => <span key={k} aria-current={k === i ? 'step' : undefined} />)}
      </div>
      <div className="row">
        <button className="btn btn-ghost" onClick={finish}>ข้าม</button>
        <button className="btn btn-primary grow" onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'เริ่มใช้งาน' : 'ถัดไป'}</button>
      </div>
    </main>
  );
}
