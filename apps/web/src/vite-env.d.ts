/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SQUARE_APPLICATION_ID?: string;
  readonly VITE_SQUARE_LOCATION_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type SquareTokenizeResult = { status: string; token?: string; errors?: unknown[] };

interface SquareCard {
  attach(selector: string): Promise<void>;
  destroy(): Promise<void>;
  tokenize(): Promise<SquareTokenizeResult>;
}

interface SquarePayments {
  card(): Promise<SquareCard>;
}

interface SquareConstructor {
  payments(applicationId: string, locationId: string): Promise<SquarePayments>;
}

declare global {
  interface Window {
    Square?: SquareConstructor;
  }
}

export {};
