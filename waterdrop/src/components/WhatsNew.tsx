import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import './WhatsNew.css';

// Bump this string to surface a new note to returning users.
const VERSION = '2026-06-central-texas';
const KEY = 'wd-whatsnew';

/** A quiet, one-time callout that points out the latest additions. */
export function WhatsNew() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = '';
    try {
      seen = localStorage.getItem(KEY) || '';
    } catch {
      /* ignore */
    }
    if (seen === VERSION) return;
    const t = window.setTimeout(() => setShow(true), 1600);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, VERSION);
    } catch {
      /* ignore */
    }
  };

  if (!show) return null;

  return (
    <div className="wd-whatsnew" role="status">
      <span className="wd-whatsnew__icon" aria-hidden="true">
        <Sparkles size={16} />
      </span>
      <p className="wd-whatsnew__text">
        <strong>New:</strong> Austin &amp; Central Texas drop-ins, and a feedback button up top.
      </p>
      <button
        type="button"
        className="wd-whatsnew__close"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
