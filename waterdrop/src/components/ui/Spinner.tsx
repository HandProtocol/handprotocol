import { Loader2 } from 'lucide-react';
import './Spinner.css';

export interface SpinnerProps {
  /** Pixel size of the spinner glyph. Defaults to 18. */
  size?: number;
}

/**
 * Inline loading spinner. Used by Button's loading state and anywhere a small
 * activity indicator is needed. Animation is paused under reduced motion (the
 * static glyph still reads as "busy").
 */
export function Spinner({ size = 18 }: SpinnerProps) {
  return <Loader2 className="wd-spinner" size={size} aria-hidden="true" />;
}
