import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

type Opts = { size?: number; resetKey?: unknown };

/** Potong daftar jadi halaman. Ganti `resetKey` (filter/pencarian) → balik ke halaman 1. */
export function usePaged<T>(items: T[], { size: initialSize = 10, resetKey }: Opts = {}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);

  useEffect(() => setPage(1), [resetKey]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const slice = useMemo(
    () => items.slice((current - 1) * size, current * size),
    [items, current, size],
  );

  return { slice, page: current, setPage, pages, size, setSize, total: items.length };
}


export function Pager({
  page,
  pages,
  total,
  size,
  onPage,
  onSize,
}: {
  page: number;
  pages: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
  onSize: (n: number) => void;
}) {
  const sizeOpts = useMemo(() => {
    const base = [10, 20, 50, 100];
    const all = base.includes(size) ? base : [...base, size].sort((a, b) => a - b);
    return all.map((n) => ({ value: n, label: `${n} / hal` }));
  }, [size]);

  const nums = useMemo<(number | '…')[]>(() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const out: (number | '…')[] = [1];
    if (page > 3) out.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) out.push(i);
    if (page < pages - 2) out.push('…');
    out.push(pages);
    return out;
  }, [page, pages]);

  if (total === 0) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="pager-slot">
    <nav className="pager" aria-label="Navigasi halaman">
      <p className="pager-count">
        <strong>
          {from}–{to}
        </strong>{' '}
        dari <strong>{total}</strong> data
      </p>

      <div className="pager-nav">
        <button
          type="button"
          className="pg-step"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={16} />
          <span className="pg-step-text">Sebelumnya</span>
        </button>

        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="pg-dots" aria-hidden>
              …
            </span>
          ) : (
            <button
              type="button"
              key={n}
              className={`pg-num ${n === page ? 'on' : ''}`}
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              aria-label={`Halaman ${n}`}
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          className="pg-step"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Halaman berikutnya"
        >
          <span className="pg-step-text">Berikutnya</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="pager-size">
        <span className="pager-size-label">Per halaman</span>
        <Select
          small
          ariaLabel="Jumlah per halaman"
          value={size}
          options={sizeOpts}
          onChange={(n) => {
            onSize(n);
            onPage(1);
          }}
        />
      </div>
    </nav>
    </div>
  );
}
