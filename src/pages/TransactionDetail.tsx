import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { api, rupiah, type Transaction, type TransactionItem } from '../api';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { Confirm, Spinner, useToast } from '../ui';
import { printReceipt } from '../receipt';
import { loadSettings } from '../settings';
import { txTime } from './Transactions';

const NEXT_STATUS: Record<string, string> = {
  Antrian: 'Proses',
  Proses: 'Siap',
  Siap: 'Selesai',
};

export default function TransactionDetail() {
  const { user } = useAuth();
  const { config } = useStore();
  const { show } = useToast();
  const nav = useNavigate();
  const { id = '' } = useParams();
  const location = useLocation() as { state?: { tx?: Transaction } };
  const [tx, setTx] = useState<Transaction | null>(location.state?.tx ?? null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.transactionItems(user.user_id, id);
      setItems(data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const advance = async () => {
    if (!tx) return;
    const next = NEXT_STATUS[tx.status];
    if (!next) return show('Transaksi sudah selesai', 'error');
    setAsk(false);
    setBusy(true);
    try {
      await api.updateTransactionStatus(user!.user_id, tx.transaksi_id, next);
      setTx({ ...tx, status: next });
      show(`Status diubah ke ${next}`, 'success');
    } catch (e) {
      show(e instanceof Error ? e.message : 'Gagal mengubah status', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!tx) {
    return (
      <div className="content">
        <div className="page-max">
          <button className="btn ghost sm" onClick={() => nav('/transactions')}><ArrowLeft size={14} /> Kembali</button>
          <p className="empty">Detail transaksi tidak tersedia. Buka dari daftar transaksi.</p>
        </div>
      </div>
    );
  }

  const itemsTotal = items.reduce((sum, it) => sum + Number(it.harga) * Number(it.jumlah) - Number(it.diskon ?? 0), 0);

  return (
    <div className="content">
      <div className="page-max" style={{ maxWidth: 560 }}>
        <div className="page-head no-print">
          <button className="icon-btn" onClick={() => nav(-1)}><ArrowLeft size={16} /></button>
          <h2 style={{ flex: 1 }}>Detail Transaksi</h2>
          <button
            className="icon-btn"
            onClick={() => printReceipt(tx, items, config, loadSettings())}
            title="Cetak struk"
            aria-label="Cetak struk"
          >
            <Printer size={16} />
          </button>
        </div>

        <div className="receipt">
          <h4>{config?.nama ?? 'SWEETNATION'}</h4>
          <div className="center">Happiness is HOMEMADE</div>
          <div className="line" />
          <table>
            <tbody>
              <tr><td>No</td><td className="right">{tx.transaksi_id}</td></tr>
              <tr><td>Tanggal</td><td className="right">{tx.created_at?.replace('#', ' ')}</td></tr>
              <tr><td>Pembeli</td><td className="right">{tx.nama_pembeli}</td></tr>
              <tr><td>Bayar</td><td className="right">{tx.metode_pembayaran}</td></tr>
              <tr><td>Kirim</td><td className="right">{tx.metode_pengiriman}</td></tr>
              {tx.alamat && <tr><td>Alamat</td><td className="right">{tx.alamat}</td></tr>}
            </tbody>
          </table>
          <div className="line" />
          {loading ? (
            <Spinner />
          ) : (
            <table>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={2} className="center">Tidak ada item</td></tr>
                ) : (
                  items.map((it, i) => (
                    <tr key={`${it.produk}-${i}`}>
                      <td>
                        {it.produk}
                        <br />
                        <small>{it.jumlah} x {rupiah(it.harga)}</small>
                      </td>
                      <td className="right">{rupiah(Number(it.harga) * Number(it.jumlah) - Number(it.diskon ?? 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          <div className="line" />
          <table>
            <tbody>
              <tr><td>Sub Total</td><td className="right">{rupiah(tx.sub_total ?? itemsTotal)}</td></tr>
              <tr><td>Diskon</td><td className="right">-{rupiah(tx.diskon)}</td></tr>
              <tr><td><strong>TOTAL</strong></td><td className="right"><strong>{rupiah(tx.total)}</strong></td></tr>
            </tbody>
          </table>
          <div className="line" />
          <div className="center">Status: {tx.status}</div>
          <div className="center">Terima kasih 🙏</div>
          <div className="center" style={{ marginTop: 6 }}>{txTime(tx.created_at)}</div>
        </div>

        <div className="no-print" style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button className="btn ghost block" onClick={() => nav('/transactions')}>Kembali</button>
          {NEXT_STATUS[tx.status] && (
            <button className="btn block" onClick={() => setAsk(true)} disabled={busy}>
              {busy ? 'Menyimpan…' : `Tandai ${NEXT_STATUS[tx.status]}`}
            </button>
          )}
        </div>

        {ask && NEXT_STATUS[tx.status] && (
          <Confirm
            title="Ubah Status?"
            message={
              <>
                Status transaksi <strong>{tx.transaksi_id}</strong> akan diubah menjadi{' '}
                <strong>{NEXT_STATUS[tx.status]}</strong>.
              </>
            }
            confirmLabel={`Ya, ${NEXT_STATUS[tx.status]}`}
            busy={busy}
            onConfirm={advance}
            onCancel={() => setAsk(false)}
          />
        )}
      </div>
    </div>
  );
}
