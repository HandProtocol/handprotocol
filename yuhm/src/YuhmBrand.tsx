import { BowlMark } from './LandingDecor'

type YuhmBrandProps = {
  /** Small line under the wordmark. Defaults to the network tagline used on the landing. */
  tagline?: string
  className?: string
  href?: string
}

/**
 * The one brand lockup (bowl mark + rounded wordmark + tagline) shared by the
 * landing, the sign-in screen, and the food finder, so a person sees the same
 * yuhm from the first page through signing in and into the task.
 */
export function YuhmBrand({ tagline = 'regenerative food network · Austin', className = '', href = '/' }: YuhmBrandProps) {
  return <a className={`yuhm-lockup ${className}`.trim()} href={href} aria-label="yuhm home">
    <BowlMark className="yuhm-mark" />
    <span className="yuhm-brand-copy"><span className="yuhm-word">yuhm</span><small>{tagline}</small></span>
  </a>
}
