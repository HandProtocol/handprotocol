/**
 * The run sheet's small parts: buttons, chips, the family sticker, the bag
 * tag, check tiles, steppers, the bottom sheet, and the embroidered stamp
 * from THE MISSION. Every interactive part has a visible focus ring, a
 * pressed state, a disabled state, and a target at least 44px tall.
 */
import {
  useEffect, useId, useRef, useState,
  type AnchorHTMLAttributes, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode,
} from 'react'
import {
  Check, Ear, Languages, Leaf, Minus, Moon, Plus, Repeat, Route, Snowflake, Sunrise, Timer, Truck, Umbrella, Users, X,
  type LucideIcon,
} from 'lucide-react'
import { PRODUCE, PRODUCE_TINT, initialsOf, produceIndex, type StampIcon } from './model'

type ButtonLook = { variant?: 'primary' | 'quiet' | 'ghost' | 'danger' | 'corn'; size?: 'lg' | 'md' | 'sm'; icon?: ReactNode; trailing?: ReactNode; block?: boolean }

const buttonClass = ({ variant = 'primary', size = 'md', block }: ButtonLook, extra = ''): string =>
  `run-btn run-btn-${variant} run-btn-${size}${block ? ' run-btn-block' : ''}${extra ? ` ${extra}` : ''}`

export function Button({ variant, size, icon, trailing, block, className, children, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook) {
  return <button type={type} className={buttonClass({ variant, size, block }, className)} {...rest}>
    {icon}<span>{children}</span>{trailing}
  </button>
}

/** A link that looks like a button: for messages, calls, and directions that open another app. */
export function LinkButton({ variant, size, icon, trailing, block, className, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & ButtonLook) {
  return <a className={buttonClass({ variant, size, block }, className)} {...rest}>
    {icon}<span>{children}</span>{trailing}
  </a>
}

export type ChipTone = 'wait' | 'asked' | 'yes' | 'no' | 'quiet' | 'done' | 'warn' | 'practice'

export function Chip({ tone = 'quiet', icon, children }: { tone?: ChipTone; icon?: ReactNode; children: ReactNode }) {
  return <span className={`run-chip run-chip-${tone}`}>{icon}{children}</span>
}

export function Eyebrow({ children, as: Tag = 'p' }: { children: ReactNode; as?: 'p' | 'span' }) {
  return <Tag className="run-eyebrow">{children}</Tag>
}

/** A family's sticker: initials on the produce color that follows them through the run. */
export function Sticker({ id, label, size = 'md' }: { id: string; label: string; size?: 'sm' | 'md' | 'lg' }) {
  const index = produceIndex(id)
  return <span
    className={`run-sticker run-sticker-${size}`}
    style={{ '--sticker': PRODUCE[index], '--sticker-tint': PRODUCE_TINT[index], '--tilt': `${(index % 2 ? 1 : -1) * (2 + (index % 3))}deg` } as React.CSSProperties}
    aria-hidden="true"
  >{initialsOf(label)}</span>
}

/** The numbered tag that hangs on a family's bag. */
export function BagTag({ number, label, size = 'md' }: { number: number | null; label: string; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`run-bagtag run-bagtag-${size}`} role="img" aria-label={label}><b aria-hidden="true">{number ?? '?'}</b></span>
}

export function SeedsTag({ count, plus = true }: { count: number; plus?: boolean }) {
  return <span className="run-seeds"><Leaf size={14} aria-hidden="true" />{plus ? '+' : ''}{count}</span>
}

export function CheckTile({ checked, onChange, children, hint, disabled }: { checked: boolean; onChange: (next: boolean) => void; children: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return <button type="button" role="checkbox" aria-checked={checked} className="run-check" disabled={disabled} onClick={() => onChange(!checked)}>
    <span className="run-check-box" aria-hidden="true">{checked && <Check size={16} strokeWidth={3} />}</span>
    <span className="run-check-text">{children}{hint && <small>{hint}</small>}</span>
  </button>
}

export function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} className="run-switch" disabled={disabled} onClick={() => onChange(!checked)}>
    <span className="run-switch-text">{label}{hint && <small>{hint}</small>}</span>
    <span className="run-switch-track" aria-hidden="true"><i /></span>
  </button>
}

export function Stepper({ value, onChange, min = 0, max = 9999, step = 1, label, lessLabel, moreLabel, suffix }: {
  value: number; onChange: (next: number) => void; min?: number; max?: number; step?: number; label: string; lessLabel: string; moreLabel: string; suffix?: ReactNode
}) {
  const clamp = (next: number): number => Math.round(Math.min(max, Math.max(min, next)) * 10) / 10
  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return <div className="run-stepper" role="group" aria-label={label}>
    <button type="button" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`${lessLabel}: ${label}`}><Minus size={18} aria-hidden="true" /></button>
    <output aria-live="polite"><b>{shown}</b>{suffix && <small>{suffix}</small>}</output>
    <button type="button" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`${moreLabel}: ${label}`}><Plus size={18} aria-hidden="true" /></button>
  </div>
}

