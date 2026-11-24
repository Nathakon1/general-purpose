import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Category, Transaction } from '../db/db';
import { baht, thaiTime } from '../lib/format';
import { back } from '../router';

export function TopBar({ title, onBack, right }: { title: string; onBack?: boolean | (() => void); right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack && (
        <button className="back" aria-label="กลับ" onClick={() => (typeof onBack === 'function' ? onBack() : back())}>←</button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

const NAV = [
  { href: '/', label: 'หน้าหลัก', ico: '🏠' },
  { href: '/import', label: 'นำเข้าสลิป', ico: '🧾' },
  { href: '/summary', label: 'สรุป', ico: '📊' },
  { href: '/settings', label: 'ตั้งค่า', ico: '⚙️' },
];

export function BottomNav({ path }: { path: string }) {
  const active = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <nav className="nav" aria-label="เมนูหลัก">
      <div className="nav-inner">
        {NAV.map((n) => (
          <a key={n.href} href={'#' + n.href} aria-current={active(n.href) ? 'page' : undefined}>
            <span className="ico" aria-hidden>{n.ico}</span>
            {n.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function TxRow({ tx, cat }: { tx: Transaction; cat?: Category }) {
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const title = tx.type === 'income' ? tx.sender || tx.receiver : tx.receiver || tx.note || cat?.name || 'รายการ';
  return (
    <a className="tx" href={`#/t/${tx.id}`} data-testid="tx-row">
      <span className="tx-ico" style={{ background: (cat?.color ?? '#7A8790') + '26' }} aria-hidden>{cat?.emoji ?? '📦'}</span>
      <span className="grow">
        <span className="ellipsis" style={{ display: 'block', fontWeight: 600 }}>{title}</span>
        <span className="xs muted">
          {cat?.name ?? '—'} · {thaiTime(tx.occurredAt)}
          {tx.source === 'slip' && ' · สลิป'}
          {tx.type === 'transfer' && ' · โอนเข้าบัญชีตัวเอง'}
        </span>
      </span>
      <span className={`tx-amt num ${tx.type === 'transfer' ? 'muted' : tx.type}`}>{sign}{baht(tx.amountSatang)}</span>
    </a>
  );
}

export function CategoryPicker({ cats, value, onChange, type }: { cats: Category[]; value: number; onChange: (id: number) => void; type: 'expense' | 'income' }) {
  return (
    <div className="cat-grid" role="group" aria-label="หมวดหมู่">
      {cats.filter((c) => c.type === type).map((c) => (
        <button type="button" key={c.id} className="cat" aria-pressed={c.id === value} onClick={() => onChange(c.id!)}>
          <span className="e" aria-hidden>{c.emoji}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }: {
  open: boolean; title: string; body?: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="dlg-title">
      <div className="stack">
        <h2 id="dlg-title" style={{ fontSize: 'var(--fs-lg)' }}>{title}</h2>
        {body && <div className="muted">{body}</div>}
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

let toastSet: ((s: string | null) => void) | null = null;
export const toast = (msg: string) => toastSet?.(msg);
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { toastSet = setMsg; return () => { toastSet = null; }; }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2600); return () => clearTimeout(t); }, [msg]);
  return msg ? <div className="toast" role="status">{msg}</div> : <div role="status" className="sr-only" />;
}

export function Empty({ art, title, children }: { art: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="art" aria-hidden>{art}</div>
      <p style={{ fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px' }}>{title}</p>
      {children}
    </div>
  );
}

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
