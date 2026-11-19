import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { rupiah } from '../api';
import { useStore } from '../store';
import { Empty, Spinner } from '../ui';

export default function Menu() {
  const { products, loading, error } = useStore();
  const [q, setQ] = useState('');
  const nav = useNavigate();

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return products;
    return products.filter((p) => p.nama.toLowerCase().includes(key));
  }, [products, q]);

  return (
    <div className="content">
      <div className="page-max">
        <div className="page-head">
          <h2>Daftar Menu</h2>
          <span className="sub">{products.length} item</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#aaa' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Cari menu…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading && products.length === 0 ? (
          <Spinner />
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : filtered.length === 0 ? (
          <Empty text="Menu tidak ditemukan" />
        ) : (
          <div className="product-grid">
            {filtered.map((p) => (
              <button
                key={p.id}
                className="product"
                onClick={() => nav('/transactions/new', { state: { productId: p.id } })}
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
  );
}
