/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_N2YO_API_KEY: string;
  readonly VITE_EMISSIONS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
