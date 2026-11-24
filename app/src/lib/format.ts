const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const nf = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

export const baht = (satang: number) => nf.format(satang / 100);
export const bahtShort = (satang: number) => (satang % 100 === 0 ? nf0.format(satang / 100) : nf.format(satang / 100));

/** Parses "1,234.5" into satang; null when not a positive number. */
export function parseBaht(input: string): number | null {
  const s = input.replace(/[,\s฿]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const v = Math.round(parseFloat(s) * 100);
  return v > 0 ? v : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local ISO without zone, the format stored in the DB. */
export const toLocalIso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const fromLocalIso = (s: string) => new Date(s);
export const dayKey = (iso: string) => iso.slice(0, 10);
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function thaiDate(iso: string, withYear = true) {
  const d = fromLocalIso(iso);
  const y = (d.getFullYear() + 543) % 100;
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}${withYear ? ' ' + pad(y) : ''}`;
}
export const thaiTime = (iso: string) => iso.slice(11, 16);
export const thaiMonthYear = (d: Date) => `${TH_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;

export function dayLabel(key: string, today = new Date()) {
  const t = toLocalIso(today).slice(0, 10);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (key === t) return 'วันนี้';
  if (key === toLocalIso(y).slice(0, 10)) return 'เมื่อวาน';
  return thaiDate(key + 'T00:00:00');
}
