/**
 * Local hairline divider. The shared `@/components/ui/Divider` is listed in the
 * primitive contract but was not shipped by the UI agent at build time; this
 * keeps the map feature self-contained. Drop-in compatible if a shared one
 * lands later (same `<hr>` semantics + token hairline).
 */
import './map.css';

export function Divider() {
  return <hr className="wd-map-divider" aria-hidden="true" />;
}
