/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** `web` (default) or `mobile` — mobile enables Capacitor + offline paths. */
  readonly VITE_APP_TARGET?: 'web' | 'mobile'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
