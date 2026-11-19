import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { api, ddMMyyyy, rupiah, type Transaction } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { DatePicker } from '../DatePicker';
import { Empty, Spinner } from '../ui';

type Summary = {
  antrian: number;
  proses: number;
  siap: number;
  selesai: number;
  total: number;
  cash: number;
  transfer: number;
  qris: number;
  ewallet: number;
  pemasukan: number;
};

const summarize = (rows: Transaction[]): Summary => {
  const s: Summary = {
    antrian: 0, proses: 0, siap: 0, selesai: 0, total: 0,
    cash: 0, transfer: 0, qris: 0, ewallet: 0, pemasukan: 0,
  };
  rows.forEach((t) => {
    const nominal = Number(t.total ?? 0);
    s.pemasukan += nominal;
    switch ((t.metode_pembayaran ?? '').toUpperCase()) {
      case 'CASH': s.cash += nominal; break;
      case 'TRANSFER': s.transfer += nominal; break;
      case 'QRIS': s.qris += nominal; break;
      default: s.ewallet += nominal;
    }
    switch (t.status) {
      case 'Antrian': s.antrian++; break;
      case 'Proses': s.proses++; break;
      case 'Siap': s.siap++; break;
      case 'Selesai': s.selesai++; break;
    }
    s.total++;
  });
  return s;
};

export default function Home() {
  const { user } = useAuth();
  const { products, refresh, loading: loadingProducts } = useStore();
  const nav = useNavigate();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.transactions(user.user_id, ddMMyyyy(new Date(`${date}T00:00:00`)));
      setRows(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat transaksi');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = summarize(rows);
  const shown = products.slice(0, 6);

  return (
    <>
      <div className="topbar">
        <img className="logo" src="/logo.png" alt="Sweetnation" />
        <div style={{ flex: 1 }}>
          <h1>Halo, {user?.nama ?? '-'}</h1>
          <p>Happiness is HOMEMADE</p>
        </div>
        <button
          className="icon-btn"
          title="Muat ulang"
          onClick={() => {
            void load();
            void refresh();
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="content" style={{ paddingTop: 0 }}>
        <div className="page-max">
          <DatePicker value={date} onChange={setDate} ariaLabel="Tanggal" className="home-date" />

          {loading ? (
            <Spinner />
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : (
            <>
              <div className="divider" />
              <div className="section-title" style={{ marginTop: 0 }}>
                <h3>Pesanan</h3>
              </div>
              <div className="stat-grid">
                <div className="stat"><div className="label">Antrian</div><div className="value">{s.antrian}</div></div>
                <div className="stat"><div className="label">Proses</div><div className="value">{s.proses}</div></div>
                <div className="stat"><div className="label">Siap</div><div className="value">{s.siap}</div></div>
                <div className="stat"><div className="label">Selesai</div><div className="value">{s.selesai}</div></div>
              </div>
              <div className="stat-grid" style={{ marginTop: 12 }}>
                <div className="stat"><div className="label">Total Pesanan</div><div className="value">{s.total}</div></div>
                <div className="stat"><div className="label">Total Pemasukan</div><div className="value" style={{ fontSize: 16 }}>{rupiah(s.pemasukan)}</div></div>
              </div>

              <div className="divider" />
              <div className="section-title" style={{ marginTop: 0 }}>
                <h3>Pemasukan</h3>
              </div>
              <div className="stat-grid">
                <div className="stat money"><div className="label">CASH</div><div className="value">{rupiah(s.cash)}</div></div>
                <div className="stat money"><div className="label">TRANSFER</div><div className="value">{rupiah(s.transfer)}</div></div>
                <div className="stat money"><div className="label">QRIS</div><div className="value">{rupiah(s.qris)}</div></div>
                <div className="stat money"><div className="label">E-WALLET</div><div className="value">{rupiah(s.ewallet)}</div></div>
              </div>
            </>
          )}

          <div className="divider" />
          <div className="section-title">
            <h3>Daftar Menu</h3>
            <Link className="link-muted" to="/menu">Lihat Semua</Link>
          </div>

          {loadingProducts && products.length === 0 ? (
            <Spinner />
          ) : shown.length === 0 ? (
            <Empty text="Menu belum tersedia. Coba Refresh Cache di menu Akun." />
          ) : (
            <div className="product-grid">
              {shown.map((p) => (
                <button
                  key={p.id}
                  className="product"
                  onClick={() => nav('/transactions/new', { state: { productId: p.id } })}
                  title={p.nama}
                >
                  <div className="thumb">
                    {p.image ? <img src={p.image} alt={p.nama} loading="lazy" /> : null}
                    <span className="price-tag">{rupiah(p.harga)}</span>
                    {p.status === 0 && <span className="sold-out">Habis</span>}
                  </div>
                  <div className="name">{p.nama}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
