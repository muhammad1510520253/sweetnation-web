import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { api, ddMMyyyy, hhmmss, rupiah, ymd, type Product } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { Modal, useToast } from '../ui';

type Row = { key: string; productId: string; jumlah: number; diskon: number };

const PAYMENTS = ['CASH', 'TRANSFER', 'QRIS', 'OVO', 'DANA', 'GOPAY'];
const DELIVERIES = ['AMBIL', 'COD', 'KURIR', 'PO'];

export default function TransactionForm() {
  const { user } = useAuth();
  const { products } = useStore();
  const { show } = useToast();
  const nav = useNavigate();
  const location = useLocation() as { state?: { productId?: string } };

  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [payment, setPayment] = useState('CASH');
  const [delivery, setDelivery] = useState('AMBIL');
  const [diskon, setDiskon] = useState(0);
  const [rows, setRows] = useState<Row[]>(() =>
    location.state?.productId ? [{ key: crypto.randomUUID(), productId: location.state.productId, jumlah: 1, diskon: 0 }] : [],
  );
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const subTotal = rows.reduce((sum, r) => {
    const p = productMap.get(r.productId);
    return sum + (p ? Number(p.harga) * r.jumlah - r.diskon : 0);
  }, 0);
  const total = Math.max(subTotal - diskon, 0);

  const addRow = (id: string) => {
    setRows((prev) => {
      const found = prev.find((r) => r.productId === id);
      if (found) return prev.map((r) => (r.productId === id ? { ...r, jumlah: r.jumlah + 1 } : r));
      return [...prev, { key: crypto.randomUUID(), productId: id, jumlah: 1, diskon: 0 }];
    });
    setPicker(false);
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
      diskon,
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
          diskon: r.diskon,
        })),
    };

    setSaving(true);
    try {
      await api.createTransaction(user.user_id, payload);
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
            <select className="select" value={payment} onChange={(e) => setPayment(e.target.value)}>
              {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Pengiriman</label>
            <select className="select" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
              {DELIVERIES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="section-title">
          <h3 style={{ fontSize: 16 }}>Item Pesanan</h3>
          <button className="btn sm" onClick={() => setPicker(true)}><Plus size={14} /> Menu</button>
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
                    <button className="icon-btn" onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}>
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
                        type="number"
                        min={0}
                        value={r.diskon}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) => (x.key === r.key ? { ...x, diskon: Math.max(0, Number(e.target.value) || 0) } : x)),
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="kv" style={{ marginTop: 8 }}>
                    <span>Subtotal</span>
                    <span>{rupiah(Number(p.harga) * r.jumlah - r.diskon)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="card" style={{ marginTop: 16 }}>
          <div className="kv"><span>Sub Total</span><span>{rupiah(subTotal)}</span></div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Diskon Transaksi (Rp)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={diskon}
              onChange={(e) => setDiskon(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="divider" />
          <div className="kv" style={{ fontSize: 16 }}>
            <span style={{ fontWeight: 600, color: '#111' }}>Total</span>
            <span style={{ fontWeight: 700, color: 'var(--pink-dark)' }}>{rupiah(total)}</span>
          </div>
        </div>

        <button className="btn block" style={{ marginTop: 16 }} onClick={submit} disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan Transaksi'}
        </button>
      </div>

      {picker && (
        <Modal title="Pilih Menu" onClose={() => setPicker(false)} wide>
          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {products.map((p) => (
              <button key={p.id} className="product" onClick={() => addRow(p.id)}>
                <div className="thumb">
                  {p.image ? <img src={p.image} alt={p.nama} loading="lazy" /> : null}
                  <span className="price-tag">{rupiah(p.harga)}</span>
                </div>
                <div className="name">{p.nama}</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
