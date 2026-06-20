import { useEffect, useRef, useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  LogOut,
  MessageSquareText,
  NotebookPen,
} from 'lucide-react';
import { Button } from '@/components/ui';
import type { ComposeDraft } from '@/types';
import { useStore } from '@/store';
import { lock } from './passcode';
import { exportCsv, exportGeoJson } from './exportObservations';
import './CrewControls.css';

/**
 * Crew field controls. Only mounts when crew mode is unlocked, so it never
 * fights the public map. A bottom-left FAB starts a log; a small popover holds
 * the observation count, exports, and the exit action.
 */
export function CrewControls() {
  const crewMode = useStore((s) => s.crewMode);
  const composing = useStore((s) => s.compose != null);
  const selection = useStore((s) => s.selection);
  const observations = useStore((s) => s.observations);
  const startCompose = useStore((s) => s.startCompose);
  const setFeedbackOpen = useStore((s) => s.setFeedbackOpen);

  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Hide entirely outside crew mode, or while the compose overlay is up.
  if (!crewMode || composing) return null;

  const startLog = () => {
    const seed: Partial<ComposeDraft> = {};
    if (selection.kind === 'point') {
      seed.refType = 'point';
      seed.refId = selection.id;
    } else if (selection.kind === 'segment') {
      seed.refType = 'segment';
      seed.refId = selection.id;
    } else {
      seed.refType = 'gps';
    }
    startCompose(seed);
  };

  const count = observations.length;

  return (
    <div className="wd-crew-controls" ref={wrapRef}>
      {menuOpen && (
        <div className="wd-crew-controls__menu" role="menu">
          <div className="wd-crew-controls__menu-head">
            <span className="eyebrow">Crew</span>
            <span className="wd-crew-controls__count tabular">
              {count} {count === 1 ? 'observation' : 'observations'}
            </span>
          </div>
          <div className="wd-crew-controls__menu-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="wd-crew-controls__item"
            disabled={count === 0}
            onClick={() => {
              exportCsv(observations);
              setMenuOpen(false);
            }}
          >
            <FileSpreadsheet size={18} aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            role="menuitem"
            className="wd-crew-controls__item"
            disabled={count === 0}
            onClick={() => {
              exportGeoJson(observations);
              setMenuOpen(false);
            }}
          >
            <FileJson size={18} aria-hidden="true" />
            Export GeoJSON
          </button>
          <button
            type="button"
            role="menuitem"
            className="wd-crew-controls__item"
            onClick={() => {
              setMenuOpen(false);
              setFeedbackOpen(true);
            }}
          >
            <MessageSquareText size={18} aria-hidden="true" />
            Send feedback
          </button>
          <div className="wd-crew-controls__menu-divider" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="wd-crew-controls__item wd-crew-controls__item--exit"
            onClick={() => {
              setMenuOpen(false);
              lock();
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            Exit crew
          </button>
        </div>
      )}

      <div className="wd-crew-controls__bar">
        <button
          type="button"
          className="wd-crew-controls__menu-btn"
          aria-label="Crew menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Download size={18} aria-hidden="true" />
        </button>
        <Button
          variant="primary"
          size="lg"
          icon={<NotebookPen size={20} />}
          className="wd-crew-controls__log"
          onClick={startLog}
        >
          Log
        </Button>
      </div>
    </div>
  );
}
