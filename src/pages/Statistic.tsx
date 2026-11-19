import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, rupiah, type Statistic } from '../api';
import { useAuth } from '../auth';
import { Pager, usePaged } from '../Pagination';
import { DatePicker } from '../DatePicker';
import { Empty, Spinner } from '../ui';

/** Terima `dd-MM-yyyy`, `dd/mm/yyyy`, atau `yyyy-mm-dd`. */
function parseTgl(s: string): Date | null {
  const n = s.split(/\D+/).filter(Boolean).map(Number);
  if (n.length < 3) return null;
  const [a, b, c] = n;
  const d = a > 31 ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
  return Number.isNaN(d.getTime()) ? null : d;
}
const ymdOf = (d: Date | null) =>
  d ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}` : '';

export default function StatisticPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Statistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api
      .statistic(user.user_id)
      .then((d) => setRows(d ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat statistik'))
      .finally(() => setLoading(false));
  }, [user]);

  /** Sudah difilter rentang tanggal, urut terbaru dulu. */
  const desc = useMemo(() => {
    return rows
      .filter((r) => {
        const v = ymdOf(parseTgl(r.tanggal));
        if (!v) return true;
        return (!from || v >= from.replace(/-/g, '')) && (!to || v <= to.replace(/-/g, ''));
      })
      .sort((a, b) => (parseTgl(b.tanggal)?.getTime() ?? 0) - (parseTgl(a.tanggal)?.getTime() ?? 0));
  }, [rows, from, to]);

  const paged = usePaged(desc, { size: 10, resetKey: `${from}|${to}` });
  const chartRows = useMemo(() => [...desc].reverse(), [desc]);

  if (loading) return <div className="content"><Spinner /></div>;
  if (error) return <div className="content"><p className="error-text">{error}</p></div>;

  const max = Math.max(...chartRows.map((r) => r.total || 0), 1);
  const w = 640;
  const h = 220;
  const pad = 28;
  const step = chartRows.length > 1 ? (w - pad * 2) / (chartRows.length - 1) : 0;
  const point = (r: Statistic, i: number) => ({
    cx: pad + i * step,
    cy: h - pad - ((r.total || 0) / max) * (h - pad * 2),
  });
  const totalAll = desc.reduce((s, r) => s + (r.total || 0), 0);
  const qtyAll = desc.reduce((s, r) => s + (r.jumlah || 0), 0);

  return (
    <div className="content">
      <div className="page-max" style={{ maxWidth: 820 }}>
        <div className="page-head">
          <button className="icon-btn" onClick={() => nav(-1)} aria-label="Kembali">
            <ArrowLeft size={16} />
          </button>
          <h2 style={{ flex: 1 }}>Statistik Penjualan</h2>
          <span className="sub">{desc.length} hari</span>
        </div>

        <div className="row" style={{ marginBottom: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Dari Tanggal</label>
            <DatePicker value={from} onChange={setFrom} ariaLabel="Dari tanggal" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Sampai Tanggal</label>
            <DatePicker value={to} onChange={setTo} ariaLabel="Sampai tanggal" max={from || undefined} />
          </div>
        </div>

        {(from || to) && (
          <button
            className="btn xs ghost"
            style={{ marginBottom: 14 }}
            onClick={() => { setFrom(''); setTo(''); }}
          >
            Reset rentang tanggal
          </button>
        )}

        {desc.length === 0 ? (
          <Empty text="Belum ada data penjualan pada rentang ini" />
        ) : (
          <>
            <div className="stat-grid" style={{ marginBottom: 18 }}>
              <div className="stat"><div className="label">Total Pesanan</div><div className="value">{qtyAll}</div></div>
              <div className="stat money"><div className="label">Total Omzet</div><div className="value">{rupiah(totalAll)}</div></div>
            </div>

            <div className="card chart-wrap">
              <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" role="img" aria-label="Grafik penjualan">
                {[0, 0.5, 1].map((f) => (
                  <line
                    key={f}
                    x1={pad}
                    x2={w - pad}
                    y1={h - pad - f * (h - pad * 2)}
                    y2={h - pad - f * (h - pad * 2)}
                    stroke="#0b0b0b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.25"
                  />
                ))}
                <polyline
                  points={chartRows.map((r, i) => `${point(r, i).cx},${point(r, i).cy}`).join(' ')}
                  fill="none"
                  stroke="#0b0b0b"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                {chartRows.map((r, i) => {
                  const { cx, cy } = point(r, i);
                  return (
                    <g
                      key={`${r.tanggal}-${i}`}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setHover(i)}
                    >
                      <circle cx={cx} cy={cy} r="16" fill="transparent" style={{ cursor: 'pointer' }} />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={hover === i ? 6 : 4}
                        fill={hover === i ? '#ffd400' : '#ff8fb8'}
                        stroke="#0b0b0b"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}
              </svg>

              {hover !== null && chartRows[hover] && (
                <div
                  className={`chart-tip ${point(chartRows[hover], hover).cy < 70 ? 'below' : ''}`}
                  style={{
                    left: `${(point(chartRows[hover], hover).cx / w) * 100}%`,
                    top: `${(point(chartRows[hover], hover).cy / h) * 100}%`,
                  }}
                >
                  <strong>{chartRows[hover].tanggal}</strong>
                  <span>{rupiah(chartRows[hover].total)}</span>
                  <span>{chartRows[hover].jumlah} pesanan</span>
                </div>
              )}
            </div>

            <div className="section-title">
              <h3>Rincian Harian</h3>
              <span className="sub">terbaru dulu</span>
            </div>

            <div className="table-wrap">
              <table className="simple">
                <thead>
                  <tr><th>Tanggal</th><th className="num">Pesanan</th><th className="num">Omzet</th></tr>
                </thead>
                <tbody>
                  {paged.slice.map((r, i) => (
                    <tr key={`${r.tanggal}-${i}`}>
                      <td>{r.tanggal}</td>
                      <td className="num">{r.jumlah}</td>
                      <td className="num">{rupiah(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pager
              page={paged.page}
              pages={paged.pages}
              total={paged.total}
              size={paged.size}
              onPage={paged.setPage}
              onSize={paged.setSize}
            />
          </>
        )}
      </div>
    </div>
  );
}
