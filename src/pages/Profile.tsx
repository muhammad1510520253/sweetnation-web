import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, LogOut, Printer, RefreshCw, Shield, User } from 'lucide-react';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { Modal, useToast } from '../ui';

export default function Profile() {
  const { user, logout } = useAuth();
  const [askLogout, setAskLogout] = useState(false);
  const { refresh, loading, products } = useStore();
  const { show } = useToast();
  const nav = useNavigate();

  return (
    <div className="content">
      <div className="page-max" style={{ maxWidth: 560 }}>
        <div className="page-head">
          <h2 style={{ flex: 1 }}>Akun</h2>
        </div>

        <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--pink-soft)', display: 'grid', placeItems: 'center', color: 'var(--pink-dark)' }}>
            <User size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.nama ?? '-'}</div>
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{user?.email}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <span className="chip soft"><Shield size={10} /> {user?.hak_akses === 1 ? 'Admin' : 'Kasir'}</span>
              <span className="chip soft">{products.length} menu</span>
            </div>
          </div>
        </div>

        <div className="menu-list">
          <button className="menu-item" onClick={() => nav('/statistic')}>
            <span className="mi-icon"><BarChart3 size={17} /></span>
            <span className="mi-title">Statistik Penjualan</span>
          </button>
          <button className="menu-item" onClick={() => void refresh().then(() => show('Cache diperbarui', 'success'))}>
            <span className="mi-icon"><RefreshCw size={17} /></span>
            <span className="mi-title">Refresh Cache</span>
            <span className="mi-value">{loading ? 'memuat…' : 'menu & konfigurasi'}</span>
          </button>
          <button className="menu-item" onClick={() => nav('/settings')}>
            <span className="mi-icon"><Printer size={17} /></span>
            <span className="mi-title">Pengaturan Printer</span>
            <span className="mi-value">58/80 mm</span>
          </button>
          <button className="menu-item" onClick={() => setAskLogout(true)}>
            <span className="mi-icon" style={{ background: '#ffe6e6', color: 'var(--red)' }}><LogOut size={17} /></span>
            <span className="mi-title" style={{ color: 'var(--red)' }}>Keluar</span>
          </button>
        </div>

        <p className="hint" style={{ textAlign: 'center', marginTop: 22 }}>Sweetnation Web v1.0.0</p>
      </div>

      {askLogout && (
        <Modal title="Keluar dari akun?" onClose={() => setAskLogout(false)}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>
            Kamu akan keluar dari akun <strong>{user?.nama ?? '-'}</strong>. Data tetap tersimpan di server.
          </p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setAskLogout(false)}>Batal</button>
            <button className="btn danger" onClick={logout}>Keluar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
