import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, ddMMyyyy, rupiah, type Transaction } from '../api';
import { useAuth } from '../auth';
import { Empty, Spinner } from '../ui';

const STATUS = ['Semua', 'Antrian', 'Proses', 'Siap', 'Selesai'];

export const txTime = (created?: string) => (created ?? '').split('#')[1] ?? '';

export default function Transactions() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('Semua');
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

  const shown = status === 'Semua' ? rows : rows.filter((t) => t.status === status);

  return (
    <div className="content">
      <div className="page-max">
        <div className="page-head">
          <h2>Transaksi</h2>
          <span className="sub">{shown.length} pesanan</span>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn" style={{ flex: '0 0 auto' }} onClick={() => nav('/transactions/new')}>
            <Plus size={16} /> Baru
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          {STATUS.map((s) => (
            <button
              key={s}
              className={`btn xs ${status === s ? '' : 'ghost'}`}
              style={{ flex: '0 0 auto' }}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : shown.length === 0 ? (
          <Empty text="Belum ada transaksi di tanggal ini" />
        ) : (
          <div className="list">
            {shown.map((t) => (
              <button
                key={t.transaksi_id}
                className="tx-card"
                style={{ textAlign: 'left', border: 'none', cursor: 'pointer' }}
                onClick={() => nav(`/transactions/${t.transaksi_id}`, { state: { tx: t } })}
              >
                <div className="tx-top">
                  <div>
                    <div className="tx-id">{t.transaksi_id}</div>
                    <div className="tx-time">{txTime(t.created_at)}</div>
                  </div>
                  <span className={`chip status-${t.status}`}>{t.status}</span>
                </div>
                <div className="tx-buyer">{t.nama_pembeli || '-'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="chip soft">{t.metode_pembayaran}</span>
                  <span className="tx-total">{rupiah(t.total)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
