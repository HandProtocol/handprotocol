// Ambient typing for the build-time env the crew gate reads. Kept local to the
// feature so it does not depend on a project-wide vite/client reference.
interface ImportMetaEnv {
  readonly VITE_CREW_PASSCODE?: string;
  readonly VITE_FEEDBACK_ENDPOINT?: string;
  readonly VITE_SUBSCRIBE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
