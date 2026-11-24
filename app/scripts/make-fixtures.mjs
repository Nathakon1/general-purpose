// Renders synthetic transfer slips (our own made-up layouts, fake names) for tests.
import { chromium } from 'playwright';
import QRCode from 'qrcode';

const f = (tag, v) => tag + String(v.length).padStart(2, '0') + v;
const slipQr = (bank, ref) => f('00', f('00', '000001') + f('01', bank) + f('02', ref)) + f('51', 'TH') + f('91', '0000');

const slips = [
  { file: 'slip-a.png', bank: '004', ref: '015326143259TST00001', accent: '#2E7D32', lines: [
    ['h', 'โอนเงินสำเร็จ'], ['s', '19 พ.ย. 68 14:32 น.'], ['n', 'นาย สมชาย ใจดี'], ['s', 'ธ.กสิกรไทย xxx-x-x1234-x'],
    ['d', '↓'], ['n', 'นางสาว มะลิ หอมหวาน'], ['s', 'ธ.ไทยพาณิชย์ xxx-x-x5678-x'],
    ['s', 'เลขที่รายการ: 015326143259TST00001'], ['a', 'จำนวน: 150.00 บาท'], ['s', 'ค่าธรรมเนียม: 0.00 บาท'] ] },
  { file: 'slip-b.png', bank: '014', ref: '2025112098765TST0002', accent: '#5B2C83', lines: [
    ['h', 'ชำระเงินสำเร็จ'], ['s', '20 พ.ย. 2568 - 08:15'], ['s', 'จาก'], ['n', 'นาย สมชาย ใจดี'], ['s', 'ไปยัง'], ['n', 'ร้านกาแฟบ้านสวน'],
    ['a', 'จำนวนเงิน 1,250.50'], ['s', 'รหัสอ้างอิง 2025112098765TST0002'] ] },
  { file: 'slip-c.png', bank: '006', ref: 'KTB20251121TST000003', accent: '#1565C0', lines: [
    ['h', 'Transfer Successful'], ['s', '21 Nov 2025, 19:05'], ['s', 'From'], ['n', 'MR SOMCHAI JAIDEE'], ['s', 'To'], ['n', 'MS MALI HOMWAN'],
    ['a', 'Amount 89.00 THB'], ['s', 'Fee 0.00 THB'] ] },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 760 } });
for (const s of slips) {
  const qr = await QRCode.toDataURL(slipQr(s.bank, s.ref), { margin: 1, width: 150 });
  const rows = s.lines.map(([k, t]) => `<div class="${k}">${t}</div>`).join('');
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;font-family:Loma,sans-serif;background:#fff;color:#222}
    .slip{width:420px;padding:28px 32px}
    .bar{height:10px;background:${s.accent};margin:-28px -32px 20px}
    .h{font-size:28px;font-weight:bold;color:${s.accent};margin-bottom:6px}
    .s{font-size:19px;color:#444;margin:6px 0}
    .n{font-size:23px;font-weight:bold;margin:8px 0 2px}
    .d{font-size:20px;color:#999}
    .a{font-size:26px;font-weight:bold;margin:16px 0 4px}
    img{display:block;margin:18px auto 0}
  </style><div class="slip"><div class="bar"></div>${rows}<img src="${qr}"></div>`);
  const el = await page.$('.slip');
  await el.screenshot({ path: `e2e/fixtures/${s.file}` });
}
// a non-slip image
await page.setContent('<div style="width:300px;height:300px;background:linear-gradient(#8ac,#fc8);display:grid;place-items:center;font:40px sans-serif">🌅</div>');
await (await page.$('div')).screenshot({ path: 'e2e/fixtures/not-a-slip.png' });
await browser.close();
console.log('fixtures written');
