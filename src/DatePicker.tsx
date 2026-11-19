import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover } from './Popover';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const pad = (n: number) => String(n).padStart(2, '0');
/** YYYY-MM-DD (lokal, tanpa pergeseran timezone). */
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayYmd = () => toYmd(new Date());

function parseYmd(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmt = (v: string) => {
  const d = parseYmd(v);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}` : '';
};

/** Input tanggal kustom — kalender Neo-Brutalism, tanpa date picker browser. */
export function DatePicker({
  value,
  onChange,
  id,
  ariaLabel = 'Pilih tanggal',
  className = '',
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = parseYmd(value) ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (wrap.current?.contains(t)) return;
      if (t.closest?.('.pop-cal')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7; // Senin = kolom 0
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const out: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view]);

  const today = todayYmd();
  const shift = (step: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + step, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const pick = (day: number) => {
    const v = toYmd(new Date(view.y, view.m, day));
    onChange(v);
    setOpen(false);
  };

  return (
    <div className={`dt ${className}`.trim()} ref={wrap}>
      <button
        type="button"
        id={id}
        ref={btn}
        className="dd-btn dt-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          const d = parseYmd(value) ?? new Date();
          setView({ y: d.getFullYear(), m: d.getMonth() });
          setOpen((o) => !o);
        }}
      >
        <Calendar size={15} className="dt-ico" />
        <span className="dd-label">{fmt(value) || 'Pilih tanggal'}</span>
        <ChevronDown size={15} className={open ? 'dd-chev up' : 'dd-chev'} />
      </button>

      <Popover open={open} anchor={btn} className="pop-cal" width={318}>
        <div className="cal" role="dialog" aria-label="Kalender">
          <div className="cal-head">
            <button type="button" className="cal-nav" onClick={() => shift(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft size={16} />
            </button>
            <strong>
              {MONTHS[view.m]} {view.y}
            </strong>
            <button type="button" className="cal-nav" onClick={() => shift(1)} aria-label="Bulan berikutnya">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="cal-grid cal-dow">
            {DAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((day, i) =>
              day === null ? (
                <span key={`x${i}`} />
              ) : (
                <button
                  type="button"
                  key={day}
                  className={`cal-day ${toYmd(new Date(view.y, view.m, day)) === value ? 'on' : ''} ${
                    toYmd(new Date(view.y, view.m, day)) === today ? 'today' : ''
                  }`}
                  disabled={!!max && toYmd(new Date(view.y, view.m, day)) > max}
                  onClick={() => pick(day)}
                >
                  {day}
                </button>
              ),
            )}
          </div>

          <div className="cal-foot">
            <button type="button" className="btn xs ghost" onClick={() => { onChange(today); setOpen(false); }}>
              Hari ini
            </button>
            {value && (
              <button type="button" className="btn xs ghost" onClick={() => { onChange(''); setOpen(false); }}>
                Kosongkan
              </button>
            )}
          </div>
        </div>
      </Popover>
    </div>
  );
}
