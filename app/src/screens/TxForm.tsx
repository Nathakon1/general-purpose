import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TxType } from '../db/db';
import { addTx, categories, deleteTx, fallbackCategoryId, saveRule, updateTx } from '../db/repo';
import { parseBaht, toLocalIso } from '../lib/format';
import { bankByCode } from '../slip/banks';
import { CategoryPicker, Confirm, Seg, TopBar, toast } from '../components/ui';
import { back, go } from '../router';

/** S06 add by hand, and S05 view / edit / delete when an id is given. */
export function TxForm({ id }: { id?: number }) {
  const cats = useLiveQuery(categories, []) ?? [];
  const existing = useLiveQuery(() => (id ? db.transactions.get(id) : undefined), [id]);
  const slip = useLiveQuery(async () => (existing?.slipImageId ? db.slipImages.get(existing.slipImageId) : undefined), [existing?.slipImageId]);
  const [slipUrl, setSlipUrl] = useState<string>();

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [when, setWhen] = useState(toLocalIso(new Date()).slice(0, 16));
  const [party, setParty] = useState('');
  const [note, setNote] = useState('');
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!existing || loaded) return;
    setType(existing.type);
    setAmount((existing.amountSatang / 100).toFixed(2));
    setCategoryId(existing.categoryId);
    setWhen(existing.occurredAt.slice(0, 16));
    setParty(existing.type === 'income' ? existing.sender : existing.receiver);
    setNote(existing.note);
    setLoaded(true);
  }, [existing, loaded]);

  useEffect(() => {
    if (!slip) return;
    const u = URL.createObjectURL(slip.blob);
    setSlipUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [slip]);

  // Pick a sensible category when the type changes or categories load.
  useEffect(() => {
    if (!cats.length) return;
    const catType = type === 'income' ? 'income' : 'expense';
    const cur = cats.find((c) => c.id === categoryId);
    if (!cur || cur.type !== catType) {
      const first = cats.find((c) => c.type === catType);
      if (first) setCategoryId(first.id!);
    }
  }, [type, cats, categoryId]);

  if (id && existing === null) return <><TopBar title="ไม่พบรายการ" onBack /><p className="muted">รายการนี้อาจถูกลบไปแล้ว</p></>;
  if (id && !loaded) return <TopBar title="รายการ" onBack />;

  const satang = parseBaht(amount);
  const amountErr = touched && satang === null ? 'ใส่จำนวนเงินมากกว่า 0' : '';
  const future = new Date(when).getTime() > Date.now() + 60_000;
  const catOrFallback = async () => categoryId || (await fallbackCategoryId(type === 'income' ? 'income' : 'expense'));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (satang === null) return;
    const occurredAt = when.length === 16 ? when + ':00' : when;
    const cid = await catOrFallback();
    const parties = type === 'income' ? { sender: party.trim() } : { receiver: party.trim() };
    if (existing?.id) {
      await updateTx(existing.id, { type, amountSatang: satang, categoryId: cid, occurredAt, note: note.trim(), ...parties });
      if (remember && party.trim()) await saveRule(party.trim(), cid);
      toast('บันทึกการแก้ไขแล้ว');
      back();
    } else {
      await addTx({ type, amountSatang: satang, categoryId: cid, occurredAt, note: note.trim(), receiver: '', sender: '', bank: '', source: 'manual', confidence: 1, ...parties });
      if (remember && party.trim()) await saveRule(party.trim(), cid);
      toast('จดแล้ว');
      go('/');
    }
  }

  const bank = existing?.bank ? bankByCode(existing.bank) : undefined;

  return (
    <form className="stack" onSubmit={save} noValidate>
      <TopBar title={id ? 'รายละเอียด' : 'จดรายการ'} onBack />
      <Seg label="ประเภท" value={type} onChange={setType}
        options={[{ value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' }, ...(existing?.type === 'transfer' || type === 'transfer' ? [{ value: 'transfer' as TxType, label: 'โอนตัวเอง' }] : [])]} />

      <label className="field">จำนวนเงิน (บาท)
        <input className="input amount-input num" inputMode="decimal" autoFocus={!id} placeholder="0.00" value={amount}
          aria-invalid={!!amountErr} aria-describedby="amt-err" onChange={(e) => setAmount(e.target.value)} onBlur={() => setTouched(true)} />
        <span id="amt-err" className="err">{amountErr}</span>
      </label>

      {type !== 'transfer' && (
        <div>
          <div className="small muted" style={{ marginBottom: 'var(--s2)' }}>หมวดหมู่</div>
          <CategoryPicker cats={cats} value={categoryId} onChange={setCategoryId} type={type === 'income' ? 'income' : 'expense'} />
        </div>
      )}

      <label className="field">{type === 'income' ? 'ได้รับจาก' : 'จ่ายให้'}
        <input className="input" value={party} onChange={(e) => setParty(e.target.value)} placeholder={type === 'income' ? 'เช่น บริษัท / ชื่อคน' : 'เช่น ร้านข้าวมันไก่'} />
      </label>
      {party.trim() && type !== 'transfer' && (
        <label className="row small"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          ครั้งหน้าใช้หมวดนี้กับ “{party.trim()}” อัตโนมัติ</label>
      )}

      <label className="field">วันและเวลา
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        {future && <span className="small" style={{ color: 'var(--warn)' }}>วันที่อยู่ในอนาคต</span>}
      </label>

      <label className="field">โน้ต
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {existing?.source === 'slip' && (
        <div className="card stack small">
          <strong>จากสลิป</strong>
          <div className="muted">
            {existing.sender && <>ผู้โอน: {existing.sender}<br /></>}
            {existing.receiver && <>ผู้รับ: {existing.receiver}<br /></>}
            {bank && <>ธนาคาร: {bank.nameTh}<br /></>}
            {existing.slipRef && <>เลขอ้างอิง: <span className="num">{existing.slipRef}</span></>}
          </div>
          {slipUrl && <img src={slipUrl} alt="สลิปต้นฉบับ" style={{ maxWidth: '100%', borderRadius: 'var(--r-input)' }} />}
        </div>
      )}

      <button className="btn btn-primary btn-block" type="submit">บันทึก</button>
      {existing?.id && (
        <>
          <button type="button" className="btn btn-danger btn-block" onClick={() => setAskDelete(true)}>ลบรายการ</button>
          <Confirm open={askDelete} title="ลบรายการนี้?" body="ลบแล้วกู้คืนไม่ได้ รูปสลิปจะถูกลบด้วย" confirmLabel="ลบ" danger
            onClose={() => setAskDelete(false)} onConfirm={async () => { await deleteTx(existing.id!); toast('ลบแล้ว'); go('/'); }} />
        </>
      )}
    </form>
  );
}
