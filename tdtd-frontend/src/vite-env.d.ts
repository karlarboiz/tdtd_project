/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** `web` (default) or `mobile` — mobile enables Capacitor + offline paths. */
  readonly VITE_APP_TARGET?: 'web' | 'mobile'
  /** Dev-only: idle warning delay in ms (default 240000). Restart `npm run dev` after change. */
  readonly VITE_INACTIVITY_WARNING_MS?: string
  /** Dev-only: idle logout delay in ms (default 300000). Restart `npm run dev` after change. */
  readonly VITE_INACTIVITY_LOGOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