export type Option<T extends string> = { value: T; label: ReactNode; icon?: ReactNode }

/** One choice out of a few, as a row of buttons. Arrow keys move between them. */
export function Segmented<T extends string>({ options, value, onChange, label, wrap }: { options: Array<Option<T>>; value: T | null; onChange: (next: T) => void; label: string; wrap?: boolean }) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const index = Math.max(0, options.findIndex((option) => option.value === value))
    const next = options[(index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length]
    onChange(next.value)
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button')
    buttons[options.indexOf(next)]?.focus()
  }
  const current = options.some((option) => option.value === value) ? value : null
  return <div className={`run-segmented${wrap ? ' run-segmented-wrap' : ''}`} role="radiogroup" aria-label={label} onKeyDown={move}>
    {options.map((option, index) => <button
      key={option.value}
      type="button"
      role="radio"
      aria-checked={option.value === value}
      tabIndex={option.value === current || (current === null && index === 0) ? 0 : -1}
      onClick={() => onChange(option.value)}
    >{option.icon}{option.label}</button>)}
  </div>
}

/** Any number of choices out of a set, with room for the runner's own wording. */
export function TagPicker({ options, selected, onToggle, label, tone = 'plain', onAddCustom, customLabel, addLabel, labelFor }: {
  options: Array<{ value: string; label: string }>
  selected: string[]
  onToggle: (value: string) => void
  label: string
  tone?: 'plain' | 'alert'
  onAddCustom?: (value: string) => void
  customLabel?: string
  addLabel?: string
  labelFor?: (value: string) => string
}) {
  const [custom, setCustom] = useState('')
  const known = new Set(options.map((option) => option.value))
  const extras = selected.filter((value) => !known.has(value))
  const add = () => {
    const value = custom.trim().toLowerCase()
    if (value.length < 2 || value.length > 40) return
    onAddCustom?.(value)
    setCustom('')
  }
  return <div className={`run-tags run-tags-${tone}`} role="group" aria-label={label}>
    {[...options, ...extras.map((value) => ({ value, label: labelFor ? labelFor(value) : value }))].map((option) => <button
      key={option.value}
      type="button"
      aria-pressed={selected.includes(option.value)}
      onClick={() => onToggle(option.value)}
    >{selected.includes(option.value) && <Check size={14} strokeWidth={3} aria-hidden="true" />}{option.label}</button>)}
    {onAddCustom && <span className="run-tags-custom">
      <input
        value={custom}
        onChange={(event) => setCustom(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add() } }}
        placeholder={customLabel}
        aria-label={customLabel}
        maxLength={40}
        enterKeyHint="done"
      />
      <button type="button" onClick={add} disabled={custom.trim().length < 2}>{addLabel}</button>
    </span>}
  </div>
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** A sheet for one focused task: slides up on a phone, sits beside the page on a wide screen. */
export function Sheet({ title, eyebrow, onClose, closeLabel, children, footer, wide }: {
  title: string; eyebrow?: ReactNode; onClose: () => void; closeLabel: string; children: ReactNode; footer?: ReactNode; wide?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panel.current?.focus()
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab' || !panel.current) return
      const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.documentElement.classList.add('run-sheet-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('run-sheet-open')
      opener?.focus?.()
    }
  }, [])

  return <div className="run-sheet-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={panel} className={`run-sheet${wide ? ' run-sheet-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="run-sheet-head">
        <div>{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h2 id={titleId}>{title}</h2></div>
        <button type="button" className="run-icon-btn" onClick={onClose} aria-label={closeLabel}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="run-sheet-body">{children}</div>
      {footer && <footer className="run-sheet-foot">{footer}</footer>}
    </div>
  </div>
}

const STAMP_ICONS: Record<StampIcon, LucideIcon> = {
  truck: Truck, circle: Repeat, leaf: Leaf, sunrise: Sunrise, moon: Moon, timer: Timer,
  umbrella: Umbrella, ear: Ear, languages: Languages, users: Users, route: Route, snowflake: Snowflake,
}

