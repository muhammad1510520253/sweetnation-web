import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api, ddMMyyyy, hhmmss, rupiah, ymd, type Product } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { Confirm, Modal, useToast } from '../ui';
import { printReceipt } from '../receipt';
import { loadSettings } from '../settings';
import { Select } from '../Select';

type Row = { key: string; productId: string; jumlah: number; diskon: string };

const PAYMENTS = ['CASH', 'TRANSFER', 'QRIS', 'OVO', 'DANA', 'GOPAY'];
const DELIVERIES = ['AMBIL', 'COD', 'KURIR', 'PO'];

export default function TransactionForm() {
  const { user } = useAuth();
  const { products, config } = useStore();
  const { show } = useToast();
  const nav = useNavigate();
  const location = useLocation() as { state?: { productId?: string } };

  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [payment, setPayment] = useState('CASH');
  const [delivery, setDelivery] = useState('AMBIL');
  const [diskon, setDiskon] = useState('');
  const [rows, setRows] = useState<Row[]>(() =>
    location.state?.productId ? [{ key: crypto.randomUUID(), productId: location.state.productId, jumlah: 1, diskon: '' }] : [],
  );
  const [picker, setPicker] = useState(false);
  const [pq, setPq] = useState('');
  const [ask, setAsk] = useState(false);
  const [delKey, setDelKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const picked = useMemo(() => {
    const key = pq.trim().toLowerCase();
    if (!key) return products;
    return products.filter((p) => p.nama.toLowerCase().includes(key));
  }, [products, pq]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const subTotal = rows.reduce((sum, r) => {
    const p = productMap.get(r.productId);
    return sum + (p ? Number(p.harga) * r.jumlah - (Number(r.diskon) || 0) : 0);
  }, 0);
  const diskonNum = Number(diskon) || 0;
  const total = Math.max(subTotal - diskonNum, 0);

  const addRow = (id: string) => {
    setRows((prev) => {
      const found = prev.find((r) => r.productId === id);
      if (found) return prev.map((r) => (r.productId === id ? { ...r, jumlah: r.jumlah + 1 } : r));
      return [...prev, { key: crypto.randomUUID(), productId: id, jumlah: 1, diskon: '' }];
    });
    setPicker(false);
  };

  const askSubmit = () => {
    if (rows.length === 0) return show('Pilih menu dulu', 'error');
    if (!nama.trim()) return show('Nama pembeli wajib diisi', 'error');
    setAsk(true);
  };

  const submit = async () => {
    if (!user) return;
    if (rows.length === 0) return show('Pilih menu dulu', 'error');
    if (!nama.trim()) return show('Nama pembeli wajib diisi', 'error');

    const now = new Date();
    const transaksiId = `TR${ymd(now)}${hhmmss(now)}`;
    const payload = {
      transaksi_id: transaksiId,
      nama_pembeli: nama.trim(),
      keterangan: keterangan.trim(),
      metode_pembayaran: payment,
      metode_pengiriman: delivery,
      alamat: alamat.trim(),
      sub_total: subTotal,
      diskon: diskonNum,
      total,
      status: 'Antrian',
      created_by: user.nama,
      updated_by: null,
      created_at: `${ddMMyyyy(now)}#${now.toTimeString().slice(0, 8)}`,
      updated_at: null,
      isUpdate: false,
      items: rows
        .filter((r) => productMap.has(r.productId))
        .map((r) => ({
          transaksi_id: transaksiId,
          produk: productMap.get(r.productId)!.nama,
          jumlah: r.jumlah,
          harga: Number(productMap.get(r.productId)!.harga),
          diskon: Number(r.diskon) || 0,
        })),
    };

    setAsk(false);
    setSaving(true);
    try {
      await api.createTransaction(user.user_id, payload);
      const settings = loadSettings();
      if (settings.autoPrint) printReceipt(payload, payload.items, config, settings);
      show('Transaksi berhasil ditambahkan', 'success');
      nav('/transactions', { replace: true });
    } catch (e) {
      show(e instanceof Error ? e.message : 'Gagal menyimpan transaksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content">
      <div className="page-max" style={{ maxWidth: 640 }}>
        <div className="page-head">
          <h2>Tambah Transaksi</h2>
        </div>

        <div className="field">
          <label>Nama Pembeli *</label>
          <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama pembeli" />
        </div>
        <div className="field">
          <label>Alamat</label>
          <input className="input" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat pengiriman" />
        </div>
        <div className="field">
          <label>Keterangan</label>
          <textarea className="textarea" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Catatan pesanan" />
        </div>
        <div className="row">
          <div className="field">
            <label>Pembayaran</label>
            <Select value={payment} options={PAYMENTS.map((p) => ({ value: p, label: p }))} onChange={setPayment} ariaLabel="Pembayaran" />
          </div>
          <div className="field">
            <label>Pengiriman</label>
            <Select value={delivery} options={DELIVERIES.map((d) => ({ value: d, label: d }))} onChange={setDelivery} ariaLabel="Pengiriman" />
          </div>
        </div>

        <div className="section-title">
          <h3 style={{ fontSize: 16 }}>Item Pesanan</h3>
          <button className="btn sm" onClick={() => { setPq(''); setPicker(true); }}><Plus size={14} /> Menu</button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">Belum ada item. Tap Menu untuk menambahkan.</div>
        ) : (
          <div className="list">
            {rows.map((r) => {
              const p = productMap.get(r.productId);
              if (!p) return null;
              return (
                <div className="card" key={r.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 14 }}>{p.nama}</strong>
                    <button className="icon-btn" onClick={() => setDelKey(r.key)} aria-label={`Hapus ${p.nama}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Jumlah</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={r.jumlah}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) => (x.key === r.key ? { ...x, jumlah: Math.max(1, Number(e.target.value) || 1) } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Diskon (Rp)</label>
                      <input
                        className="input"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={r.diskon}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, diskon: v } : x)));
                        }}
                      />
                    </div>
                  </div>
                  <div className="kv" style={{ marginTop: 8 }}>
                    <span>Subtotal</span>
                    <span>{rupiah(Number(p.harga) * r.jumlah - (Number(r.diskon) || 0))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="tx-foot">
        <div className="card">
          <div className="kv"><span>Sub Total</span><span>{rupiah(subTotal)}</span></div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Diskon Transaksi (Rp)</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={diskon}
              onChange={(e) => setDiskon(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="divider" />
          <div className="kv" style={{ fontSize: 16 }}>
            <span style={{ fontWeight: 600, color: '#111' }}>Total</span>
            <span style={{ fontWeight: 700, color: 'var(--pink-dark)' }}>{rupiah(total)}</span>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost" style={{ flex: '0 0 38%' }} onClick={() => nav('/transactions')} disabled={saving}>
            Batal
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={askSubmit} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan Transaksi'}
          </button>
        </div>
        </div>
      </div>

      {picker && (
        <Modal title="Pilih Menu" onClose={() => setPicker(false)} wide>
          <div className="search-wrap" style={{ marginBottom: 12 }}>
            <Search size={16} style={{ color: '#555' }} />
            <input
              className="input"
              placeholder="Cari menu…"
              value={pq}
              onChange={(e) => setPq(e.target.value)}
              autoFocus
            />
          </div>
          <p className="hint" style={{ marginBottom: 10 }}>{picked.length} menu tersedia</p>
          {picked.length === 0 ? (
            <div className="empty">Menu tidak ditemukan</div>
          ) : (
          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {picked.map((p) => (
              <button key={p.id} className="product" onClick={() => addRow(p.id)}>
                <div className="thumb">
                  {p.image ? <img src={p.image} alt={p.nama} loading="lazy" /> : null}
                  <span className="price-tag">{rupiah(p.harga)}</span>
                </div>
                <div className="name">{p.nama}</div>
              </button>
            ))}
          </div>
          )}
        </Modal>
      )}

      {delKey && (
        <Confirm
          title="Hapus Item?"
          message={
            <>
              <strong>{productMap.get(rows.find((r) => r.key === delKey)?.productId ?? '')?.nama ?? 'Item'}</strong> akan
              dihapus dari pesanan.
            </>
          }
          confirmLabel="Hapus"
          danger
          onConfirm={() => {
            setRows((prev) => prev.filter((x) => x.key !== delKey));
            setDelKey(null);
          }}
          onCancel={() => setDelKey(null)}
        />
      )}

      {ask && (
        <Confirm
          title="Simpan Transaksi?"
          message={
            <>
              Transaksi untuk <strong>{nama.trim() || '-'}</strong> dengan total{' '}
              <strong>{rupiah(total)}</strong> akan disimpan.
            </>
          }
          confirmLabel="Simpan"
          busy={saving}
          onConfirm={submit}
          onCancel={() => setAsk(false)}
        />
      )}
    </div>
  );
}
