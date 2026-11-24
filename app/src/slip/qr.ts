// Parses the verification QR printed on Thai bank transfer slips.
// It is EMV-style TLV: 2-digit tag, 2-digit length, value. Tag 00 holds
// sub-fields: 00 = API id ("000001"), 01 = sending bank code, 02 = transaction
// reference. Tag 51 = country ("TH"), tag 91 = CRC. It carries no amount.

export interface SlipQr {
  bankCode: string;
  transRef: string;
  raw: string;
}

export function parseTlv(s: string): Map<string, string> | null {
  const out = new Map<string, string>();
  let i = 0;
  while (i < s.length) {
    if (i + 4 > s.length) return null;
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len)) return null;
    const value = s.slice(i + 4, i + 4 + len);
    if (value.length !== len) return null;
    out.set(tag, value);
    i += 4 + len;
  }
  return out;
}

export function parseSlipQr(raw: string): SlipQr | null {
  const text = raw.trim();
  const top = parseTlv(text);
  if (!top) return null;
  const payload = top.get('00');
  if (!payload) return null;
  const sub = parseTlv(payload);
  if (!sub) return null;
  if (sub.get('00') !== '000001') return null;
  const bankCode = sub.get('01');
  const transRef = sub.get('02');
  if (!bankCode || !/^\d{3}$/.test(bankCode) || !transRef) return null;
  const country = top.get('51');
  if (country && country !== 'TH') return null;
  return { bankCode, transRef, raw: text };
}

/** Builds a slip QR payload, used by tests and fixtures. CRC is not checked by the parser. */
export function buildSlipQr(bankCode: string, transRef: string): string {
  const f = (tag: string, v: string) => tag + String(v.length).padStart(2, '0') + v;
  const sub = f('00', '000001') + f('01', bankCode) + f('02', transRef);
  return f('00', sub) + f('51', 'TH') + f('91', '0000');
}
