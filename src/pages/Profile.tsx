import { useNavigate } from 'react-router-dom';
import { BarChart3, LogOut, Printer, RefreshCw, Shield, User } from 'lucide-react';
import { useAuth } from '../auth';
import { useStore } from '../store';
import { useToast } from '../ui';

export default function Profile() {
  const { user, logout } = useAuth();
  const { refresh, loading, products } = useStore();
  const { show } = useToast();
  const nav = useNavigate();

  const printTest = () => {
    const w = window.open('', '_blank', 'width=380,height=520');
    if (!w) return show('Popup diblokir browser', 'error');
    w.document.write(
      '<pre style="font-family:Courier New,monospace;font-size:12px">SWEETNATION\nHappiness is HOMEMADE\n------------------------\nTEST PRINT\n------------------------\nPrinter siap digunakan.\n</pre>',
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="content">
      <div className="page-max" style={{ maxWidth: 560 }}>
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
          <button className="menu-item" onClick={printTest}>
            <span className="mi-icon"><Printer size={17} /></span>
            <span className="mi-title">Test Printer</span>
          </button>
          <button className="menu-item" onClick={logout}>
            <span className="mi-icon" style={{ background: '#ffe6e6', color: 'var(--red)' }}><LogOut size={17} /></span>
            <span className="mi-title" style={{ color: 'var(--red)' }}>Keluar</span>
          </button>
        </div>

        <p className="hint" style={{ textAlign: 'center', marginTop: 22 }}>Sweetnation Web v1.0.0</p>
      </div>
    </div>
  );
}
