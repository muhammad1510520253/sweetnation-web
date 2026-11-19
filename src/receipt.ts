import { rupiah, type Configuration, type Transaction, type TransactionItem } from './api';
import type { Settings } from './settings';

/** Lebar karakter kertas thermal: 58mm ≈ 32 kolom, 80mm ≈ 48 kolom. */
const COLS = { '58': 32, '80': 48 } as const;

const center = (text: string, w: number) => {
  const t = text.trim();
  if (t.length >= w) return t;
  const left = Math.floor((w - t.length) / 2);
  return ' '.repeat(left) + t;
};

const wrap = (text: string, w: number) => {
  const out: string[] = [];
  let line = '';
  for (const word of String(text ?? '').split(/\s+/).filter(Boolean)) {
    if ((line + ' ' + word).trim().length > w) {
      if (line) out.push(line);
      line = word.length > w ? word.slice(0, w) : word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
};

const kv = (label: string, value: string, w: number) => {
  const gap = w - label.length - value.length;
  return gap > 0 ? label + ' '.repeat(gap) + value : label + ' ' + value;
};

export type ReceiptData = Pick<
  Transaction,
  | 'transaksi_id'
  | 'nama_pembeli'
  | 'created_at'
  | 'metode_pembayaran'
  | 'metode_pengiriman'
  | 'alamat'
  | 'sub_total'
  | 'diskon'
  | 'total'
  | 'status'
>;

export function receiptText(
  tx: ReceiptData,
  items: TransactionItem[],
  config: Configuration | null,
  settings: Settings,
): string {
  const w = COLS[settings.paper];
  const sep = '-'.repeat(w);
  const lines: string[] = [];

  const header = (settings.header || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const title = (config?.nama || header[0] || 'SWEETNATION').trim();
  lines.push(center(title, w));
  header.filter((l) => l.toLowerCase() !== title.toLowerCase()).forEach((l) => lines.push(center(l, w)));
  lines.push(sep);

  lines.push(kv('No', tx.transaksi_id, w));
  lines.push(kv('Tanggal', String(tx.created_at ?? '').replace('#', ' '), w));
  lines.push(kv('Pembeli', tx.nama_pembeli, w));
  lines.push(kv('Bayar', tx.metode_pembayaran, w));
  lines.push(kv('Kirim', tx.metode_pengiriman, w));
  if (tx.alamat) wrap(tx.alamat, w).forEach((l) => lines.push(l));
  lines.push(sep);

  items.forEach((it) => {
    const lineTotal = Number(it.harga) * Number(it.jumlah) - Number(it.diskon ?? 0);
    wrap(it.produk, w).forEach((l) => lines.push(l));
    lines.push(kv(`  ${it.jumlah} x ${rupiah(it.harga)}`, rupiah(lineTotal), w));
  });
  if (!items.length) lines.push('Tidak ada item');
  lines.push(sep);

  lines.push(kv('Sub Total', rupiah(tx.sub_total), w));
  lines.push(kv('Diskon', `-${rupiah(tx.diskon)}`, w));
  lines.push(kv('TOTAL', rupiah(tx.total), w));
  lines.push(sep);
  lines.push(center(`Status: ${tx.status}`, w));
  (settings.footer || '').split('\n').filter(Boolean).forEach((l) => lines.push(center(l, w)));
  lines.push(center(String(tx.created_at ?? '').split('#')[1] ?? '', w));

  return lines.join('\n');
}

export function receiptHtml(text: string, settings: Settings): string {
  const width = settings.paper === '80' ? '80mm' : '58mm';
  const base = text.replace(/\n/g, '<br>');
  const copies = Math.max(1, settings.copies || 1);
  const pages = Array.from({ length: copies }, (_, i) =>
    `<div class="copy"${i < copies - 1 ? ' style="page-break-after:always"' : ''}>${base}</div>`,
  ).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Struk</title><style>
@page { size: ${width} auto; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
body { width: ${width}; padding: 2mm 3mm; box-sizing: border-box;
  font-family: 'Courier New', ui-monospace, monospace; font-size: ${settings.paper === '80' ? '11px' : '10px'};
  line-height: 1.3; color: #000; -webkit-print-color-adjust: exact; }
.copy { white-space: pre-wrap; word-break: break-word; }
</style></head><body>${pages}</body></html>`;
}

/** Cetak lewat iframe tersembunyi supaya dialog print tidak menutupi UI dan ukuran kertas ikut. */
function printHtml(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 1500);
  }, 200);
}

export function printReceipt(
  tx: ReceiptData,
  items: TransactionItem[],
  config: Configuration | null,
  settings: Settings,
): void {
  printHtml(receiptHtml(receiptText(tx, items, config, settings), settings));
}

export function printTest(settings: Settings): void {
  const w = COLS[settings.paper];
  const sep = '-'.repeat(w);
  const text = [
    center('SWEETNATION', w),
    center('Happiness is HOMEMADE', w),
    sep,
    center('TEST PRINT', w),
    sep,
    kv('Kertas', `${settings.paper} mm`, w),
    kv('Salinan', String(settings.copies), w),
    sep,
    center('Printer siap digunakan.', w),
    '',
  ].join('\n');
  printHtml(receiptHtml(text, settings));
}
