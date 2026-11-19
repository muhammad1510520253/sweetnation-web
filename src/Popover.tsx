import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Panel mengambang (portal ke <body>) supaya tidak terpotong
 * overflow modal / container. Posisi dihitung dari elemen anchor.
 */
export function Popover({
  open,
  anchor,
  children,
  className = '',
  align = 'start',
  width,
}: {
  open: boolean;
  anchor: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end';
  width?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    if (!open || !anchor.current || !panel.current) return;
    const place = () => {
      const a = anchor.current!.getBoundingClientRect();
      const p = panel.current!;
      const w = Math.min(width ?? Math.max(a.width, p.offsetWidth), window.innerWidth - 16);
      const h = p.offsetHeight;

      let top = a.bottom + 8;
      if (top + h + 8 > window.innerHeight && a.top - h - 8 > 8) top = a.top - h - 8;
      top = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - h - 8));

      let left = align === 'end' ? a.right - w : a.left;
      left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - w - 8));

      setStyle({ top, left, width: w, opacity: 1 });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchor, align, width]);

  if (!open) return null;

  return createPortal(
    <div ref={panel} className={`pop ${className}`.trim()} style={style}>
      {children}
    </div>,
    document.body,
  );
}

/** Tutup popover saat klik di luar anchor & panel. */
export function useDismiss(open: boolean, close: () => void, ...refs: RefObject<HTMLElement | null>[]) {
  useLayoutEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (refs.some((r) => r.current?.contains(t))) return;
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close, refs]);
}
