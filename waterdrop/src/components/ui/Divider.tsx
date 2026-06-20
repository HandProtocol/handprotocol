import './Divider.css';

export interface DividerProps {
  /** Inset the hairline from the leading edge to align with text content. */
  inset?: boolean;
}

/** 1px limestone hairline. Decorative by default (role="separator", no label). */
export function Divider({ inset = false }: DividerProps) {
  return (
    <hr className={`wd-divider${inset ? ' wd-divider--inset' : ''}`} role="separator" />
  );
}
