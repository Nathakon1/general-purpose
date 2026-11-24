// Thai banks by their standard 3-digit bank code, with names and keywords
// that appear on transfer slips (Thai and English, lower-cased for matching).
export interface Bank {
  code: string;
  short: string;
  nameTh: string;
  keywords: string[];
}

export const BANKS: Bank[] = [
  { code: '002', short: 'BBL', nameTh: 'กรุงเทพ', keywords: ['กรุงเทพ', 'bangkok bank', 'bualuang', 'บัวหลวง'] },
  { code: '004', short: 'KBANK', nameTh: 'กสิกรไทย', keywords: ['กสิกร', 'kasikorn', 'kbank', 'k plus', 'k+'] },
  { code: '006', short: 'KTB', nameTh: 'กรุงไทย', keywords: ['กรุงไทย', 'krungthai', 'krung thai', 'ktb'] },
  { code: '011', short: 'TTB', nameTh: 'ทหารไทยธนชาต', keywords: ['ทหารไทยธนชาต', 'ทีทีบี', 'ttb', 'tmbthanachart'] },
  { code: '014', short: 'SCB', nameTh: 'ไทยพาณิชย์', keywords: ['ไทยพาณิชย์', 'scb', 'siam commercial'] },
  { code: '022', short: 'CIMBT', nameTh: 'ซีไอเอ็มบี ไทย', keywords: ['ซีไอเอ็มบี', 'cimb'] },
  { code: '024', short: 'UOB', nameTh: 'ยูโอบี', keywords: ['ยูโอบี', 'uob'] },
  { code: '025', short: 'BAY', nameTh: 'กรุงศรีอยุธยา', keywords: ['กรุงศรี', 'krungsri', 'ayudhya'] },
  { code: '030', short: 'GSB', nameTh: 'ออมสิน', keywords: ['ออมสิน', 'gsb', 'mymo'] },
  { code: '033', short: 'GHB', nameTh: 'อาคารสงเคราะห์', keywords: ['อาคารสงเคราะห์', 'ghb', 'ธอส'] },
  { code: '034', short: 'BAAC', nameTh: 'ธ.ก.ส.', keywords: ['ธ.ก.ส', 'ธกส', 'baac', 'เพื่อการเกษตร'] },
  { code: '066', short: 'ISBT', nameTh: 'อิสลามแห่งประเทศไทย', keywords: ['อิสลาม', 'ibank', 'islamic bank'] },
  { code: '067', short: 'TISCO', nameTh: 'ทิสโก้', keywords: ['ทิสโก้', 'tisco'] },
  { code: '069', short: 'KKP', nameTh: 'เกียรตินาคินภัทร', keywords: ['เกียรตินาคิน', 'kkp', 'kiatnakin'] },
  { code: '070', short: 'ICBCT', nameTh: 'ไอซีบีซี (ไทย)', keywords: ['ไอซีบีซี', 'icbc'] },
  { code: '073', short: 'LHB', nameTh: 'แลนด์ แอนด์ เฮ้าส์', keywords: ['แลนด์ แอนด์ เฮ้าส์', 'แลนด์แอนด์เฮ้าส์', 'lh bank', 'land and houses'] },
];

export const bankByCode = (code?: string) => BANKS.find((b) => b.code === code);

/** Banks mentioned in the text, in the order they first appear. */
export function banksInText(text: string): Bank[] {
  const lower = text.toLowerCase();
  const hits: { bank: Bank; at: number }[] = [];
  for (const bank of BANKS) {
    let best = -1;
    for (const k of bank.keywords) {
      const i = lower.indexOf(k);
      if (i >= 0 && (best < 0 || i < best)) best = i;
    }
    if (best >= 0) hits.push({ bank, at: best });
  }
  // "กรุงเทพ" also appears inside other words rarely; keep simple ordering.
  return hits.sort((a, b) => a.at - b.at).map((h) => h.bank);
}
