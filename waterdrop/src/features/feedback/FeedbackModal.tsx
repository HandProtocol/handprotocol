import { useEffect, useRef, useState } from 'react';
import { X, Check, Send, Mail } from 'lucide-react';
import { Button, Chip, TextInput, Textarea, IconButton } from '@/components/ui';
import { useStore } from '@/store';
import { sendFeedback, subscribeEmail, rememberedName, EMAIL_RE } from './feedback';
import './FeedbackModal.css';

const TAGS = ['👍 Love it', '🐛 Issue', '💡 Idea', '❓ Question'];

type Status = 'idle' | 'sending' | 'sent' | 'queued' | 'tooShort' | 'badEmail';

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeRegion = useStore((s) => s.activeRegion);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [subOptIn, setSubOptIn] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [subscribed, setSubscribed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Seed fields and run the modal contract (focus, trap, Escape, return-focus).
  useEffect(() => {
    if (!open) return;
    setName(rememberedName());
    setText('');
    setTags([]);
    setSubOptIn(false);
    setEmail('');
    setStatus('idle');
    setSubscribed(false);
    const node = panelRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const focusables = (): HTMLElement[] =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>('button, textarea, input, [href]'),
          ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
        : [];
    const t = window.setTimeout(() => node?.querySelector('textarea')?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node?.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      node?.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const toggleTag = (tag: string) =>
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]));

  const submit = async () => {
    const hasMsg = text.trim().length >= 2;
    if (!hasMsg && !subOptIn) {
      setStatus('tooShort');
      panelRef.current?.querySelector('textarea')?.focus();
      return;
    }
    if (subOptIn && !EMAIL_RE.test(email.trim())) {
      setStatus('badEmail');
      panelRef.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
      return;
    }
    setStatus('sending');
    let fbResult: 'sent' | 'queued' | null = null;
    if (hasMsg) fbResult = await sendFeedback({ text, name, tags, region: activeRegion });
    if (subOptIn) {
      const r = await subscribeEmail(email, name);
      setSubscribed(r === 'subscribed' || r === 'pending');
    }
    const final = fbResult === 'queued' ? 'queued' : 'sent';
    setStatus(final);
    window.setTimeout(onClose, final === 'sent' ? 1700 : 2400);
  };

  const finished = status === 'sent' || status === 'queued';
  const hadMsg = text.trim().length >= 2;

  return (
    <div className="wd-fb" role="presentation">
      <div className="wd-fb__scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="wd-fb__card"
        role="dialog"
        aria-modal="true"
        aria-label="Send feedback"
        ref={panelRef}
      >
        <IconButton
          label="Close feedback"
          variant="ghost"
          className="wd-fb__close"
          onClick={onClose}
        >
          <X size={20} />
        </IconButton>

        {finished ? (
          <div className="wd-fb__done" role="status">
            <span className="wd-fb__done-mark" aria-hidden="true">
              <Check size={26} />
            </span>
            <p className="wd-fb__done-title">
              {status === 'queued'
                ? 'Saved. It will send when you are back online.'
                : hadMsg
                  ? 'Thank you, your note is in.'
                  : 'You are on the list.'}
            </p>
            <p className="wd-fb__done-sub">
              {subscribed
                ? 'We will email you the occasional WaterDrop update.'
                : 'The HAND Protocol team sees it in their dashboard.'}
            </p>
          </div>
        ) : (
          <>
            <h2 className="wd-fb__title display">Send feedback</h2>
            <p className="wd-fb__sub">
              What works, what does not, what is missing. Helps HAND Protocol make
              WaterDrop better. Anonymous unless you add your name.
            </p>

            <div className="wd-fb__tags" role="group" aria-label="Quick tags">
              {TAGS.map((t) => (
                <Chip key={t} selected={tags.includes(t)} onClick={() => toggleTag(t)}>
                  {t}
                </Chip>
              ))}
            </div>

            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (status === 'tooShort') setStatus('idle');
              }}
              maxLength={2000}
              rows={4}
              aria-label="Your feedback"
              placeholder="A bug, an idea, a missing drop-in spot, anything…"
            />
            {status === 'tooShort' && (
              <p className="wd-fb__err" role="alert">
                Add a note, or check the box below to just get updates.
              </p>
            )}

            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
              aria-label="Your name (optional)"
              placeholder="Name (optional)"
              className="wd-fb__name"
            />

            <div className="wd-fb__sub-opt">
              <Chip
                selected={subOptIn}
                icon={<Mail size={15} />}
                onClick={() => {
                  setSubOptIn((v) => !v);
                  if (status === 'badEmail') setStatus('idle');
                }}
              >
                Email me WaterDrop updates
              </Chip>
              {subOptIn && (
                <>
                  <TextInput
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === 'badEmail') setStatus('idle');
                    }}
                    aria-label="Your email"
                    aria-invalid={status === 'badEmail' ? true : undefined}
                    placeholder="you@email.com"
                    className="wd-fb__email"
                  />
                  {status === 'badEmail' ? (
                    <p className="wd-fb__err" role="alert">
                      Enter a valid email.
                    </p>
                  ) : (
                    <p className="wd-fb__hint">
                      Occasional updates on new drop-ins and features. Unsubscribe anytime.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="wd-fb__foot">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={status === 'sending'}
                icon={<Send size={18} />}
                onClick={submit}
              >
                {hadMsg ? 'Send to HAND Protocol' : subOptIn ? 'Subscribe' : 'Send'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
