import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { rupiah } from '../api';
import { Pager, usePaged } from '../Pagination';
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

  const paged = usePaged(filtered, { size: 12, resetKey: q });

  return (
    <div className="content">
      <div className="page-max">
        <div className="page-head">
          <h2>Daftar Menu</h2>
          <span className="sub">{filtered.length} item</span>
        </div>

        <div className="search-wrap" style={{ marginBottom: 16 }}>
          <Search size={16} style={{ color: '#555' }} />
          <input
            className="input"
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
          <>
            <div className="product-grid">
              {paged.slice.map((p) => (
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
