import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type Opt<T> = { value: T; label: string };

type Props<T extends string | number> = {
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  small?: boolean;
};

/** Dropdown kustom Neo-Brutalism — pengganti <select> bawaan browser. */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  id,
  ariaLabel,
  className = '',
  disabled,
  small,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [up, setUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();

  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !btn.current || !list.current) return;
    const b = btn.current.getBoundingClientRect();
    const h = list.current.offsetHeight;
    setUp(b.bottom + h + 12 > window.innerHeight && b.top > h + 12);
  }, [open]);

  const openList = () => {
    setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const pick = (v: T) => {
    onChange(v);
    setOpen(false);
    btn.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(options.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Home') {
      setCursor(0);
    } else if (e.key === 'End') {
      setCursor(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = options[cursor];
      if (o) pick(o.value);
    }
  };

  return (
    <div className={`dd ${small ? 'dd-sm' : ''} ${className}`.trim()} ref={wrap}>
      <button
        type="button"
        id={id}
        ref={btn}
        className="dd-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
      >
        <span className="dd-label">{current?.label ?? '—'}</span>
        <ChevronDown size={small ? 14 : 16} className={open ? 'dd-chev up' : 'dd-chev'} />
      </button>

      {open && (
        <div
          className={`dd-list ${up ? 'up' : ''}`}
          role="listbox"
          id={listId}
          aria-label={ariaLabel}
          ref={list}
        >
          {options.map((o, i) => (
            <button
              type="button"
              key={String(o.value)}
              role="option"
              aria-selected={o.value === value}
              tabIndex={-1}
              className={`dd-item ${o.value === value ? 'on' : ''} ${i === cursor ? 'cur' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => pick(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
