import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Users, X, NotebookPen } from 'lucide-react';
import { Button, Field, IconButton, TextInput } from '@/components/ui';
import { useStore } from '@/store';
import { joinCrew, crewName, crewTeam } from './passcode';
import './CrewGate.css';

export interface CrewGateProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Open crew sign-up (scrim + card), distinct from the main map sheet. Anyone can
 * join by entering a name; observations are authored under it. No passcode.
 */
export function CrewGate({ open, onClose }: CrewGateProps) {
  const setCrewMode = useStore((s) => s.setCrewMode);
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Capture the trigger, seed any saved identity, focus the input, trap focus.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const savedName = crewName();
    setName(savedName === 'Crew' ? '' : savedName);
    setTeam(crewTeam());
    setError(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const card = cardRef.current;
      if (!card) return;
      const focusables = card.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    returnFocusRef.current?.focus?.();
  }, [open]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Add a name so your notes are credited');
      inputRef.current?.focus();
      return;
    }
    joinCrew(name, team);
    setCrewMode(true);
    onClose();
  };

  return (
    <div
      className="wd-crew-gate"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="wd-crew-gate__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wd-crew-gate-title"
      >
        <div className="wd-crew-gate__head">
          <span className="wd-crew-gate__badge" aria-hidden="true">
            <Users size={18} />
          </span>
          <div className="wd-crew-gate__heading">
            <h2 id="wd-crew-gate-title" className="wd-crew-gate__title">
              Join the crew
            </h2>
            <p className="wd-crew-gate__sub">
              Anyone can help steward the river. Add your name to log photos,
              water tests, and sightings.
            </p>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>

        <form className="wd-crew-gate__form" onSubmit={submit}>
          <Field label="Your name" htmlFor="wd-crew-name" error={error ?? undefined}>
            <TextInput
              ref={inputRef}
              id="wd-crew-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              placeholder="e.g. Sam R."
            />
          </Field>

          <Field label="Crew or group (optional)" htmlFor="wd-crew-team">
            <TextInput
              id="wd-crew-team"
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. San Marcos River Foundation"
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            icon={<NotebookPen size={18} />}
          >
            Start logging
          </Button>
        </form>
      </div>
    </div>
  );
}
