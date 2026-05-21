import { LoaderSplash } from "@/components/loader-splash";

/*
  Root route is the cold-boot splash. We serve the existing 3D loader from
  /public/loading.html inside a full-bleed iframe so the artwork stays
  pristine (raw three.js + anime.js, no React glue). Once the dashboard has
  been prefetched and a minimum dwell of 1.4s has elapsed, we hand off to
  /dashboard. See web/3d-test/loading.html for the original.
*/
export default function Page() {
  return <LoaderSplash />;
}
