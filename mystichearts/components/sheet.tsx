"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

// The one glass sheet every layer of the site opens in: the contact doors and the chapters.
// Closes on Escape, on the veil, and on the X; locks the page scroll; returns focus.
export function Sheet({
  open,
  label,
  tabs,
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  tabs: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const lastActive = useRef<Element | null>(null);

  const close = useCallback(() => {
    onClose();
    const back = lastActive.current as HTMLElement | null;
    if (back && typeof back.focus === "function") back.focus();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-veil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="modal"
            initial={{ opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.99 }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="modal-tabs">{tabs}</div>
            <button className="modal-close" onClick={close} type="button" aria-label="Close">
              <X size={18} />
            </button>
            <div className="modal-body">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SheetTabs<T extends string>({
  items,
  current,
  onPick,
  label,
}: {
  items: { key: T; label: string; icon?: ReactNode }[];
  current: T;
  onPick: (key: T) => void;
  label: string;
}) {
  return (
    <div className="modal-doors" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button key={item.key} role="tab" aria-selected={current === item.key} className="door-tab" onClick={() => onPick(item.key)} type="button">
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// A panel that slides in when the tab changes; the heading takes focus for screen readers.
export function SheetPanel({ id, children, dir = 1 }: { id: string; children: ReactNode; dir?: 1 | -1 }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} initial={{ opacity: 0, x: 12 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 * dir }} transition={{ duration: 0.28 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function FocusTitle({ children, className = "modal-title" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <h2 ref={ref} tabIndex={-1} className={className}>
      {children}
    </h2>
  );
}
