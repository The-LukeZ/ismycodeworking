import { DurableObject } from "cloudflare:workers";

type TurnstileErrorCodes =
  | "missing-input-secret"
  | "invalid-input-secret"
  | "missing-input-response"
  | "invalid-input-response"
  | "timeout-or-duplicate"
  | "bad-request"
  | "internal-error";

type TurnstileVerifyResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes": TurnstileErrorCodes[];
  action?: string;
  cdata?: string;
  metadata?: Record<string, any>;
};

export default {
  async fetch(request, env, _ctx): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Moin", { status: 200 });
    }

    const remoteIp =
      request.headers.get("cf-Connecting-ipv6") ||
      request.headers.get("cf-Connecting-ip") ||
      request.headers.get("x-real-ip");
    if (remoteIp === null) {
      return new Response("IP address is missing", { status: 400 });
    }

    try {
      const stub = env.RATELIMITER.getByName(remoteIp);
      const milliseconds_to_next_request = await stub.getMillisecondsToNextRequest();
      if (milliseconds_to_next_request > 0) {
        return new Response("Rate limit exceeded", { status: 429 });
      }
    } catch (error) {
      return new Response("Could not connect to rate limiter", { status: 502 });
    }
    const body = await request.json<any>().catch(() => ({}));
    if (!body?.cf_token) {
      return new Response("Captcha token is missing", { status: 400 });
    } else if (!body.clicked === true) {
      return new Response("Button not clicked", { status: 400 });
    }

    const cf_token = body.cf_token;
    const result = await new TurnstileValidator(env.CLOUDFLARE_TURNSTILE_SECRET).validate(cf_token, remoteIp);
    if (!result.success) {
      return new Response("Captcha validation failed", { status: 400 });
    }

    const stub = env.COUNTER_TRACKER.getByName("counter");

    await stub.increment();

    return new Response("ok");
  },
} satisfies ExportedHandler<Env>;

class TurnstileValidator {
  constructor(
    private secretKey: string,
    private timeout = 10000,
  ) {}

  async validate(token: string, remoteip: string, options: Record<string, any> = {}) {
    // Input validation
    if (!token || typeof token !== "string") {
      return { success: false, error: "Invalid token format" };
    }

    if (token.length > 2048) {
      return { success: false, error: "Token too long" };
    }

    // Prepare request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const formData = new FormData();
      formData.append("secret", this.secretKey);
      formData.append("response", token);

      if (remoteip) {
        formData.append("remoteip", remoteip);
      }

      if (options.idempotencyKey) {
        formData.append("idempotency_key", options.idempotencyKey);
      }

      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const result = await response.json<TurnstileVerifyResponse>();

      // Additional validation
      if (result.success) {
        if (options.expectedAction && result.action !== options.expectedAction) {
          return {
            success: false,
            error: "Action mismatch",
            expected: options.expectedAction,
            received: result.action,
          };
        }

        if (options.expectedHostname && result.hostname !== options.expectedHostname) {
          return {
            success: false,
            error: "Hostname mismatch",
            expected: options.expectedHostname,
            received: result.hostname,
          };
        }
      }

      return result;
    } catch (error: any) {
      if (error.name === "AbortError") {
        return { success: false, error: "Validation timeout" };
      }

      console.error("Turnstile validation error:", error);
      return { success: false, error: "Internal error" };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Durable Objects
export class CounterTracker extends DurableObject<Env> {
  private clicks: number = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.clicks = (await this.ctx.storage.get<number>("clicks")) || 0;
    });
  }

  async increment(): Promise<void> {
    this.clicks++;
    await this.ctx.storage.put("clicks", this.clicks);
    console.log(`Counter incremented to ${this.clicks}`);
  }
}

export class RateLimiter extends DurableObject {
  static readonly requests_per_second = 1;
  static readonly refill_interval_ms = 1000; // 1 second
  static readonly capacity = 10; // Reasonable burst capacity

  tokens: number;
  lastRefill: number;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.tokens = RateLimiter.capacity;
    this.lastRefill = Date.now();
  }

  async getMillisecondsToNextRequest(): Promise<number> {
    this.refillTokens();
    this.checkAndSetAlarm();

    if (this.tokens > 0) {
      this.tokens -= 1;
      return 0; // Request allowed immediately
    }

    // Calculate when next token will be available
    return RateLimiter.refill_interval_ms / RateLimiter.requests_per_second;
  }

  private refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd =
      Math.floor(timePassed / RateLimiter.refill_interval_ms) * RateLimiter.requests_per_second;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(RateLimiter.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  private async checkAndSetAlarm() {
    let currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm == null) {
      this.ctx.storage.setAlarm(Date.now() + RateLimiter.refill_interval_ms);
    }
  }

  async alarm() {
    this.refillTokens();

    // Only set next alarm if we're not at capacity
    if (this.tokens < RateLimiter.capacity) {
      this.checkAndSetAlarm();
    }
  }
}
