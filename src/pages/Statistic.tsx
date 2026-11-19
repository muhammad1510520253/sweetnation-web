import { useEffect, useState } from 'react';
import { api, rupiah, type Statistic } from '../api';
import { useAuth } from '../auth';
import { Empty, Spinner } from '../ui';

export default function StatisticPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .statistic(user.user_id)
      .then((d) => setRows(d ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat statistik'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="content"><Spinner /></div>;
  if (error) return <div className="content"><p className="error-text">{error}</p></div>;
  if (rows.length === 0) return <div className="content"><Empty text="Belum ada data penjualan" /></div>;

  const max = Math.max(...rows.map((r) => r.total || 0), 1);
  const w = 640;
  const h = 220;
  const pad = 28;
  const step = rows.length > 1 ? (w - pad * 2) / (rows.length - 1) : 0;
  const points = rows
    .map((r, i) => `${pad + i * step},${h - pad - ((r.total || 0) / max) * (h - pad * 2)}`)
    .join(' ');
  const totalAll = rows.reduce((s, r) => s + (r.total || 0), 0);
  const qtyAll = rows.reduce((s, r) => s + (r.jumlah || 0), 0);

  return (
    <div className="content">
      <div className="page-max" style={{ maxWidth: 720 }}>
        <div className="page-head">
          <h2>Statistik Penjualan</h2>
        </div>

        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <div className="stat"><div className="label">Total Pesanan</div><div className="value">{qtyAll}</div></div>
          <div className="stat money"><div className="label">Total Omzet</div><div className="value">{rupiah(totalAll)}</div></div>
        </div>

        <div className="card">
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" role="img" aria-label="Grafik penjualan">
            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1={pad}
                x2={w - pad}
                y1={h - pad - f * (h - pad * 2)}
                y2={h - pad - f * (h - pad * 2)}
                stroke="#eee"
                strokeWidth="1"
              />
            ))}
            <polyline points={points} fill="none" stroke="#f395be" strokeWidth="2.5" strokeLinejoin="round" />
            {rows.map((r, i) => {
              const cx = pad + i * step;
              const cy = h - pad - ((r.total || 0) / max) * (h - pad * 2);
              return (
                <g key={`${r.tanggal}-${i}`}>
                  <circle cx={cx} cy={cy} r="3.5" fill="#fff" stroke="#f395be" strokeWidth="2.5">
                    <title>{`${r.tanggal}: ${rupiah(r.total)} (${r.jumlah} pesanan)`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="table-wrap">
            <table className="simple">
              <thead>
                <tr><th>Tanggal</th><th className="num">Pesanan</th><th className="num">Omzet</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.tanggal}-${i}`}>
                    <td>{r.tanggal}</td>
                    <td className="num">{r.jumlah}</td>
                    <td className="num">{rupiah(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
