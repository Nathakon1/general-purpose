// Finds the transaction date and time in slip text. Handles Thai month names
// (abbreviated and full), English months, numeric dates, and Buddhist-era years
// in 2 or 4 digits.

const TH_MONTHS: [RegExp, number][] = [
  [/ม\.?\s?ค\.?|มกราคม/, 1],
  [/ก\.?\s?พ\.?|กุมภาพันธ์/, 2],
  [/มี\.?\s?ค\.?|มีนาคม/, 3],
  [/เม\.?\s?ย\.?|เมษายน/, 4],
  [/พ\.?\s?ค\.?|พฤษภาคม/, 5],
  [/มิ\.?\s?ย\.?|มิถุนายน/, 6],
  [/ก\.?\s?ค\.?|กรกฎาคม/, 7],
  [/ส\.?\s?ค\.?|สิงหาคม/, 8],
  [/ก\.?\s?ย\.?|กันยายน/, 9],
  [/ต\.?\s?ค\.?|ตุลาคม/, 10],
  [/พ\.?\s?ย\.?|พฤศจิกายน/, 11],
  [/ธ\.?\s?ค\.?|ธันวาคม/, 12],
];
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Full names first so "มีนาคม" is not read as "ม.ค.".
const TH_MONTH_ALT =
  'มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|' +
  'มี\\.?\\s?ค\\.?|เม\\.?\\s?ย\\.?|มิ\\.?\\s?ย\\.?|ม\\.\\s?ค\\.?|ก\\.\\s?พ\\.?|พ\\.\\s?ค\\.?|ก\\.\\s?ค\\.?|ส\\.\\s?ค\\.?|ก\\.\\s?ย\\.?|ต\\.\\s?ค\\.?|พ\\.\\s?ย\\.?|ธ\\.\\s?ค\\.?';

export function thaiMonth(token: string): number | null {
  const t = token.replace(/\s/g, '');
  // exact-ish match on the normalised token
  for (const [re, m] of TH_MONTHS) {
    const full = new RegExp('^(?:' + re.source + ')$');
    if (full.test(t)) return m;
  }
  return null;
}

/** Converts a printed year to CE. 2-digit years are Buddhist era (68 -> 2025). */
export function toCE(year: number, now = new Date()): number {
  if (year >= 2400) return year - 543;
  if (year >= 1900) return year;
  // 2-digit: Thai slips use BE short years.
  const be = 2500 + year;
  const ce = be - 543;
  // Guard: if that lands far in the future, it was probably CE short year.
  if (ce > now.getFullYear() + 1) return 2000 + year;
  return ce;
}

export interface FoundDate {
  date: Date;
  hasTime: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function findDateTime(text: string, now = new Date()): FoundDate | null {
  const t = text.replace(/​/g, '');
  let y = 0, mo = 0, d = 0;

  const thRe = new RegExp('(\\d{1,2})\\s*(' + TH_MONTH_ALT + ')\\s*(\\d{4}|\\d{2})(?!\\d)');
  const enRe = /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{4}|\d{2})(?!\d)/i;
  const numRe = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/;

  let m = thRe.exec(t);
  if (m) {
    d = +m[1];
    mo = thaiMonth(m[2]) ?? 0;
    y = toCE(+m[3], now);
  } else if ((m = enRe.exec(t))) {
    d = +m[1];
    mo = EN_MONTHS.indexOf(m[2].toLowerCase()) + 1;
    y = toCE(+m[3], now);
  } else if ((m = numRe.exec(t))) {
    d = +m[1];
    mo = +m[2];
    y = toCE(+m[3], now);
  }
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const tm = /(?<!\d)([01]?\d|2[0-3])[:.]([0-5]\d)(?:[:.]([0-5]\d))?(?!\d)/.exec(t.slice((m?.index ?? 0)));
  const hh = tm ? +tm[1] : 0, mi = tm ? +tm[2] : 0, ss = tm && tm[3] ? +tm[3] : 0;
  const date = new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(hh)}:${pad(mi)}:${pad(ss)}`);
  if (isNaN(date.getTime())) return null;
  return { date, hasTime: !!tm };
}
