// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Platform {
      env: Env;
      cf: CfProperties;
      ctx: ExecutionContext;
    }
  }

  interface Window {
    onTurnstileSuccess: (token: string) => void;
    onTurnstileError: (errorCode: any) => void;
    onTurnstileExpired: () => void;
    onTurnstileTimeout: () => void;
  }
}

export {};