/** An embroidered patch: scalloped edge, stitched ring, the name on an arc. */
export function Patch({ top, bottom, icon, color, size = 104, earned = true, stamped }: {
  top: string; bottom: string; icon: StampIcon; color: string; size?: number; earned?: boolean; stamped?: boolean
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const scallops = 20
  const radius = 54
  const center = 66
  const points = Array.from({ length: scallops }, (_, index) => {
    const angle = (index / scallops) * Math.PI * 2 - Math.PI / 2
    return [(center + radius * Math.cos(angle)).toFixed(2), (center + radius * Math.sin(angle)).toFixed(2)]
  })
  const arc = (radius * Math.sin(Math.PI / scallops)).toFixed(2)
  const edge = `M${points[0][0]} ${points[0][1]}${points.map((_, index) => { const point = points[(index + 1) % scallops]; return `A${arc} ${arc} 0 0 1 ${point[0]} ${point[1]}` }).join('')}Z`
  const Icon = STAMP_ICONS[icon]
  return <svg className={`run-patch${earned ? '' : ' run-patch-open'}${stamped ? ' run-patch-stamped' : ''}`} width={size} height={size} viewBox="0 0 132 132" role="img" aria-label={top}>
    <path d={edge} fill={earned ? color : 'none'} stroke={earned ? 'none' : 'currentColor'} strokeWidth={earned ? 0 : 1.6} strokeDasharray={earned ? undefined : '5 4'} />
    {earned && <circle cx="66" cy="66" r="47" fill="none" stroke="#3b2a22" strokeWidth="1.6" strokeDasharray="4 3.5" opacity=".6" />}
    <defs>
      <path id={`${id}a`} d="M31 66A35 35 0 0 1 101 66" />
      <path id={`${id}b`} d="M22 66A44 44 0 0 0 110 66" />
    </defs>
    <text className="run-patch-text"><textPath href={`#${id}a`} startOffset="50%" textAnchor="middle">{top}</textPath></text>
    <text className="run-patch-text"><textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">{bottom}</textPath></text>
    <Icon x={50} y={50} width={32} height={32} color="#3b2a22" strokeWidth={2} aria-hidden="true" />
  </svg>
}

/** A ring that fills toward the next level, with something in the middle. */
export function Ring({ percent, size = 64, children }: { percent: number; size?: number; children?: ReactNode }) {
  const radius = 26
  const length = 2 * Math.PI * radius
  return <span className="run-ring" style={{ width: size, height: size }}>
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r={radius} fill="none" className="run-ring-track" strokeWidth="7" />
      <circle cx="32" cy="32" r={radius} fill="none" className="run-ring-fill" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${((length * Math.min(100, Math.max(percent, 3))) / 100).toFixed(1)} ${length.toFixed(1)}`} transform="rotate(-90 32 32)" />
    </svg>
    <span className="run-ring-center">{children}</span>
  </span>
}

export function Banner({ tone = 'info', icon, children, action }: { tone?: 'info' | 'warn' | 'alert' | 'good' | 'practice'; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return <div className={`run-banner run-banner-${tone}`} role={tone === 'alert' ? 'alert' : undefined}>
    {icon && <span className="run-banner-icon" aria-hidden="true">{icon}</span>}
    <div className="run-banner-text">{children}</div>
    {action && <div className="run-banner-action">{action}</div>}
  </div>
}

export function Field({ label, hint, error, optional, children }: { label: string; hint?: ReactNode; error?: string | null; optional?: string; children: ReactNode }) {
  return <label className={`run-field${error ? ' run-field-error' : ''}`}>
    <span className="run-field-label">{label}{optional && <small>{optional}</small>}</span>
    {children}
    {error ? <span className="run-field-note" role="alert">{error}</span> : hint ? <span className="run-field-note">{hint}</span> : null}
  </label>
}

/** Counts up to a number once, for the finish screen. Stands still when motion is reduced. */
export function CountUp({ to, duration = 900 }: { to: number; duration?: number }) {
  const reduce = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(reduce ? to : 0)
  useEffect(() => {
    if (reduce || typeof requestAnimationFrame !== 'function') { setShown(to); return }
    let frame = 0
    const start = performance.now()
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration)
      setShown(Math.round(to * (1 - (1 - progress) ** 4)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to, duration, reduce])
  return <span className="run-count">{shown}</span>
}
