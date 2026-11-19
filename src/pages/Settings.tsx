import { useState } from 'react';
import { ArrowLeft, Printer, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../settings';
import { printTest, receiptText, type ReceiptData } from '../receipt';
import type { TransactionItem } from '../api';
import { useToast } from '../ui';
import { Select } from '../Select';

const PAPERS = [
  { value: '58' as const, label: '58 mm — 32 karakter' },
  { value: '80' as const, label: '80 mm — 48 karakter' },
];
const COPIES = [1, 2, 3].map((n) => ({ value: n, label: `${n} salinan` }));

const SAMPLE_TX: ReceiptData = {
  transaksi_id: 'TR20260219143012',
  nama_pembeli: 'Contoh Pembeli',
  created_at: '19-02-2026#14:30:12',
  metode_pembayaran: 'CASH',
  metode_pengiriman: 'AMBIL',
  alamat: '',
  sub_total: 46000,
  diskon: 2000,
  total: 44000,
  status: 'Selesai',
};

const SAMPLE_ITEMS: TransactionItem[] = [
  { transaksi_id: SAMPLE_TX.transaksi_id, produk: 'Lumpur Surga', jumlah: 2, harga: 7000, diskon: 0 },
  { transaksi_id: SAMPLE_TX.transaksi_id, produk: 'Cake Potong Cheese', jumlah: 1, harga: 18000, diskon: 0 },
  { transaksi_id: SAMPLE_TX.transaksi_id, produk: 'Banana Muffin', jumlah: 2, harga: 7500, diskon: 0 },
];

export default function SettingsPage() {
  const nav = useNavigate();
  const { show } = useToast();
  const [form, setForm] = useState<Settings>(loadSettings);
  const preview = receiptText(SAMPLE_TX, SAMPLE_ITEMS, null, form);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    saveSettings(form);
    show('Pengaturan printer disimpan', 'success');
  };

  const reset = () => {
    setForm(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    show('Pengaturan dikembalikan ke default', 'info');
  };

  return (
    <div className="content">
      <div className="page-max" style={{ maxWidth: 560 }}>
        <div className="page-head">
          <button className="icon-btn" onClick={() => nav(-1)} aria-label="Kembali"><ArrowLeft size={16} /></button>
          <h2 style={{ flex: 1 }}>Pengaturan Printer</h2>
        </div>

        <div className="card">
          <div className="field">
            <label htmlFor="paper">Ukuran kertas</label>
            <Select
              id="paper"
              value={form.paper}
              options={PAPERS}
              onChange={(v) => set('paper', v)}
            />
          </div>

          <div className="field">
            <label htmlFor="header">Header struk</label>
            <textarea
              id="header"
              className="textarea"
              rows={3}
              value={form.header}
              onChange={(e) => set('header', e.target.value)}
              placeholder="Nama toko / slogan, satu baris satu teks"
            />
            <small className="hint">Baris pertama dipakai sebagai nama toko. Maks 3 baris.</small>
          </div>

          <div className="field">
            <label htmlFor="footer">Footer struk</label>
            <textarea
              id="footer"
              className="textarea"
              rows={2}
              value={form.footer}
              onChange={(e) => set('footer', e.target.value)}
              placeholder="Ucapan terima kasih / kontak"
            />
          </div>

          <div className="field">
            <label htmlFor="copies">Jumlah salinan</label>
            <Select
              id="copies"
              value={form.copies}
              options={COPIES}
              onChange={(v) => set('copies', v)}
            />
          </div>

          <label className="menu-item" style={{ cursor: 'pointer' }}>
            <span className="mi-title" style={{ flex: 1 }}>Cetak otomatis setelah simpan transaksi</span>
            <input
              type="checkbox"
              checked={form.autoPrint}
              onChange={(e) => set('autoPrint', e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--pink-dark)' }}
            />
          </label>
          <small className="hint">
            Browser akan menampilkan dialog print. Pilih printer thermal dan matikan “Headers and footers”.
            Bluetooth ESC/POS langsung dari browser belum didukung.
          </small>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="kv" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Pratinjau struk</span>
            <span className="chip soft">{form.paper} mm</span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: '#faf7f8',
              border: '1px dashed var(--pink)',
              borderRadius: 10,
              fontFamily: "'Courier New', monospace",
              fontSize: 11,
              lineHeight: 1.35,
              overflowX: 'auto',
            }}
          >
            {preview}
          </pre>
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn ghost block" onClick={() => printTest(form)}>
            <Printer size={15} /> Test Print
          </button>
          <button className="btn block" onClick={save}>
            <Save size={15} /> Simpan
          </button>
        </div>

        <button className="btn ghost block" style={{ marginTop: 10 }} onClick={reset}>
          Kembalikan default
        </button>
      </div>
    </div>
  );
}
