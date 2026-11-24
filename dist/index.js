// src/main.mjs
var import_node_crypto2 = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");

// ../../sdk/typescript/src/util.ts
function readEnv(name) {
  const proc = globalThis.process;
  try {
    const v = proc?.env?.[name];
    return v === void 0 || v === "" ? void 0 : v;
  } catch {
    return void 0;
  }
}
function sleep(ms, signal) {
  return new Promise((resolve2, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(t);
      reject(abortReason(signal));
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve2();
    }, Math.max(0, ms));
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
function abortReason(signal) {
  return signal.reason ?? new DOMException("This operation was aborted", "AbortError");
}
function throwIfAborted(signal) {
  if (signal?.aborted) throw abortReason(signal);
}
function randomId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = b[6] & 15 | 64;
  b[8] = b[8] & 63 | 128;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var B64_LOOKUP = (() => {
  const t = new Int16Array(256).fill(-1);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  t["-".charCodeAt(0)] = 62;
  t["_".charCodeAt(0)] = 63;
  return t;
})();
function bytesToBase64(bytes) {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + "==";
  } else if (rest === 2) {
    const n = bytes[i] << 16 | bytes[i + 1] << 8;
    out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + "=";
  }
  return out;
}
function base64ToBytes(s) {
  const clean = s.replace(/[\s=]/g, "");
  const out = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    const v = ch < 256 ? B64_LOOKUP[ch] : -1;
    if (v < 0) throw new TypeError("invalid base64 data");
    acc = acc << 6 | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = acc >> bits & 255;
    }
  }
  if (clean.length % 4 === 1) throw new TypeError("invalid base64 data");
  return out.subarray(0, o);
}
async function sha256Hex(data) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
}
function utf8(s) {
  return new TextEncoder().encode(s);
}
function encodePath(name) {
  return name.split("/").map(encodeURIComponent).join("/");
}
function toRFC3339(v) {
  if (typeof v === "string") return v;
  return new Date(v).toISOString();
}
function toUnixMs(v) {
  return typeof v === "number" ? Math.floor(v) : v.getTime();
}
function compact(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) if (v !== void 0) out[k] = v;
  return out;
}

// ../../sdk/typescript/src/account.ts
var Templates = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /** Templates you can create sandboxes from (name, default size, …). */
  async list(options) {
    return (await this.t.json({ method: "GET", path: "/v1/templates", options })).data ?? [];
  }
};
var BudgetResource = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /** Limits, spend this month and today, amounts reserved by running jobs; `days: true` adds spend per day. */
  async get(options = {}) {
    const { days, ...rest } = options;
    return (await this.t.json({ method: "GET", path: "/v1/budget", query: { days: days ? 1 : void 0 }, options: rest })).data;
  }
  /**
   * Sets your own monthly / daily limit (`""` or `0` removes it) and the alert threshold in
   * percent. Limits set by the operator still apply. Keys of connected apps may not do this.
   */
  async update(params, options) {
    const json = compact({
      monthly_limit: params.monthly === void 0 ? void 0 : String(params.monthly),
      daily_limit: params.daily === void 0 ? void 0 : String(params.daily),
      alert_pct: params.alertPct
    });
    return (await this.t.json({ method: "PUT", path: "/v1/budget", json, options })).data;
  }
};
var Compute = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /** Classes available to your account (relative price, availability) and your default class. */
  async preferences(options) {
    return (await this.t.json({ method: "GET", path: "/v1/compute/preferences", options })).data;
  }
  /**
   * Sets the default class for new sandboxes and jobs (`""` = the global default). Running
   * sandboxes and accepted jobs keep their class and price.
   */
  async setDefaultClass(name, options) {
    return (await this.t.json({ method: "PUT", path: "/v1/compute/preferences", json: { default_compute_class: name }, options })).data;
  }
};
var Webhooks = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /** The secret that signs your webhooks (`X-WBX-Signature`). */
  async secret(options) {
    return (await this.t.json({ method: "GET", path: "/v1/webhooks/secret", options })).data.secret;
  }
  /** Issues a new webhook secret (the old one stops working). */
  async rotateSecret(options) {
    return (await this.t.json({ method: "POST", path: "/v1/webhooks/secret/rotate", json: {}, options })).data.secret;
  }
};

// ../../sdk/typescript/src/errors.ts
var WBXError = class extends Error {
  name = "WBXError";
};
var APIError = class extends WBXError {
  name = "APIError";
  /** HTTP status code. */
  status;
  /** Machine-readable code from the error body (`quota`, `feature_disabled`, …), if any. */
  code;
  /** Parsed error body (JSON object) or the raw text when it was not JSON. */
  body;
  /** Response headers. */
  headers;
  /** HTTP method of the request. */
  method;
  /** Request URL (without the API key, which is never part of a URL). */
  url;
  /**
   * Seconds the server asked the client to wait before retrying (`Retry-After`), if sent.
   * Present on some 429 and 503 responses.
   */
  retryAfter;
  constructor(init) {
    super(init.message);
    this.status = init.status;
    this.code = init.code;
    this.body = init.body;
    this.headers = init.headers;
    this.method = init.method;
    this.url = init.url;
    this.retryAfter = init.retryAfter;
  }
};
var BadRequestError = class extends APIError {
  name = "BadRequestError";
};
var AuthenticationError = class extends APIError {
  name = "AuthenticationError";
};
var PaymentRequiredError = class extends APIError {
  name = "PaymentRequiredError";
};
var PermissionDeniedError = class extends APIError {
  name = "PermissionDeniedError";
};
var FeatureDisabledError = class extends PermissionDeniedError {
  name = "FeatureDisabledError";
  /** Name of the disabled feature. */
  feature;
  constructor(init) {
    super(init);
    this.feature = init.feature;
  }
};
var NotFoundError = class extends APIError {
  name = "NotFoundError";
};
var ConflictError = class extends APIError {
  name = "ConflictError";
};
var HumanInControlError = class extends ConflictError {
  name = "HumanInControlError";
  /** Until when (Unix ms) the person keeps control at most, when the server sent it. */
  controllerUntil;
  constructor(init) {
    super(init);
    const b = init.body;
    const until = typeof b === "object" && b !== null ? b.controller_until : void 0;
    this.controllerUntil = typeof until === "number" ? until : void 0;
  }
};
var RateLimitError = class extends APIError {
  name = "RateLimitError";
};
var InternalServerError = class extends APIError {
  name = "InternalServerError";
};
var TimeoutError = class extends WBXError {
  name = "TimeoutError";
};
var ConnectionError = class extends WBXError {
  name = "ConnectionError";
  constructor(message, options) {
    super(message, options);
  }
};
var CommandFailedError = class extends WBXError {
  name = "CommandFailedError";
  /** Exit code of the command (-1 when unknown). */
  exitCode;
  /** Captured standard output. */
  stdout;
  /** Captured standard error. */
  stderr;
  /** True when the command was killed because it ran longer than its timeout. */
  timedOut;
  constructor(r) {
    const why = r.timedOut ? "timed out" : `exited with code ${r.exitCode}`;
    const tail = r.stderr.trim().slice(-500);
    super(`command ${why}${tail ? `: ${tail}` : ""}`);
    this.exitCode = r.exitCode;
    this.stdout = r.stdout;
    this.stderr = r.stderr;
    this.timedOut = r.timedOut;
  }
};
var ComputerActionError = class extends WBXError {
  name = "ComputerActionError";
  /** Index of the action that failed (in the list passed to `actions()`). */
  failedIndex;
  /** One entry per performed action, the failed one last. */
  results;
  constructor(message, failedIndex, results) {
    super(message);
    this.failedIndex = failedIndex;
    this.results = results;
  }
};
var StreamLimitError = class extends WBXError {
  name = "StreamLimitError";
  /** The limit that was exceeded (characters). */
  limit;
  constructor(message, limit) {
    super(message);
    this.limit = limit;
  }
};
var IntegrityError = class extends WBXError {
  name = "IntegrityError";
};
function isAbortLike(e) {
  return typeof e === "object" && e !== null && e.name === "AbortError";
}
function errorFromResponse(status, body, headers, method, url) {
  const obj = typeof body === "object" && body !== null ? body : void 0;
  const code = typeof obj?.code === "string" ? obj.code : void 0;
  let message = typeof obj?.error === "string" && obj.error ? obj.error : "";
  if (!message && typeof body === "string" && body.trim()) message = body.trim().slice(0, 500);
  if (!message) message = `HTTP ${status}`;
  const init = {
    status,
    message: `${status} ${message}`,
    code,
    body,
    headers,
    method,
    url,
    retryAfter: parseRetryAfter(headers?.get("retry-after") ?? null)
  };
  switch (status) {
    case 400:
      return new BadRequestError(init);
    case 401:
      return new AuthenticationError(init);
    case 402:
      return new PaymentRequiredError(init);
    case 403:
      if (code === "feature_disabled") {
        return new FeatureDisabledError({ ...init, feature: typeof obj?.feature === "string" ? obj.feature : void 0 });
      }
      return new PermissionDeniedError(init);
    case 404:
      return new NotFoundError(init);
    case 409:
      return code === "human_in_control" ? new HumanInControlError(init) : new ConflictError(init);
    case 429:
      return new RateLimitError(init);
    default:
      return status >= 500 ? new InternalServerError(init) : new APIError(init);
  }
}
function parseRetryAfter(v, now = Date.now()) {
  if (v === null) return void 0;
  const s = v.trim();
  if (s === "") return void 0;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const t = Date.parse(s);
  if (Number.isNaN(t)) return void 0;
  return Math.max(0, (t - now) / 1e3);
}

// ../../sdk/typescript/src/http.ts
var DEFAULT_MAX_STREAM_EVENT_SIZE = 16 * 1024 * 1024;
var INSPECT = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
var RETRY_STATUS = /* @__PURE__ */ new Set([502, 503, 504]);
var BASE_DELAY_MS = 500;
var MAX_BACKOFF_MS = 8e3;
function linkSignal(user, timeoutMs) {
  const ctrl = new AbortController();
  let timedOut = false;
  let timer;
  const onAbort = () => ctrl.abort(abortReason(user));
  if (user) {
    if (user.aborted) ctrl.abort(abortReason(user));
    else user.addEventListener("abort", onAbort, { once: true });
  }
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort(new DOMException("The operation timed out", "TimeoutError"));
    }, timeoutMs);
  }
  return {
    signal: ctrl.signal,
    timedOut: () => timedOut,
    release: () => {
      if (timer !== void 0) clearTimeout(timer);
      timer = void 0;
      user?.removeEventListener("abort", onAbort);
    }
  };
}
function replayable(body) {
  if (body === void 0 || body === null) return true;
  if (typeof body === "string") return true;
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return true;
  if (typeof Blob !== "undefined" && body instanceof Blob) return true;
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) return true;
  return false;
}
function backoffMs(attempt, random = Math.random) {
  const cap = Math.min(MAX_BACKOFF_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.round(cap / 2 + random() * (cap / 2));
}
function buildURL(base, path, query) {
  let url = base.replace(/\/+$/, "") + path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== void 0) qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += (url.includes("?") ? "&" : "?") + s;
  }
  return url;
}
async function readErrorBody(resp) {
  let text;
  try {
    text = await resp.text();
  } catch {
    return void 0;
  }
  if (!text) return void 0;
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
  }
  return text;
}
var Transport = class {
  /** Settings of the transport. The API key is not part of them. */
  config;
  #apiKey;
  constructor(config) {
    const { apiKey, maxStreamEventSize, ...rest } = config;
    this.#apiKey = apiKey;
    this.config = { ...rest, headers: { ...rest.headers }, maxStreamEventSize: maxStreamEventSize ?? DEFAULT_MAX_STREAM_EVENT_SIZE };
  }
  /** Whether an API key is configured (the key itself is never exposed). */
  get hasApiKey() {
    return this.#apiKey !== "";
  }
  /** A description without the API key (and without header values, which may hold secrets too). */
  toJSON() {
    return {
      baseURL: this.config.baseURL,
      hasApiKey: this.hasApiKey,
      timeoutMs: this.config.timeoutMs,
      maxRetries: this.config.maxRetries,
      headers: Object.keys(this.config.headers)
    };
  }
  /** `util.inspect()` / `console.log()` output: the same as {@link toJSON}. @internal */
  [INSPECT]() {
    return `Transport ${JSON.stringify(this.toJSON())}`;
  }
  /** Sends a request and returns the successful response with its body unread. @internal */
  async send(spec) {
    const cfg = this.config;
    const opts = spec.options ?? {};
    const method = spec.method;
    const url = buildURL(cfg.baseURL, spec.path, spec.query);
    const headers = {
      Accept: "application/json, */*",
      ...cfg.headers,
      ...spec.headers,
      ...opts.headers
    };
    if (spec.auth !== false) {
      if (!this.#apiKey) {
        throw new AuthenticationError({
          status: 401,
          message: "missing API key \u2013 pass { apiKey } to new WBX() or set the WBXSANDBOX_API_KEY environment variable",
          method,
          url
        });
      }
      headers["X-API-Key"] = this.#apiKey;
    }
    let body = spec.body;
    if (spec.json !== void 0) {
      body = JSON.stringify(spec.json);
      headers["Content-Type"] = "application/json";
    } else if (body !== void 0) {
      headers["Content-Type"] = spec.contentType ?? "application/octet-stream";
    }
    const canReplay = replayable(body);
    const idempotent = spec.idempotent ?? (method === "GET" || method === "HEAD" || method === "DELETE" || method === "PUT" && canReplay);
    const retries = idempotent && canReplay ? Math.max(0, opts.maxRetries ?? cfg.maxRetries) : 0;
    const timeoutMs = opts.timeoutMs ?? spec.defaultTimeoutMs ?? cfg.timeoutMs;
    for (let attempt = 0; ; attempt++) {
      if (opts.signal?.aborted) throw abortReason(opts.signal);
      const link = linkSignal(opts.signal, timeoutMs);
      let resp;
      try {
        const init = { method, headers, signal: link.signal, redirect: "manual" };
        if (body !== void 0) init.body = body;
        if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) init.duplex = "half";
        resp = await cfg.fetch(url, init);
      } catch (e) {
        link.release();
        if (opts.signal?.aborted) throw abortReason(opts.signal);
        const err2 = link.timedOut() ? new TimeoutError(`${method} ${spec.path} timed out after ${timeoutMs} ms`) : new ConnectionError(`cannot reach ${cfg.baseURL}: ${errMessage(e)}`, { cause: e });
        if (attempt < retries) {
          await sleep(backoffMs(attempt), opts.signal);
          continue;
        }
        throw err2;
      }
      if (resp.type === "opaqueredirect" || resp.status >= 300 && resp.status < 400) {
        link.release();
        const to = resp.headers.get("location");
        throw new ConnectionError(
          `${method} ${spec.path}: the server at ${cfg.baseURL} answered with a redirect${to ? ` to ${to}` : ""} \u2013 redirects are not followed so the API key is never sent to another address; set the API address to the final one`
        );
      }
      if (resp.ok) {
        return {
          response: resp,
          signal: link.signal,
          release: link.release
        };
      }
      let errBody;
      try {
        errBody = await readErrorBody(resp);
      } finally {
        link.release();
      }
      if (opts.signal?.aborted) throw abortReason(opts.signal);
      const err = errorFromResponse(resp.status, errBody, resp.headers, method, url);
      const delay = this.retryDelay(err, attempt, retries);
      if (delay !== void 0) {
        await sleep(delay, opts.signal);
        continue;
      }
      throw err;
    }
  }
  /** Delay before the next attempt, or undefined when the error must not be retried. */
  retryDelay(err, attempt, retries) {
    if (attempt >= retries) return void 0;
    const retryAfterMs = err.retryAfter !== void 0 ? err.retryAfter * 1e3 : void 0;
    let retry = false;
    if (RETRY_STATUS.has(err.status)) retry = true;
    if (err.status === 429 && (retryAfterMs !== void 0 || err.code === "too_many_waiters")) retry = true;
    if (!retry) return void 0;
    if (retryAfterMs !== void 0) {
      if (retryAfterMs > this.config.maxRetryDelayMs) return void 0;
      return retryAfterMs;
    }
    return backoffMs(attempt);
  }
  /**
   * Sends a request and reads the body with the same timeout: JSON when the response is JSON,
   * otherwise the bytes; `undefined` for an empty body (204).
   * @internal
   */
  async json(spec) {
    const raw = await this.send(spec);
    try {
      const text = await raw.response.text();
      let data = void 0;
      if (text) {
        const ct = raw.response.headers.get("content-type") ?? "";
        if (ct.includes("json") || /^\s*[[{"]/.test(text)) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            if (ct.includes("json")) throw new WBXError(`invalid JSON in the response of ${spec.method} ${spec.path}: ${errMessage(e)}`);
            data = text;
          }
        } else {
          data = text;
        }
      }
      return { data, headers: raw.response.headers, status: raw.response.status };
    } catch (e) {
      throw this.readError(e, raw, spec);
    } finally {
      raw.release();
    }
  }
  /** Sends a request and reads the whole body as bytes. @internal */
  async bytes(spec) {
    const raw = await this.send(spec);
    try {
      const buf = await raw.response.arrayBuffer();
      return { data: new Uint8Array(buf), headers: raw.response.headers };
    } catch (e) {
      throw this.readError(e, raw, spec);
    } finally {
      raw.release();
    }
  }
  /** Sends a request and returns the response body as a stream (no timeout once it started). @internal */
  async stream(spec) {
    const raw = await this.send(spec);
    raw.release();
    const userSignal = spec.options?.signal;
    if (!raw.response.body) {
      return { body: new ReadableStream({ start: (c) => c.close() }), headers: raw.response.headers, release: () => {
      } };
    }
    let reader;
    let ctrl;
    const src = raw.response.body;
    const onAbort = () => {
      const reason = userSignal ? abortReason(userSignal) : void 0;
      try {
        ctrl?.error(reason);
      } catch {
      }
      void (reader ?? src).cancel(reason).catch(() => {
      });
    };
    const body = new ReadableStream({
      start(c) {
        ctrl = c;
        reader = src.getReader();
        if (userSignal?.aborted) onAbort();
        else userSignal?.addEventListener("abort", onAbort, { once: true });
      },
      async pull(c) {
        try {
          const r = await reader.read();
          if (userSignal?.aborted) return;
          if (r.done) {
            userSignal?.removeEventListener("abort", onAbort);
            c.close();
          } else {
            c.enqueue(r.value);
          }
        } catch (e) {
          userSignal?.removeEventListener("abort", onAbort);
          if (userSignal?.aborted) return;
          c.error(new ConnectionError(`the response stream of ${spec.method} ${spec.path} broke: ${errMessage(e)}`, { cause: e }));
        }
      },
      async cancel(reason) {
        userSignal?.removeEventListener("abort", onAbort);
        await reader?.cancel(reason).catch(() => {
        });
      }
    });
    return { body, headers: raw.response.headers, release: () => userSignal?.removeEventListener("abort", onAbort) };
  }
  readError(e, raw, spec) {
    const user = spec.options?.signal;
    if (user?.aborted) return abortReason(user);
    if (e instanceof WBXError) return e;
    if (raw.signal.aborted) {
      return new TimeoutError(`${spec.method} ${spec.path}: the response did not arrive in time`);
    }
    return new ConnectionError(`reading the response of ${spec.method} ${spec.path} failed: ${errMessage(e)}`, { cause: e });
  }
};
function errMessage(e) {
  if (e instanceof Error) {
    const cause = e.cause;
    return cause instanceof Error && cause.message ? `${e.message} (${cause.message})` : e.message;
  }
  return String(e);
}

// ../../sdk/typescript/src/pagination.ts
var Page = class {
  /** Items of this page. */
  items;
  /** Cursor of the next page, `undefined` on the last page. */
  nextCursor;
  fetchPage;
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(items, nextCursor, fetchPage) {
    this.items = items;
    this.nextCursor = nextCursor || void 0;
    this.fetchPage = fetchPage;
  }
  /** Whether another page follows. */
  hasNextPage() {
    return this.nextCursor !== void 0;
  }
  /** Fetches the next page, or returns `undefined` on the last page. */
  async getNextPage() {
    return this.nextCursor === void 0 ? void 0 : this.fetchPage(this.nextCursor);
  }
  /** Yields the items of this page and of all following pages. */
  async *[Symbol.asyncIterator]() {
    let page = this;
    while (page) {
      yield* page.items;
      page = await page.getNextPage();
    }
  }
};

// ../../sdk/typescript/src/types.ts
var TERMINAL_JOB_STATUSES = ["completed", "failed", "cancelled", "expired"];

// ../../sdk/typescript/src/jobs.ts
var ARTIFACT_TIMEOUT_MS = 6e5;
var WAIT_SLICE_S = 60;
function jobBody(p) {
  const body = compact({
    command: p.command,
    template: p.template,
    timeout_s: p.timeoutSeconds,
    cwd: p.cwd,
    env: p.env,
    artifacts: p.artifacts,
    save_artifacts: p.saveArtifacts || void 0,
    required_artifacts: p.requiredArtifacts,
    network: p.network,
    metadata: p.metadata,
    max_cost: p.maxCost === void 0 ? void 0 : String(p.maxCost),
    webhook_url: p.webhookUrl,
    idempotency_key: p.idempotencyKey,
    placement: p.placement,
    compute_class: p.computeClass,
    dependency_cache: p.dependencyCache,
    optimize_for: p.optimizeFor,
    runtime: p.runtime,
    depends_on: p.dependsOn
  });
  if (p.retry) body["retry"] = compact({ max_attempts: p.retry.maxAttempts, on: p.retry.on ?? "system" });
  if (p.inputs) {
    body["inputs"] = p.inputs.map(
      (i) => "jobId" in i ? compact({ job_id: i.jobId, name: i.name, as: i.as }) : compact({ from_index: i.fromIndex, name: i.name, as: i.as })
    );
  }
  if (p.wasm) {
    body["runtime"] = p.runtime ?? "wasi";
    body["wasm"] = compact({
      module_b64: p.wasm.module ? bytesToBase64(p.wasm.module) : void 0,
      module: p.wasm.moduleInput,
      args: p.wasm.args,
      stdin: p.wasm.stdin,
      memory_mb: p.wasm.memoryMb
    });
  }
  return body;
}
var Job = class _Job {
  /** Job ID (`job_…`). */
  id;
  /** The API record as last seen. */
  data;
  /** True when the submission was answered from an earlier one with the same idempotency key. */
  replayed;
  t;
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, data, replayed = false) {
    this.t = t;
    this.id = data.id;
    this.data = data;
    this.replayed = replayed;
  }
  /** Status as last seen. */
  get status() {
    return this.data.status;
  }
  /** Whether the job ended (`completed`, `failed`, `cancelled` or `expired`). */
  get done() {
    return TERMINAL_JOB_STATUSES.includes(this.data.status);
  }
  p(rest = "") {
    return `/v1/jobs/${encodeURIComponent(this.id)}${rest}`;
  }
  /** Reloads the job record. */
  async refresh(options) {
    this.data = (await this.t.json({ method: "GET", path: this.p(), options })).data;
    return this;
  }
  /** Short status: state, exit code, duration, cost, file names, last log lines, test results. */
  async summary(options) {
    return (await this.t.json({ method: "GET", path: this.p("/summary"), options })).data;
  }
  /**
   * Waits until the job ends, using server-side waiting (it reacts within a second without
   * polling). Returns the job with fresh `data`.
   */
  async wait(options = {}) {
    await waitUntil(this.t, options, async () => (await this.refresh({ signal: options.signal })).done, { job_ids: [this.id] }, `job ${this.id}`, () => this.status);
    return this;
  }
  /** A chunk of the log. Negative `offset` counts from the end. Continue from `next_offset`. */
  async logs(options = {}) {
    const { offset, limit, ...rest } = options;
    return (await this.t.json({ method: "GET", path: this.p("/logs"), query: { offset, limit }, options: rest })).data;
  }
  /**
   * A compact log for a model's context: `summary` (test results, errors and the end of the
   * log), `errors` or `tail`.
   */
  async digest(options = {}) {
    const { mode = "summary", maxChars, ...rest } = options;
    return (await this.t.json({ method: "GET", path: this.p("/logs"), query: { mode, max_chars: maxChars }, options: rest })).data;
  }
  /** The whole stored log as text. */
  async logText(options) {
    const out = [];
    let off = 0;
    for (; ; ) {
      const c = await this.logs({ ...options, offset: off, limit: 1 << 20 });
      out.push(c.data);
      if (c.next_offset <= off || c.next_offset >= c.size) return out.join("");
      off = c.next_offset;
    }
  }
  /**
   * Yields new log text as the job runs, until it ends.
   *
   * ```ts
   * for await (const text of job.follow()) process.stdout.write(text);
   * ```
   */
  async *follow(options = {}) {
    let off = options.offset ?? 0;
    const poll = options.pollIntervalMs ?? 2e3;
    for (; ; ) {
      const c = await this.logs({ offset: off, signal: options.signal });
      if (c.data) yield c.data;
      off = c.next_offset;
      if (c.complete) return;
      if (!c.data) await sleep(poll, options.signal);
    }
  }
  /** The execution receipt: inputs, template build, runtime, exit code, measured usage, file checksums, cost. */
  async receipt(options) {
    const { data } = await this.t.json({ method: "GET", path: this.p("/receipt"), options });
    return data.execution_receipt;
  }
  /**
   * The receipt signed by WBX (Ed25519) – only after the job ended (otherwise
   * {@link ConflictError} `receipt_not_final`). The signature proves WBX issued the receipt
   * unchanged, not that the computation could not have been altered.
   */
  async signedReceipt(options) {
    const { data } = await this.t.json({ method: "GET", path: this.p("/receipt"), query: { signed: 1 }, options });
    return data.signed_receipt;
  }
  /** The stored result files with sizes and SHA-256 sums, and files that were skipped. */
  async artifacts(options) {
    return (await this.t.json({ method: "GET", path: this.p("/artifacts"), options })).data;
  }
  /**
   * Downloads a result file and verifies its SHA-256 sum against the `X-WBX-SHA256` header the
   * server sends with every artifact. `name` is the artifact name, e.g. `output/result.json`.
   *
   * With `verify: true` (the default) it throws {@link IntegrityError} when the sum does not
   * match, and also when the header is missing or malformed (for example removed by a proxy) –
   * an unverifiable file is never returned as verified. Pass `verify: false` to skip the check.
   */
  async download(name, options = {}) {
    const { verify = true, ...rest } = options;
    const { data, headers } = await this.t.bytes({
      method: "GET",
      path: this.p(`/artifacts/${encodePath(name)}`),
      headers: { Accept: "application/octet-stream" },
      defaultTimeoutMs: ARTIFACT_TIMEOUT_MS,
      options: rest
    });
    if (verify) {
      const want = headers.get("x-wbx-sha256")?.trim().toLowerCase();
      if (!want) {
        throw new IntegrityError(`missing checksum for ${name}: the response has no X-WBX-SHA256 header (pass verify: false to skip the check)`);
      }
      if (!/^[0-9a-f]{64}$/.test(want)) throw new IntegrityError(`invalid checksum for ${name}: the X-WBX-SHA256 header is not a SHA-256 hex digest`);
      const got = await sha256Hex(data);
      if (got !== want) throw new IntegrityError(`checksum mismatch for ${name}: expected ${want}, got ${got}`);
    }
    return data;
  }
  /** Downloads a result file as a stream (large files; no checksum verification). */
  async downloadStream(name, options) {
    const { body } = await this.t.stream({
      method: "GET",
      path: this.p(`/artifacts/${encodePath(name)}`),
      headers: { Accept: "application/octet-stream" },
      defaultTimeoutMs: 12e4,
      options
    });
    return body;
  }
  /** Cancels the job (a finished job stays as it is). */
  async cancel(options) {
    this.data = (await this.t.json({ method: "POST", path: this.p("/cancel"), json: {}, idempotent: true, options })).data;
    return this;
  }
  /**
   * Starts a new job with the same inputs. Environment variable values are not stored, so
   * pass `env` again when the original job had some.
   */
  async retry(options = {}) {
    const { env: env2, idempotencyKey: idempotencyKey2 = randomId(), ...rest } = options;
    const { data, headers } = await this.t.json({
      method: "POST",
      path: this.p("/retry"),
      json: { env: env2 ?? {}, idempotency_key: idempotencyKey2 },
      idempotent: true,
      options: rest
    });
    return new _Job(this.t, data, headers.get("idempotent-replay") === "true");
  }
  /** @internal */
  toJSON() {
    return this.data;
  }
};
async function waitUntil(t, o, isDone, ids, what, state) {
  const end = o.timeoutMs !== void 0 ? Date.now() + o.timeoutMs : void 0;
  let serverWait = true;
  for (; ; ) {
    throwIfAborted(o.signal);
    if (await isDone()) return;
    const left = end !== void 0 ? end - Date.now() : WAIT_SLICE_S * 1e3;
    if (left <= 0) throw new TimeoutError(`${what} has not finished (${state()})`);
    if (serverWait) {
      try {
        await t.json({
          method: "POST",
          path: "/v1/jobs/wait",
          json: { job_ids: ids.job_ids ?? [], batch_ids: ids.batch_ids ?? [], until: "all", timeout_s: Math.max(1, Math.min(WAIT_SLICE_S, Math.ceil(left / 1e3))) },
          idempotent: true,
          options: { signal: o.signal, timeoutMs: (WAIT_SLICE_S + 15) * 1e3 }
        });
        continue;
      } catch (e) {
        if (!(e instanceof NotFoundError) || e.code !== void 0) throw e;
        serverWait = false;
      }
    }
    await sleep(Math.min(o.pollIntervalMs ?? 5e3, Math.max(0, left)), o.signal);
  }
}
var Jobs = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /**
   * Submits a background job and returns at once (status `queued`).
   *
   * ```ts
   * const job = await wbx.jobs.create({ command: "python3 analyze.py", saveArtifacts: true, maxCost: "0.10" });
   * await job.wait();
   * console.log((await job.summary()).status);
   * ```
   */
  async create(params, options) {
    if (params.command === void 0 && !params.wasm) throw new WBXError("command is required (or wasm for a WebAssembly job)");
    const body = jobBody({ ...params, idempotencyKey: params.idempotencyKey ?? randomId() });
    const { data, headers } = await this.t.json({ method: "POST", path: "/v1/jobs", json: body, idempotent: true, options });
    return new Job(this.t, data, headers.get("idempotent-replay") === "true");
  }
  /** A job by ID. */
  async get(id, options) {
    const { events, ...rest } = options ?? {};
    const { data } = await this.t.json({
      method: "GET",
      path: `/v1/jobs/${encodeURIComponent(id)}`,
      query: { events: events ? 1 : void 0 },
      options: rest
    });
    return new Job(this.t, data);
  }
  /**
   * Your jobs, newest first (short summaries). Iterate the page with `for await` to go
   * through all pages.
   */
  async list(params = {}, options) {
    const fetchPage = async (cursor) => {
      const { data } = await this.t.json({
        method: "GET",
        path: "/v1/jobs",
        query: {
          status: Array.isArray(params.status) ? params.status.join(",") : params.status,
          batch_id: params.batchId,
          since: params.since === void 0 ? void 0 : toRFC3339(params.since),
          limit: params.limit,
          cursor
        },
        options
      });
      return new Page(data.jobs ?? [], data.next_cursor, fetchPage);
    };
    return fetchPage(params.cursor);
  }
  /**
   * Blocks until any (or all) of the jobs and batches ended, or `timeoutSeconds` (1–60,
   * default 30) passed. One request; call it again to keep waiting.
   */
  async wait(params, options) {
    const timeout = params.timeoutSeconds ?? 30;
    const { data } = await this.t.json({
      method: "POST",
      path: "/v1/jobs/wait",
      json: { job_ids: params.jobIds ?? [], batch_ids: params.batchIds ?? [], until: params.until ?? "any", timeout_s: timeout },
      idempotent: true,
      defaultTimeoutMs: (Math.min(timeout, WAIT_SLICE_S) + 15) * 1e3,
      options
    });
    return data;
  }
};
var Batch = class {
  /** Batch ID (`bat_…`). */
  id;
  /** IDs of the jobs, in the order they were given. */
  jobIds;
  /** The summary as last seen. */
  data;
  /** True when the submission was answered from an earlier one with the same idempotency key. */
  replayed;
  t;
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, data, jobIds, replayed = false) {
    this.t = t;
    this.id = data.id;
    this.data = data;
    this.jobIds = jobIds;
    this.replayed = replayed;
  }
  /** Overall status as last seen: `running`, `completed`, `partial`, `failed` or `cancelled`. */
  get status() {
    return this.data.status;
  }
  /** Whether every job of the batch ended. */
  get done() {
    return this.data.done;
  }
  p(rest = "") {
    return `/v1/batches/${encodeURIComponent(this.id)}${rest}`;
  }
  /** Counts by state, cost, durations and the first errors. */
  async summary(options) {
    this.data = (await this.t.json({ method: "GET", path: this.p(), options })).data;
    return this.data;
  }
  /** The summary plus one row per job (state, exit code, cost, error). */
  async report(options) {
    const r = (await this.t.json({ method: "GET", path: this.p("/report"), options })).data;
    this.data = r.summary;
    return r;
  }
  /** The report as CSV text. */
  async reportCsv(options) {
    const { data } = await this.t.bytes({ method: "GET", path: this.p("/report"), query: { format: "csv" }, headers: { Accept: "text/csv" }, options });
    return new TextDecoder().decode(data);
  }
  /** Summaries of the batch's jobs (paged; iterate with `for await`). */
  listJobs(params = {}, options) {
    return new Jobs(this.t).list({ ...params, batchId: this.id }, options);
  }
  /** Waits until every job of the batch ended (server-side waiting). */
  async wait(options = {}) {
    await waitUntil(this.t, options, async () => (await this.summary({ signal: options.signal })).done, { batch_ids: [this.id] }, `batch ${this.id}`, () => this.status);
    return this;
  }
  /** Cancels jobs that have not ended; results of finished jobs are kept. */
  async cancel(options) {
    this.data = (await this.t.json({ method: "POST", path: this.p("/cancel"), json: {}, idempotent: true, options })).data;
    return this.data;
  }
  /** @internal */
  toJSON() {
    return { ...this.data, job_ids: this.jobIds };
  }
};
var Batches = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /**
   * Submits many jobs at once. Jobs may depend on each other (`dependsOn`, inputs with
   * `fromIndex`); a failed job does not stop independent ones.
   *
   * ```ts
   * const batch = await wbx.batches.create({
   *   jobs: [
   *     { command: "python3 prepare.py", saveArtifacts: true },
   *     { command: "python3 train.py", dependsOn: [0], inputs: [{ fromIndex: 0, name: "output/data.csv" }] },
   *   ],
   *   maxConcurrency: 5,
   *   maxTotalCost: "1.00",
   * });
   * await batch.wait();
   * ```
   */
  async create(params, options) {
    const body = compact({
      name: params.name,
      jobs: params.jobs.map((j) => jobBody(j)),
      defaults: params.defaults ? jobBody(params.defaults) : void 0,
      max_concurrency: params.maxConcurrency,
      max_total_cost: params.maxTotalCost === void 0 ? void 0 : String(params.maxTotalCost),
      idempotency_key: params.idempotencyKey ?? randomId(),
      webhook_url: params.webhookUrl
    });
    const { data, headers } = await this.t.json({
      method: "POST",
      path: "/v1/batches",
      json: body,
      idempotent: true,
      defaultTimeoutMs: 12e4,
      options
    });
    return new Batch(this.t, data.batch, data.job_ids ?? [], headers.get("idempotent-replay") === "true");
  }
  /** A batch by ID (with the IDs of its jobs in order). */
  async get(id, options) {
    const { data } = await this.t.json({ method: "GET", path: `/v1/batches/${encodeURIComponent(id)}/report`, options });
    const ids = [...data.jobs ?? []].sort((a, b) => a.index - b.index).map((r) => r.job_id);
    return new Batch(this.t, data.summary, ids);
  }
  /** Your batches, newest first (summaries; iterate with `for await` for all pages). */
  async list(params = {}, options) {
    const fetchPage = async (cursor) => {
      const { data } = await this.t.json({
        method: "GET",
        path: "/v1/batches",
        query: { since: params.since === void 0 ? void 0 : toRFC3339(params.since), limit: params.limit, cursor },
        options
      });
      return new Page(data.batches ?? [], data.next_cursor, fetchPage);
    };
    return fetchPage(params.cursor);
  }
};

// ../../sdk/typescript/src/streams.ts
var DEFAULT_MAX = 16 * 1024 * 1024;
function limitOf(v) {
  return v !== void 0 && v > 0 ? v : DEFAULT_MAX;
}
var SSEParser = class {
  buf = "";
  /** Characters at the start of `buf` already known to hold no line end. */
  scanned = 0;
  skipLF = false;
  started = false;
  event = "";
  data = [];
  dataSize = 0;
  hasData = false;
  id;
  retry;
  /** Number of comment lines seen (keep-alive pings such as `: ping`). */
  comments = 0;
  /** Longest event or line in characters. */
  maxEventSize;
  constructor(options = {}) {
    this.maxEventSize = limitOf(options.maxEventSize);
  }
  /** Feeds a chunk of text; returns the events completed by it. */
  push(chunk) {
    if (!this.started && chunk.length > 0) {
      this.started = true;
      if (chunk.charCodeAt(0) === 65279) chunk = chunk.slice(1);
    }
    if (this.skipLF && chunk.startsWith("\n")) chunk = chunk.slice(1);
    this.skipLF = false;
    this.buf += chunk;
    const out = [];
    let start = 0;
    for (let i = this.scanned; i < this.buf.length; i++) {
      const c = this.buf.charCodeAt(i);
      if (c !== 10 && c !== 13) continue;
      if (i - start > this.maxEventSize) this.tooLong();
      const line = this.buf.slice(start, i);
      if (c === 13) {
        if (i + 1 < this.buf.length) {
          if (this.buf.charCodeAt(i + 1) === 10) i++;
        } else {
          this.skipLF = true;
        }
      }
      start = i + 1;
      const ev = this.line(line);
      if (ev) out.push(ev);
    }
    this.buf = this.buf.slice(start);
    this.scanned = this.buf.length;
    if (this.buf.length > this.maxEventSize || this.dataSize + this.buf.length > this.maxEventSize) this.tooLong();
    return out;
  }
  tooLong() {
    this.reset();
    throw new StreamLimitError(`a Server-Sent Event is longer than ${this.maxEventSize} characters \u2013 stopped reading the stream`, this.maxEventSize);
  }
  reset() {
    this.buf = "";
    this.scanned = 0;
    this.data = [];
    this.dataSize = 0;
    this.hasData = false;
    this.event = "";
  }
  /** Ends the stream. An event without its terminating blank line is discarded (per spec). */
  end() {
    this.reset();
    return [];
  }
  line(line) {
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) {
      this.comments++;
      return void 0;
    }
    const colon = line.indexOf(":");
    let field = line;
    let value = "";
    if (colon >= 0) {
      field = line.slice(0, colon);
      value = line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
    }
    switch (field) {
      case "event":
        this.event = value;
        break;
      case "data":
        this.dataSize += value.length + (this.hasData ? 1 : 0);
        if (this.dataSize > this.maxEventSize) this.tooLong();
        this.data.push(value);
        this.hasData = true;
        break;
      case "id":
        if (!value.includes("\0")) this.id = value;
        break;
      case "retry":
        if (/^\d+$/.test(value)) this.retry = Number(value);
        break;
      default:
        break;
    }
    return void 0;
  }
  dispatch() {
    const retry = this.retry;
    this.retry = void 0;
    if (!this.hasData) {
      this.event = "";
      return void 0;
    }
    const ev = { event: this.event || "message", data: this.data.join("\n") };
    if (this.id !== void 0) ev.id = this.id;
    if (retry !== void 0) ev.retry = retry;
    this.event = "";
    this.data = [];
    this.dataSize = 0;
    this.hasData = false;
    return ev;
  }
};
async function* readChunks(body) {
  const reader = body.getReader();
  let done = false;
  try {
    for (; ; ) {
      const r = await reader.read();
      if (r.done) {
        done = true;
        return;
      }
      if (r.value && r.value.length > 0) yield r.value;
    }
  } finally {
    if (!done) {
      try {
        await reader.cancel();
      } catch {
      }
    }
    reader.releaseLock();
  }
}
async function* readText(body) {
  const dec = new TextDecoder();
  for await (const chunk of readChunks(body)) {
    const s = dec.decode(chunk, { stream: true });
    if (s) yield s;
  }
  const tail = dec.decode();
  if (tail) yield tail;
}
async function* readNDJSON(body, options = {}) {
  const max = limitOf(options.maxLineSize);
  const tooLong = () => new StreamLimitError(`an NDJSON line is longer than ${max} characters \u2013 stopped reading the stream`, max);
  let buf = "";
  for await (const s of readText(body)) {
    let from = buf.length;
    buf += s;
    let start = 0;
    let nl;
    while ((nl = buf.indexOf("\n", from)) >= 0) {
      if (nl - start > max) throw tooLong();
      const line = buf.slice(start, nl).trim();
      start = from = nl + 1;
      if (line) yield JSON.parse(line);
    }
    if (start > 0) buf = buf.slice(start);
    if (buf.length > max) throw tooLong();
  }
  const last = buf.trim();
  if (last) yield JSON.parse(last);
}
async function* readSSE(body, parser = new SSEParser()) {
  for await (const s of readText(body)) {
    for (const ev of parser.push(s)) yield ev;
  }
  for (const ev of parser.end()) yield ev;
}

// ../../sdk/typescript/src/snapshots.ts
var Snapshot = class {
  /** Snapshot ID (`snap_…`). */
  id;
  /** The API record (snake_case fields). */
  info;
  t;
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, info) {
    this.t = t;
    this.id = info.id;
    this.info = info;
  }
  /** Name given when the snapshot was taken. */
  get name() {
    return this.info.name || void 0;
  }
  /** ID of the sandbox the snapshot was taken from. */
  get sourceSandbox() {
    return this.info.source_sandbox || void 0;
  }
  /** Template of the source sandbox (a sandbox from this snapshot gets it too). */
  get template() {
    return this.info.template;
  }
  /** Space the snapshot takes in bytes (billed as storage). */
  get sizeBytes() {
    return this.info.size_bytes ?? 0;
  }
  /** When the snapshot was taken. */
  get createdAt() {
    return this.info.created_at ? new Date(this.info.created_at) : void 0;
  }
  /** Starts a new sandbox from this snapshot (same options as `wbx.sandboxes.create()`). */
  createSandbox(params = {}, options) {
    return new Sandboxes(this.t).create({ ...params, fromSnapshot: this.id }, options);
  }
  /** Deletes the snapshot. No error when it is already gone; sandboxes created from it are not affected. */
  async delete(options) {
    await new Snapshots(this.t).delete(this.id, options);
  }
  /** @internal */
  toJSON() {
    return this.info;
  }
};
var Snapshots = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /** Your snapshots (all at once, no pages). */
  async list(options) {
    const { data } = await this.t.json({ method: "GET", path: "/v1/snapshots", options });
    const rows = Array.isArray(data) ? data : data?.snapshots ?? [];
    return rows.map((d) => new Snapshot(this.t, d));
  }
  /** One snapshot by its ID (`NotFoundError` when it does not exist or is not yours). */
  async get(id, options) {
    const { data } = await this.t.json({ method: "GET", path: `/v1/snapshots/${encodeURIComponent(id)}`, options });
    return new Snapshot(this.t, data);
  }
  /** Deletes a snapshot by ID. No error when it is already gone. */
  async delete(id, options) {
    try {
      await this.t.json({ method: "DELETE", path: `/v1/snapshots/${encodeURIComponent(id)}`, options });
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
};

// ../../sdk/typescript/src/sandbox.ts
var CREATE_TIMEOUT_MS = 15e4;
var FILE_TIMEOUT_MS = 3e5;
var DEFAULT_COMMAND_TIMEOUT_MS = 6e4;
var COMPUTER_ACTIONS_TIMEOUT_MS = 3e5;
var EXEC_GRACE_MS = 3e4;
var SNAPSHOT_TIMEOUT_MS = 63e4;
var FROM_SNAPSHOT_TIMEOUT_MS = 3e5;
var CLONE_TIMEOUT_MS = 93e4;
function createBody(params) {
  return compact({
    timeout_s: params.timeoutSeconds,
    name: params.name,
    on_timeout: params.onTimeout,
    idle_timeout_s: params.idleTimeoutSeconds,
    keep_days: params.keepDays,
    metadata: params.metadata,
    env: params.env,
    vcpu: params.vcpu,
    mem_mb: params.memMb,
    compute_class: params.computeClass,
    optimize_for: params.optimizeFor,
    placement: params.placement,
    dependency_cache: params.dependencyCache,
    network: params.network
  });
}
var CommandResult = class {
  /** Exit code (-1 when unknown). */
  exitCode;
  stdout;
  stderr;
  durationMs;
  /** The command was killed because it ran longer than its timeout. */
  timedOut;
  /** Output longer than the server limit (16 MB per stream) was cut off. */
  truncated;
  constructor(r) {
    this.exitCode = r.exitCode;
    this.stdout = r.stdout;
    this.stderr = r.stderr;
    this.durationMs = r.durationMs ?? 0;
    this.timedOut = r.timedOut ?? false;
    this.truncated = r.truncated ?? false;
  }
  /** Exit code 0 and no timeout. */
  get ok() {
    return this.exitCode === 0 && !this.timedOut;
  }
  /** Throws {@link CommandFailedError} unless the command succeeded; returns the result otherwise. */
  check() {
    if (!this.ok) throw new CommandFailedError(this);
    return this;
  }
};
function execBody(cmd2, o, timeoutMs) {
  return compact({
    cmd: cmd2,
    env: o.env,
    cwd: o.cwd,
    timeout_ms: Math.max(0, Math.floor(timeoutMs)),
    stdin: o.stdin,
    max_output: o.maxOutputBytes
  });
}
function httpTimeout(o, commandMs) {
  if (o.requestTimeoutMs !== void 0) return o.requestTimeoutMs;
  return commandMs > 0 ? commandMs + EXEC_GRACE_MS : 0;
}
var Commands = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, id) {
    this.t = t;
    this.id = id;
  }
  t;
  id;
  /**
   * Runs a shell command (`/bin/sh -c`) and waits for it to finish.
   *
   * ```ts
   * const r = await sandbox.commands.run("python3 --version");
   * console.log(r.exitCode, r.stdout);
   * await sandbox.commands.run("make test").then((r) => r.check());
   * ```
   *
   * A command that exits with a non-zero code is a normal result, not an exception – use
   * `result.check()` to turn it into a {@link CommandFailedError}. With `onStdout` / `onStderr`
   * the output is streamed while the command runs.
   */
  async run(cmd2, options = {}) {
    const commandMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    if (options.onStdout || options.onStderr) {
      const out = [];
      const err = [];
      let exit;
      for await (const ev of this.stream(cmd2, { ...options, timeoutMs: commandMs })) {
        if (ev.type === "stdout") {
          out.push(ev.data);
          options.onStdout?.(ev.data);
        } else if (ev.type === "stderr") {
          err.push(ev.data);
          options.onStderr?.(ev.data);
        } else if (ev.type === "exit") {
          exit = ev;
        }
      }
      if (!exit) throw new WBXError("the command stream ended without an exit event (connection lost?)");
      return new CommandResult({
        exitCode: exit.exit_code,
        stdout: out.join(""),
        stderr: err.join(""),
        durationMs: exit.duration_ms,
        timedOut: exit.timed_out
      });
    }
    const { data } = await this.t.json({
      method: "POST",
      path: `/v1/sandboxes/${enc(this.id)}/exec`,
      json: execBody(cmd2, options, commandMs),
      idempotent: false,
      options: { signal: options.signal, timeoutMs: httpTimeout(options, commandMs) }
    });
    return new CommandResult({
      exitCode: data.exit_code,
      stdout: data.stdout,
      stderr: data.stderr,
      durationMs: data.duration_ms,
      timedOut: data.timed_out,
      truncated: data.truncated
    });
  }
  /**
   * Runs a command and yields its events as they happen: `start` (with `pid`), `stdout`,
   * `stderr` and finally `exit`. Breaking out of the loop or aborting the signal disconnects,
   * which kills the command.
   *
   * ```ts
   * for await (const ev of sandbox.commands.stream("pip install pandas")) {
   *   if (ev.type === "stdout") process.stdout.write(ev.data);
   *   if (ev.type === "exit") console.log("exit code", ev.exit_code);
   * }
   * ```
   */
  async *stream(cmd2, options = {}) {
    const commandMs = options.timeoutMs ?? 0;
    const { body, release } = await this.t.stream({
      method: "POST",
      path: `/v1/sandboxes/${enc(this.id)}/exec/stream`,
      json: execBody(cmd2, options, commandMs),
      idempotent: false,
      headers: { Accept: "application/x-ndjson" },
      options: { signal: options.signal, timeoutMs: options.requestTimeoutMs ?? 12e4 }
    });
    try {
      yield* readNDJSON(body, { maxLineSize: this.t.config.maxStreamEventSize });
    } finally {
      release();
    }
  }
};
var Files = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, id) {
    this.t = t;
    this.id = id;
  }
  t;
  id;
  p(rest) {
    return `/v1/sandboxes/${enc(this.id)}${rest}`;
  }
  /** Downloads a file as bytes. */
  async read(path, options) {
    const { data } = await this.t.bytes({
      method: "GET",
      path: this.p("/files"),
      query: { path },
      headers: { Accept: "application/octet-stream" },
      defaultTimeoutMs: FILE_TIMEOUT_MS,
      options
    });
    return data;
  }
  /** Downloads a text file (UTF-8). */
  async readText(path, options) {
    return new TextDecoder().decode(await this.read(path, options));
  }
  /** Downloads a file as a stream – for large files. `options.timeoutMs` limits only the start. */
  async readStream(path, options) {
    const { body } = await this.t.stream({
      method: "GET",
      path: this.p("/files"),
      query: { path },
      headers: { Accept: "application/octet-stream" },
      defaultTimeoutMs: 12e4,
      options
    });
    return body;
  }
  /**
   * Uploads a file; missing directories are created and an existing file is replaced.
   * Text is written as UTF-8. A `ReadableStream` is streamed without buffering (it cannot be
   * retried).
   */
  async write(path, data, options) {
    const body = typeof data === "string" ? utf8(data) : data;
    const { data: res } = await this.t.json({
      method: "PUT",
      path: this.p("/files"),
      query: { path },
      body,
      contentType: "application/octet-stream",
      defaultTimeoutMs: FILE_TIMEOUT_MS,
      options
    });
    return res;
  }
  /**
   * Lists a directory: name, path, type, size, permissions and modification time of each
   * entry. `depth` (1–5) also lists subdirectories.
   */
  async list(path = "/home/user", options = {}) {
    const { depth, ...rest } = options;
    const { data } = await this.t.json({ method: "GET", path: this.p("/fs/list"), query: { path, depth }, options: rest });
    return data;
  }
  /** Details of a file or directory. Throws {@link NotFoundError} when it does not exist. */
  async stat(path, options) {
    const { data } = await this.t.json({ method: "GET", path: this.p("/fs/stat"), query: { path }, options });
    return data;
  }
  /** Whether a file or directory exists. */
  async exists(path, options) {
    try {
      await this.stat(path, options);
      return true;
    } catch (e) {
      if (e instanceof NotFoundError && !/sandbox not found/i.test(e.message)) return false;
      throw e;
    }
  }
  /** Creates a directory (with missing parents unless `parents: false`). An existing directory is not an error. */
  async mkdir(path, options = {}) {
    const { parents = true, ...rest } = options;
    const { data } = await this.t.json({
      method: "POST",
      path: this.p("/fs/mkdir"),
      json: { path, parents },
      idempotent: parents,
      // creating an existing directory with parents is not an error
      options: rest
    });
    return data;
  }
  /** Moves or renames a file or directory. Refused with {@link ConflictError} when `to` exists, unless `overwrite`. */
  async move(from, to, options = {}) {
    const { overwrite = false, ...rest } = options;
    const { data } = await this.t.json({
      method: "POST",
      path: this.p("/fs/move"),
      json: { from, to, overwrite },
      options: rest
    });
    return data;
  }
  /**
   * Deletes a file or an empty directory; `recursive: true` deletes a directory with its
   * contents. Throws {@link NotFoundError} when the path does not exist.
   */
  async remove(path, options = {}) {
    const { recursive = false, ...rest } = options;
    await this.t.json({
      method: "POST",
      path: this.p("/fs/remove"),
      json: { path, recursive },
      options: rest
    });
  }
  /**
   * Watches a path for changes and yields events (`start`, then `create`, `write`, `remove`,
   * `rename`, `chmod`). Stop by breaking out of the loop or aborting the signal.
   */
  async *watch(path, options = {}) {
    const { body, release } = await this.t.stream({
      method: "GET",
      path: this.p("/fs/watch"),
      query: { path, recursive: options.recursive ? "true" : void 0 },
      headers: { Accept: "application/x-ndjson" },
      options: { signal: options.signal, timeoutMs: 6e4 }
    });
    try {
      yield* readNDJSON(body, { maxLineSize: this.t.config.maxStreamEventSize });
    } finally {
      release();
    }
  }
};
var Processes = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, id) {
    this.t = t;
    this.id = id;
  }
  t;
  id;
  p(rest = "") {
    return `/v1/sandboxes/${enc(this.id)}/process${rest}`;
  }
  /** Starts a process in the background and returns its PID. */
  async start(cmd2, options = {}) {
    const { env: env2, cwd, tag, pty, stdin, ...rest } = options;
    const { data } = await this.t.json({
      method: "POST",
      path: this.p(),
      json: compact({ cmd: cmd2, env: env2, cwd, tag, pty, stdin }),
      options: rest
    });
    return data;
  }
  /** Running and recently finished processes (finished ones are kept for 10 minutes). */
  async list(options) {
    return (await this.t.json({ method: "GET", path: this.p(), options })).data;
  }
  /** Details of one process. */
  async get(pid, options) {
    return (await this.t.json({ method: "GET", path: this.p(`/${pid}`), options })).data;
  }
  /**
   * Output of a process: what it printed so far (unless `replay: false`), then live output,
   * then an `exit` event. `lagged` means a slow reader skipped some output.
   */
  async *stream(pid, options = {}) {
    const { body, release } = await this.t.stream({
      method: "GET",
      path: this.p(`/${pid}/stream`),
      query: { replay: options.replay === false ? "false" : void 0 },
      headers: { Accept: "application/x-ndjson" },
      options: { signal: options.signal, timeoutMs: 6e4 }
    });
    try {
      yield* readNDJSON(body, { maxLineSize: this.t.config.maxStreamEventSize });
    } finally {
      release();
    }
  }
  /** Writes to the process's standard input (text as UTF-8, or bytes); `eof: true` closes it. */
  async sendStdin(pid, data, options = {}) {
    const { eof, ...rest } = options;
    const json = typeof data === "string" ? { data, eof: !!eof } : { data_b64: bytesToBase64(data), eof: !!eof };
    await this.t.json({ method: "POST", path: this.p(`/${pid}/stdin`), json, options: rest });
  }
  /** Sends a signal to the process group. */
  async signal(pid, signal, options) {
    await this.t.json({ method: "POST", path: this.p(`/${pid}/signal`), json: { signal }, idempotent: true, options });
  }
  /** Resizes the terminal of a PTY process. */
  async resize(pid, cols, rows, options) {
    await this.t.json({ method: "POST", path: this.p(`/${pid}/resize`), json: { cols, rows }, idempotent: true, options });
  }
  /** Kills the process and its whole process group (SIGKILL). */
  async kill(pid, options) {
    await this.t.json({ method: "DELETE", path: this.p(`/${pid}`), options });
  }
};
var STABLE_STREAM_MS = 3e4;
var Metrics = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, id) {
    this.t = t;
    this.id = id;
  }
  t;
  id;
  /** CPU, memory and disk use now, measured inside the VM (takes ~200 ms). */
  async get(options) {
    return (await this.t.json({ method: "GET", path: `/v1/sandboxes/${enc(this.id)}/metrics`, options })).data;
  }
  /**
   * Samples of the last hour (every 10 s): CPU, memory, network and disk I/O. Feature
   * `metrics_history`. Does not wake a sleeping sandbox (it returns no samples then).
   * Limited to 30 calls a minute per sandbox (429 `rate_limited`, retried after `Retry-After`).
   */
  async history(options = {}) {
    const { since, ...rest } = options;
    return (await this.t.json({
      method: "GET",
      path: `/v1/sandboxes/${enc(this.id)}/metrics/history`,
      query: { since: since === void 0 ? void 0 : toUnixMs(since) },
      options: rest
    })).data;
  }
  /**
   * Live samples (Server-Sent Events) as an async iterator. Feature `metrics_history`.
   * At most 10 streams may be opened a minute per sandbox and 10 may run at once per
   * account (429 `rate_limited`).
   *
   * ```ts
   * const ac = new AbortController();
   * for await (const s of sandbox.metrics.stream({ signal: ac.signal, reconnect: true })) {
   *   console.log(new Date(s.t), s.cpu_pct, s.mem_mb);
   * }
   * ```
   */
  async *stream(options = {}) {
    const max = options.maxReconnects ?? 5;
    const perMinute = Math.max(1, Math.floor(options.maxConnectsPerMinute ?? 6));
    let lastT = options.since === void 0 ? -Infinity : toUnixMs(options.since) - 1;
    let failures = 0;
    const opened = [];
    for (; ; ) {
      for (; ; ) {
        const now = Date.now();
        while (opened.length > 0 && now - opened[0] >= 6e4) opened.shift();
        if (opened.length < perMinute) break;
        await sleep(opened[0] + 6e4 - now, options.signal);
      }
      opened.push(Date.now());
      let endReason;
      let openedAt;
      try {
        const since = Number.isFinite(lastT) ? lastT + 1 : void 0;
        const { body, release } = await this.t.stream({
          method: "GET",
          path: `/v1/sandboxes/${enc(this.id)}/metrics/stream`,
          query: { since },
          headers: { Accept: "text/event-stream" },
          options: { signal: options.signal, timeoutMs: 6e4, maxRetries: 0 }
        });
        openedAt = Date.now();
        try {
          for await (const ev of readSSE(body, new SSEParser({ maxEventSize: this.t.config.maxStreamEventSize }))) {
            if (ev.event === "sample") {
              const s = JSON.parse(ev.data);
              if (typeof s.t !== "number" || s.t > lastT) {
                if (typeof s.t === "number") lastT = s.t;
                yield s;
              }
            } else if (ev.event === "state") {
              options.onState?.(JSON.parse(ev.data));
            } else if (ev.event === "end") {
              endReason = parseEnd(ev.data);
              options.onEnd?.(endReason);
              break;
            }
          }
        } finally {
          release();
        }
      } catch (e) {
        if (options.signal?.aborted || isAbortLike(e)) throw e;
        if (!options.reconnect || !retryableStreamError(e)) throw e;
        if (openedAt !== void 0 && Date.now() - openedAt >= STABLE_STREAM_MS) failures = 0;
        if (++failures > max) throw e;
        const ra = e.retryAfter;
        if (typeof ra === "number" && ra > 60) throw e;
        await sleep(typeof ra === "number" ? ra * 1e3 : backoffMs(failures - 1), options.signal);
        continue;
      }
      if (!options.reconnect || options.signal?.aborted) return;
      if (endReason !== void 0 && endReason !== "timeout") return;
      if (Date.now() - openedAt >= STABLE_STREAM_MS) {
        failures = 0;
        if (endReason === void 0) await sleep(backoffMs(0), options.signal);
      } else {
        if (++failures > max) {
          throw new ConnectionError(
            `the metrics stream of ${this.id} ended right after opening ${failures} times in a row \u2013 giving up`
          );
        }
        await sleep(backoffMs(failures - 1), options.signal);
      }
    }
  }
};
function parseEnd(data) {
  try {
    const v = JSON.parse(data);
    return typeof v?.reason === "string" ? v.reason : "ended";
  } catch {
    return "ended";
  }
}
function retryableStreamError(e) {
  if (e instanceof StreamLimitError) return false;
  const status = e.status;
  if (typeof status !== "number") return e instanceof WBXError;
  return status === 429 || status >= 500;
}
function headerInt(h, name) {
  const v = h.get(name);
  if (v === null || !/^\d+$/.test(v.trim())) return void 0;
  return Number(v);
}
var Computer = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, id) {
    this.t = t;
    this.id = id;
  }
  t;
  id;
  p(rest) {
    return `/v1/sandboxes/${enc(this.id)}/computer${rest}`;
  }
  /** Whether the desktop runs, its size and who controls it. */
  async status(options) {
    return (await this.t.json({ method: "GET", path: this.p("/status"), options })).data;
  }
  /** Takes a screenshot. */
  async screenshot(options = {}) {
    const { format, quality, maxWidth, ...rest } = options;
    const { data, headers } = await this.t.bytes({
      method: "GET",
      path: this.p("/screenshot"),
      query: { format, quality, max_width: maxWidth },
      headers: { Accept: "image/png, image/jpeg" },
      options: rest
    });
    const ct = headers.get("content-type") ?? "";
    const shot = {
      data,
      format: ct.includes("jpeg") ? "jpeg" : ct.includes("png") ? "png" : format ?? "png",
      width: headerInt(headers, "x-wbx-width") ?? 0,
      height: headerInt(headers, "x-wbx-height") ?? 0
    };
    const sw = headerInt(headers, "x-wbx-screen-width");
    const sh = headerInt(headers, "x-wbx-screen-height");
    if (sw !== void 0) shot.screenWidth = sw;
    if (sh !== void 0) shot.screenHeight = sh;
    return shot;
  }
  /**
   * Performs a list of actions in order (mouse, keyboard, waits). With `screenshot: true` the
   * result includes a screenshot taken afterwards. Not retried automatically.
   *
   * The server stops at the first action that fails (the ones before it were performed) and
   * reports it with HTTP 200 and `ok: false`: this throws {@link ComputerActionError} with
   * `failedIndex` and `results`, unless `throwOnFailure: false` is passed.
   *
   * The HTTP limit defaults to 5 minutes (not the client's `timeoutMs`): typing long text,
   * waits and queued requests can take more than a minute. Pass `timeoutMs` to change it.
   * The same holds for the shortcuts (`click`, `type`, `key`, `scroll`, …).
   */
  async actions(actions, options = {}) {
    const { screenshot, screenshotFormat, screenshotQuality, screenshotMaxWidth, throwOnFailure = true, ...rest } = options;
    const shotOpts = compact({
      screenshot_format: screenshotFormat,
      screenshot_quality: screenshotQuality,
      screenshot_max_width: screenshotMaxWidth
    });
    if (!screenshot && Object.keys(shotOpts).length > 0) {
      throw new TypeError("screenshotFormat, screenshotQuality and screenshotMaxWidth need screenshot: true");
    }
    const { data } = await this.t.json({
      method: "POST",
      path: this.p("/actions"),
      json: { actions, screenshot: !!screenshot, ...shotOpts },
      defaultTimeoutMs: COMPUTER_ACTIONS_TIMEOUT_MS,
      options: rest
    });
    const ok = data.ok === true;
    const out = { ok, results: data.results ?? [] };
    if (!ok) {
      out.error = typeof data.error === "string" && data.error ? data.error : "a desktop action failed";
      if (typeof data.failed_index === "number") out.failedIndex = data.failed_index;
      if (throwOnFailure) {
        throw new ComputerActionError(out.error, out.failedIndex ?? Math.max(0, out.results.length - 1), out.results);
      }
    }
    if (data.screenshot) {
      out.screenshot = {
        data: base64ToBytes(data.screenshot.data_base64),
        format: data.screenshot.format,
        width: data.screenshot.width,
        height: data.screenshot.height
      };
      if (typeof data.screenshot.screen_width === "number") out.screenshot.screenWidth = data.screenshot.screen_width;
      if (typeof data.screenshot.screen_height === "number") out.screenshot.screenHeight = data.screenshot.screen_height;
    }
    if (typeof data.screenshot_error === "string") out.screenshotError = data.screenshot_error;
    return out;
  }
  /**
   * Sets who controls the desktop and returns the resulting status. With an API key only
   * `agent` is accepted (takes control back); `human` is reserved for a person in the portal
   * and is refused with HTTP 403 `human_only`.
   */
  async control(mode, options = {}) {
    const { ttlSeconds, ...rest } = options;
    const { data } = await this.t.json({
      method: "POST",
      path: this.p("/control"),
      json: compact({ mode, ttl_s: ttlSeconds }),
      idempotent: true,
      options: rest
    });
    return data;
  }
  /** Moves the mouse. */
  move(x, y, options) {
    return this.actions([{ type: "move", x, y }], options);
  }
  /** Clicks at a point (`count: 2` = double click). */
  click(x, y, options = {}) {
    const { button, count, ...rest } = options;
    return this.actions([{ type: "click", x, y, ...compact({ button, count }) }], rest);
  }
  /** Double-clicks at a point. */
  doubleClick(x, y, options = {}) {
    return this.click(x, y, { ...options, count: 2 });
  }
  /** Drags from one point to another. */
  drag(x, y, toX, toY, options = {}) {
    const { button, ...rest } = options;
    return this.actions([{ type: "drag", x, y, to_x: toX, to_y: toY, ...compact({ button }) }], rest);
  }
  /**
   * Scrolls at a point: `dx` wheel steps to the right (negative = left), then `dy` down
   * (negative = up). Note the order `(x, y, dx, dy)` – the Python SDK's `scroll(x, y, dy, dx)`
   * takes dy first, so code ported between the SDKs should pass `0` explicitly, e.g.
   * `scroll(640, 400, 0, 5)` scrolls 5 steps down.
   */
  scroll(x, y, dx, dy, options) {
    return this.actions([{ type: "scroll", x, y, dx, dy }], options);
  }
  /** Types text. */
  type(text, options) {
    return this.actions([{ type: "type", text }], options);
  }
  /** Presses a key or a combination, e.g. `"Return"`, `"ctrl+c"`, `"ctrl+shift+t"`. */
  key(keys, options) {
    return this.actions([{ type: "key", keys }], options);
  }
  /** Waits on the server between actions (milliseconds). */
  wait(ms, options) {
    return this.actions([{ type: "wait", ms }], options);
  }
};
var RUNNERS = { python: [".py", "python3"], node: [".js", "node"], bash: [".sh", "bash"] };
var Sandbox = class _Sandbox {
  /** Sandbox ID (`sb_…`). */
  id;
  /** The API record of the sandbox as last seen. */
  info;
  /** True when `create({ name })` returned an existing sandbox instead of a new one. */
  existing;
  /** Shell commands. */
  commands;
  /** Files. */
  files;
  /** Background processes and terminals. */
  processes;
  /** Resource use (history and live stream need the `metrics_history` feature). */
  metrics;
  /** Desktop control for the `desktop` template (feature `desktop`). */
  computer;
  t;
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t, info, existing = false) {
    this.t = t;
    this.id = info.id;
    this.info = info;
    this.existing = existing;
    this.commands = new Commands(t, info.id);
    this.files = new Files(t, info.id);
    this.processes = new Processes(t, info.id);
    this.metrics = new Metrics(t, info.id);
    this.computer = new Computer(t, info.id);
  }
  /** Current state as last seen (`running`, `paused`, `sleeping`, …). */
  get state() {
    return this.info.state;
  }
  /** Template the sandbox was created from. */
  get template() {
    return this.info.template;
  }
  /** Name of a named sandbox. */
  get name() {
    return this.info.name;
  }
  /** The public IPv6 address (`network.ip` `dual` or `ipv6`). */
  get ipv6() {
    const v = this.info.info?.["ipv6"];
    return typeof v === "string" && v ? v : void 0;
  }
  /** IP version of the sandbox. */
  get ip() {
    return this.info.ip;
  }
  path(rest = "") {
    return `/v1/sandboxes/${enc(this.id)}${rest}`;
  }
  async lifecycle(action, json, options) {
    const { data } = await this.t.json({
      method: "POST",
      path: this.path(`/${action}`),
      json,
      defaultTimeoutMs: CREATE_TIMEOUT_MS,
      options
    });
    if (data && typeof data === "object" && "id" in data) this.info = data;
    return this;
  }
  /** Reloads the sandbox record. */
  async refresh(options) {
    this.info = (await this.t.json({ method: "GET", path: this.path(), options })).data;
    return this;
  }
  /** Destroys the sandbox with its disk and memory. No error when it is already gone. */
  async kill(options) {
    try {
      await this.t.json({ method: "DELETE", path: this.path(), options });
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
  /** Sets the remaining lifetime to `seconds` from now. */
  setTimeout(seconds, options) {
    return this.lifecycle("timeout", { timeout_s: Math.floor(seconds) }, options);
  }
  /**
   * Puts the sandbox to sleep: files are kept, running programs stop, no compute is billed.
   * Any later request (or {@link resume}) wakes it up in a few seconds.
   */
  sleep(options) {
    return this.lifecycle("sleep", void 0, options);
  }
  /** Freezes the sandbox with its memory; it continues exactly where it stopped on {@link resume}. */
  pause(options) {
    return this.lifecycle("pause", void 0, options);
  }
  /** Continues a paused sandbox or wakes a sleeping one. */
  resume(options) {
    return this.lifecycle("resume", void 0, options);
  }
  /**
   * Keeps the sandbox `days` days after it falls asleep before it is deleted with its files
   * (0 = your plan's default; the plan sets the maximum).
   */
  async keep(days, options) {
    return (await this.t.json({ method: "PUT", path: this.path("/keep"), json: { keep_days: Math.floor(days) }, options })).data;
  }
  /**
   * Saves a copy of the sandbox disk as a snapshot (feature `snapshots`). Works for a running,
   * paused or sleeping sandbox; a running one is paused only for a moment and keeps running.
   * The snapshot holds files only – no memory, no running programs, no env. An archived
   * sandbox must be woken up first (`ConflictError`, code `sandbox_archived`); the number of
   * snapshots is limited by your plan (`RateLimitError`, code `snapshot_limit`).
   *
   * ```ts
   * const snap = await sandbox.snapshot({ name: "after-setup" });
   * const copy = await snap.createSandbox({ timeoutSeconds: 600 });
   * ```
   */
  async snapshot(params = {}, options) {
    const { data } = await this.t.json({
      method: "POST",
      path: this.path("/snapshots"),
      json: compact({ name: params.name }),
      defaultTimeoutMs: SNAPSHOT_TIMEOUT_MS,
      options
    });
    return new Snapshot(this.t, data);
  }
  /**
   * Creates `count` (1–10) new sandboxes with a copy of this sandbox's disk (features
   * `snapshots` and `clones`): a snapshot plus N creates on the same server. Each copy has its
   * own ID, IP addresses and identity (new machine-id, no SSH host keys of the source). Memory and
   * running programs are not copied.
   *
   * Copies keep the source sandbox's lifetime and network settings unless you pass them: without
   * `timeoutSeconds`, `onTimeout`, `idleTimeoutSeconds`, `keepDays` or `computeClass` they get the
   * source's values, and its network access (no internet, allowed destinations, IP version).
   * A `network` passed here can only narrow the source's access, never widen it. `env` is not
   * inherited – pass what the copies need.
   *
   * When some copies fail, they are listed in `errors`; when none could be created, the error
   * of the first one is thrown. The copies count towards your concurrent-sandbox limits.
   */
  async clone(params = {}, options) {
    const { count = 1, keepSnapshot, snapshotName, ...create } = params;
    if (!Number.isInteger(count) || count < 1 || count > 10) throw new WBXError("count must be an integer between 1 and 10");
    const { data, status, headers } = await this.t.json({
      method: "POST",
      path: this.path("/clone"),
      json: compact({ ...createBody(create), count, keep_snapshot: keepSnapshot || void 0, snapshot_name: snapshotName || void 0 }),
      defaultTimeoutMs: CLONE_TIMEOUT_MS,
      options
    });
    const sandboxes = (data?.sandboxes ?? []).map((d) => new _Sandbox(this.t, d));
    const errors = data?.errors ?? [];
    const first = errors[0];
    if (sandboxes.length === 0 && first) {
      throw errorFromResponse(first.status ?? (status >= 400 ? status : 500), first, headers, "POST", this.path("/clone"));
    }
    return { snapshotId: data?.snapshot_id, snapshotKept: data?.snapshot_kept ?? !!keepSnapshot, sandboxes, errors };
  }
  /**
   * Public HTTPS address of a TCP port in the sandbox (a web app or API you started there).
   * The app must listen on `0.0.0.0`. Open `url_with_token` in a browser or send the header
   * `X-WBX-Token: <token>`.
   */
  async getUrl(port, options) {
    return (await this.t.json({ method: "GET", path: this.path("/url"), query: { port: Math.floor(port) }, options })).data;
  }
  /**
   * Runs a piece of code (`python`, `node` or `bash`): writes it to a temporary file and runs
   * it, so parallel calls do not interfere.
   *
   * ```ts
   * const r = await sandbox.runCode("print(sum(range(100)))");
   * console.log(r.stdout); // "4950\n"
   * ```
   */
  async runCode(code, options = {}) {
    const { language = "python", ...run2 } = options;
    const runner = RUNNERS[language];
    if (!runner) throw new WBXError(`unsupported language ${JSON.stringify(language)} (use python, node or bash)`);
    const [ext, interp] = runner;
    const file = `/tmp/_wbx_code_${randomId().replace(/-/g, "")}${ext}`;
    await this.files.write(file, code, { signal: run2.signal });
    return this.commands.run(`${interp} ${file}; rc=$?; rm -f ${file}; exit $rc`, run2);
  }
  /** @internal */
  toJSON() {
    return this.info;
  }
};
var Sandboxes = class {
  /** Not meant to be called directly – use the {@link WBX} client. */
  constructor(t) {
    this.t = t;
  }
  t;
  /**
   * Creates a sandbox (or, with `name`, returns your existing sandbox of that name).
   *
   * ```ts
   * const sandbox = await wbx.sandboxes.create({ template: "base", name: "my-project" });
   * ```
   *
   * A create with `name` is safe to repeat, so it is retried after temporary errors; one
   * without a name is never retried automatically.
   */
  async create(params = {}, options) {
    const body = compact({ template: params.template, ...createBody(params), from_snapshot: params.fromSnapshot });
    const { data, headers } = await this.t.json({
      method: "POST",
      path: "/v1/sandboxes",
      json: body,
      idempotent: !!params.name,
      // from a snapshot the disk is copied first – longer limit (like the portal)
      defaultTimeoutMs: params.fromSnapshot ? FROM_SNAPSHOT_TIMEOUT_MS : CREATE_TIMEOUT_MS,
      options
    });
    return new Sandbox(this.t, data, headers.get("x-wbx-existing") === "1");
  }
  /** Attaches to an existing sandbox by its ID (for example in the next turn of a conversation). */
  async get(id, options) {
    const { data } = await this.t.json({ method: "GET", path: `/v1/sandboxes/${enc(id)}`, options });
    return new Sandbox(this.t, data);
  }
  /**
   * Your sandboxes – running, paused, sleeping and archived – oldest first. The API returns
   * them all at once (no pages).
   */
  async list(options) {
    const { data } = await this.t.json({ method: "GET", path: "/v1/sandboxes", options });
    return (data ?? []).map((d) => new Sandbox(this.t, d));
  }
  /** Destroys a sandbox by ID. No error when it is already gone. */
  async kill(id, options) {
    try {
      await this.t.json({ method: "DELETE", path: `/v1/sandboxes/${enc(id)}`, options });
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
};
function enc(id) {
  return encodeURIComponent(id);
}

// ../../sdk/typescript/src/client.ts
var DEFAULT_BASE_URL = "https://sandbox.wbx.cz";
function checkBaseURL(raw, allowInsecure = false) {
  const base = raw.replace(/\/+$/, "");
  let u;
  try {
    u = new URL(base);
  } catch {
    throw new TypeError(`invalid API address "${base}"`);
  }
  if (u.protocol === "https:") return base;
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(u.hostname);
  if (u.protocol === "http:" && (local || allowInsecure)) return base;
  throw new TypeError(
    `refusing to use "${base}": the API key would be sent unencrypted \u2013 use an https:// address (or pass allowInsecure: true for a trusted network)`
  );
}
var WBX = class {
  /** Sandboxes: create, get, list, kill. */
  sandboxes;
  /** Snapshots of sandbox disks (feature `snapshots`): list, get, delete. */
  snapshots;
  /** Background jobs. */
  jobs;
  /** Batches of jobs. */
  batches;
  /** Templates. */
  templates;
  /** Spending limits and spend. */
  budget;
  /** Compute classes. */
  compute;
  /** Webhook secret. */
  webhooks;
  /** The HTTP transport (for advanced use). */
  transport;
  constructor(options = {}) {
    const f = options.fetch ?? globalThis.fetch;
    if (typeof f !== "function") {
      throw new TypeError("no fetch implementation found \u2013 use Node.js 20 or newer, or pass { fetch }");
    }
    this.transport = new Transport({
      baseURL: checkBaseURL(options.baseURL ?? readEnv("WBXSANDBOX_URL") ?? DEFAULT_BASE_URL, options.allowInsecure),
      apiKey: options.apiKey ?? readEnv("WBXSANDBOX_API_KEY") ?? "",
      timeoutMs: options.timeoutMs ?? 6e4,
      maxRetries: options.maxRetries ?? 2,
      maxRetryDelayMs: options.maxRetryDelayMs ?? 6e4,
      fetch: options.fetch ? options.fetch : (input, init) => f(input, init),
      // keep `this` of the global fetch
      headers: { ...options.headers },
      maxStreamEventSize: options.maxStreamEventSize
    });
    this.sandboxes = new Sandboxes(this.transport);
    this.snapshots = new Snapshots(this.transport);
    this.jobs = new Jobs(this.transport);
    this.batches = new Batches(this.transport);
    this.templates = new Templates(this.transport);
    this.budget = new BudgetResource(this.transport);
    this.compute = new Compute(this.transport);
    this.webhooks = new Webhooks(this.transport);
  }
  /** A description without the API key – safe to log. */
  toJSON() {
    return { baseURL: this.baseURL, hasApiKey: this.transport.hasApiKey };
  }
  /** `util.inspect()` / `console.log()` output without the API key. @internal */
  [INSPECT]() {
    return `WBX ${JSON.stringify(this.toJSON())}`;
  }
  /** The API address in use. */
  get baseURL() {
    return this.transport.config.baseURL;
  }
  /**
   * Features enabled for your account (`metrics_history`, `desktop`, …). The server decides
   * in the end: a disabled feature answers with {@link FeatureDisabledError}.
   */
  async features(options) {
    return (await this.transport.json({ method: "GET", path: "/v1/features", options })).data.features ?? {};
  }
  /** Job runtimes with their isolation level and capabilities. */
  async runtimes(options) {
    return (await this.transport.json({ method: "GET", path: "/v1/runtimes", options })).data;
  }
  /**
   * Public keys that sign execution receipts (no API key needed). Pin the key you trust
   * instead of fetching it each time from the server whose receipts you check.
   */
  async receiptKeys(options) {
    return (await this.transport.json({ method: "GET", path: "/v1/receipt-keys", auth: false, options })).data.keys ?? [];
  }
  /**
   * Calls any endpoint with the client's authentication, timeouts, retries and error
   * mapping – for API features this SDK does not wrap yet. Returns the parsed JSON (or text).
   *
   * Only GET, HEAD, DELETE and PUT are retried, unless you pass `idempotent: true`.
   */
  async request(method, path, params = {}, options) {
    const { data } = await this.transport.json({
      method,
      path: path.startsWith("/") ? path : `/${path}`,
      query: params.query,
      json: params.body,
      idempotent: params.idempotent,
      options
    });
    return data;
  }
};

// src/lib.mjs
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var GITHUB_DOWNLOAD_HOSTS = ["api.github.com", "codeload.github.com"];
function isPublicRepo(event) {
  const r = event && typeof event === "object" ? event.repository : null;
  if (!r || typeof r !== "object") return false;
  if (r.private === false) return true;
  return r.visibility === "public" && r.private !== true;
}
var REPO_DIR = "/home/user/repo";
function getInput(env2, name, { required = false, trim = true } = {}) {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  let v = env2[key] ?? "";
  if (trim) v = v.trim();
  if (required && !v) throw new Error(`Input required and not supplied: ${name}`);
  return v;
}
function getBool(env2, name, def) {
  const v = getInput(env2, name).toLowerCase();
  if (!v) return def;
  if (["true", "yes", "1", "on"].includes(v)) return true;
  if (["false", "no", "0", "off"].includes(v)) return false;
  throw new Error(`Input ${name} must be true or false, got "${v}"`);
}
function parseEnv(text) {
  const out = {};
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) throw new Error(`env: expected NAME=value, got "${line.slice(0, 40)}"`);
    const name = line.slice(0, i).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`env: invalid variable name "${name}"`);
    if (name.startsWith("WBX_GH_")) throw new Error(`env: names starting with WBX_GH_ are reserved`);
    out[name] = raw.slice(raw.indexOf("=") + 1);
  }
  return out;
}
function parseList(text) {
  return String(text || "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}
function networkFor(mode, allow, checkout) {
  mode = (mode || "full").toLowerCase();
  if (!["full", "allowlist", "none"].includes(mode)) throw new Error(`network must be full, allowlist or none, got "${mode}"`);
  if (mode === "none" && checkout) {
    throw new Error("network: none cannot download the repository \u2013 set checkout: false or use network: allowlist");
  }
  if (mode === "full") {
    if (allow.length) throw new Error("allow is only used with network: allowlist");
    return void 0;
  }
  if (mode === "none") return { mode: "none" };
  const list = [...allow];
  if (checkout) {
    for (const h of GITHUB_DOWNLOAD_HOSTS) if (!list.includes(h)) list.push(h);
  }
  if (!list.length) throw new Error("network: allowlist needs at least one entry in allow");
  return { mode: "allowlist", allow: list };
}
function workDir(rel) {
  const r = String(rel || ".").trim().replace(/^\.\/+/, "").replace(/\/+$/, "") || ".";
  if (r.startsWith("/") || r.split("/").includes("..") || /[\0\n]/.test(r)) {
    throw new Error(`working-directory must be a relative path inside the repository, got "${rel}"`);
  }
  return r === "." ? REPO_DIR : `${REPO_DIR}/${r}`;
}
function shQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}
function buildCommand(userCommand, { checkout, cwd }) {
  if (!checkout) return userCommand;
  const delim = heredocDelimiter(userCommand);
  return [
    "set -e",
    `mkdir -p ${REPO_DIR} && cd ${REPO_DIR}`,
    'export u="$WBX_GH_API/repos/$WBX_GH_REPO/tarball/$WBX_GH_SHA" f=/tmp/wbx-src.tar.gz',
    // hlavička s tokenem jen když token je (veřejný repozitář jde stáhnout i bez něj)
    'set --; [ -n "${WBX_GH_TOKEN:-}" ] && set -- "Authorization: Bearer $WBX_GH_TOKEN"',
    'if command -v curl >/dev/null 2>&1; then if [ $# -gt 0 ]; then curl -fsSL --retry 3 -H "$1" -o "$f" "$u"; else curl -fsSL --retry 3 -o "$f" "$u"; fi',
    'elif command -v wget >/dev/null 2>&1; then if [ $# -gt 0 ]; then wget -q --header="$1" -O "$f" "$u"; else wget -q -O "$f" "$u"; fi',
    `elif command -v python3 >/dev/null 2>&1; then python3 -c 'import os,urllib.request as r;t=os.environ.get("WBX_GH_TOKEN","");q=r.Request(os.environ["u"],headers={"Authorization":"Bearer "+t} if t else {});open(os.environ["f"],"wb").write(r.urlopen(q,timeout=300).read())'`,
    `elif command -v node >/dev/null 2>&1; then node -e 'const t=process.env.WBX_GH_TOKEN;fetch(process.env.u,{headers:t?{Authorization:"Bearer "+t}:{}}).then(async r=>{if(!r.ok)throw new Error("HTTP "+r.status);require("fs").writeFileSync(process.env.f,Buffer.from(await r.arrayBuffer()))}).catch(e=>{console.error(e.message);process.exit(1)})'`,
    'else echo "wbx: no curl, wget, python3 or node in this template to download the repository" >&2; exit 97; fi',
    'tar -xzf "$f" --strip-components=1 && rm -f "$f"',
    "unset WBX_GH_TOKEN u f; set --",
    `cd ${shQuote(cwd)}`,
    // příkaz uživatele v NOVÉM procesu: /proc/<pid>/environ ukazuje prostředí, se kterým proces
    // vznikl – po pouhém unset by token šel přečíst z /proc/$$/environ (resp. $PPID)
    'c="${TMPDIR:-/tmp}/wbx-command-$$.sh"',
    `cat > "$c" <<'${delim}'`,
    userCommand,
    delim,
    'exec /bin/sh "$c"'
  ].join("\n");
}
function heredocDelimiter(text) {
  const lines = new Set(String(text).split(/\r?\n/));
  for (; ; ) {
    const d = `WBX_COMMAND_${(0, import_node_crypto.randomBytes)(8).toString("hex")}`;
    if (!lines.has(d)) return d;
  }
}
function idempotencyKey(env2, request, secret) {
  const parts = [env2.GITHUB_REPOSITORY, env2.GITHUB_RUN_ID, env2.GITHUB_RUN_ATTEMPT, env2.GITHUB_JOB, env2.GITHUB_ACTION];
  if (!parts.every(Boolean)) return `gha-${(0, import_node_crypto.randomBytes)(12).toString("hex")}`;
  const h = (0, import_node_crypto.createHmac)("sha256", String(secret ?? "")).update(JSON.stringify([parts, canonical(request ?? null)])).digest("hex").slice(0, 32);
  return `gha-${env2.GITHUB_RUN_ID}-${env2.GITHUB_RUN_ATTEMPT}-${h}`.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 200);
}
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== void 0).map((k) => [k, canonical(v[k])]));
  return v;
}
function metadataFor(env2) {
  const m = {
    source: "github-action",
    github_repository: env2.GITHUB_REPOSITORY,
    github_sha: env2.GITHUB_SHA,
    github_run_id: env2.GITHUB_RUN_ID,
    github_run_attempt: env2.GITHUB_RUN_ATTEMPT,
    github_workflow: env2.GITHUB_WORKFLOW,
    github_job: env2.GITHUB_JOB,
    github_ref: env2.GITHUB_REF
  };
  for (const k of Object.keys(m)) if (!m[k]) delete m[k];
  for (const k of Object.keys(m)) m[k] = String(m[k]).slice(0, 200);
  return m;
}
function outputLine(name, value) {
  const v = String(value ?? "");
  const delim = `ghadelim_${(0, import_node_crypto.randomBytes)(8).toString("hex")}`;
  return `${name}<<${delim}
${v}
${delim}
`;
}
function artifactPath(name) {
  const parts = String(name).split("/").filter((p) => p && p !== "." && p !== "..");
  if (!parts.length) throw new Error(`invalid artifact name "${name}"`);
  return parts.join("/");
}
function writeInside(root, rel, data) {
  const st = (0, import_node_fs.lstatSync)(root);
  if (st.isSymbolicLink() || !st.isDirectory()) throw new Error(`${root} is not a plain directory (symlinks are not followed)`);
  const parts = artifactPath(rel).split("/");
  let dir = root;
  for (const p of parts.slice(0, -1)) {
    dir = (0, import_node_path.join)(dir, p);
    let s;
    try {
      s = (0, import_node_fs.lstatSync)(dir);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      (0, import_node_fs.mkdirSync)(dir);
      s = (0, import_node_fs.lstatSync)(dir);
    }
    if (s.isSymbolicLink() || !s.isDirectory()) throw new Error(`${dir} is not a plain directory (symlinks are not followed)`);
  }
  const dest = (0, import_node_path.join)(dir, parts[parts.length - 1]);
  const fd = (0, import_node_fs.openSync)(dest, import_node_fs.constants.O_WRONLY | import_node_fs.constants.O_CREAT | import_node_fs.constants.O_TRUNC | import_node_fs.constants.O_NOFOLLOW, 420);
  try {
    const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    for (let off = 0; off < buf.length; ) off += (0, import_node_fs.writeSync)(fd, buf, off);
  } finally {
    (0, import_node_fs.closeSync)(fd);
  }
  return dest;
}
function jobUrl(apiUrl, id) {
  const base = (apiUrl || "https://sandbox.wbx.cz").replace(/\/+$/, "").replace(/\/v1$/, "");
  return `${base}/jobs/${id}`;
}
function summaryMarkdown({ job, url, digest, artifacts, receiptPath }) {
  const d = job.data;
  const ok = d.status === "completed" && (d.exit_code ?? 0) === 0;
  const lines = [];
  lines.push(`### ${ok ? "\u2705" : "\u274C"} WBX Sandbox job \`${d.id}\``);
  lines.push("");
  lines.push("| | |", "|---|---|");
  lines.push(`| Status | ${d.status}${d.error?.code ? ` (\`${d.error.code}\`)` : ""} |`);
  if (d.exit_code !== void 0 && d.exit_code !== null) lines.push(`| Exit code | ${d.exit_code} |`);
  lines.push(`| Template | ${d.template}${d.compute_class ? ` \xB7 ${d.compute_class}` : ""} |`);
  if (d.started_at && d.ended_at) {
    const s = Math.max(0, Math.round((Date.parse(d.ended_at) - Date.parse(d.started_at)) / 1e3));
    lines.push(`| Run time | ${s} s |`);
  }
  if (d.cost) lines.push(`| Cost | ${d.cost.amount} ${d.cost.currency}${d.max_cost ? ` (limit ${d.max_cost.amount})` : ""} |`);
  if (artifacts?.length) lines.push(`| Result files | ${artifacts.length} |`);
  if (receiptPath) lines.push(`| Signed receipt | \`${receiptPath}\` |`);
  lines.push(`| Details | [open in WBX Sandbox](${url}) |`);
  if (digest?.text) {
    const text = digest.text.slice(0, 6e4);
    const fence = "`".repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));
    lines.push("", "<details><summary>Log summary</summary>", "", fence + "text", text, fence, "", "</details>");
  }
  return lines.join("\n") + "\n";
}

// src/main.mjs
var env = process.env;
function readEvent(e) {
  if (!e.GITHUB_EVENT_PATH) return null;
  try {
    return JSON.parse((0, import_node_fs2.readFileSync)(e.GITHUB_EVENT_PATH, "utf8"));
  } catch {
    return null;
  }
}
var say = (s) => process.stdout.write(s.endsWith("\n") ? s : s + "\n");
var cmd = (name, msg, props = "") => say(`::${name}${props}::${String(msg).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A")}`);
var mask = (v) => v && say(`::add-mask::${v}`);
var setOutput = (name, value) => {
  if (env.GITHUB_OUTPUT) (0, import_node_fs2.appendFileSync)(env.GITHUB_OUTPUT, outputLine(name, value));
};
var started = false;
var currentJob = null;
var resumeToken = "";
function stopCommands() {
  resumeToken = (0, import_node_crypto2.randomBytes)(16).toString("hex");
  say(`::stop-commands::${resumeToken}`);
}
function resumeCommands() {
  if (!resumeToken) return;
  process.stdout.write(`
::${resumeToken}::
`);
  resumeToken = "";
}
var sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
var transient = (e) => !(e instanceof APIError) || e.status >= 500 || e.status === 429 || e.status === 408;
async function patiently(fn) {
  const until = Date.now() + 10 * 6e4;
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!transient(e) || Date.now() > until) throw e;
      await sleep2(Math.min(3e4, 1e3 * 2 ** i));
    }
  }
}
async function run() {
  const outDir = (0, import_node_path2.resolve)(env.GITHUB_WORKSPACE || process.cwd(), getInput(env, "artifacts-path") || "wbx-artifacts");
  (0, import_node_fs2.mkdirSync)(outDir, { recursive: true });
  setOutput("artifacts-path", outDir);
  setOutput("receipt-path", "");
  const apiKey = getInput(env, "api-key", { required: true });
  mask(apiKey);
  const userCommand = getInput(env, "command", { required: true, trim: false }).replace(/\s+$/, "");
  if (!userCommand.trim()) throw new Error("Input required and not supplied: command");
  const checkout = getBool(env, "checkout", true);
  const ghToken = isPublicRepo(readEvent(env)) ? "" : getInput(env, "github-token");
  mask(getInput(env, "github-token"));
  const cwd = workDir(getInput(env, "working-directory") || ".");
  const userEnv = parseEnv(getInput(env, "env", { trim: false }));
  for (const v of Object.values(userEnv)) if (v.length >= 4) mask(v);
  const network = networkFor(getInput(env, "network"), parseList(getInput(env, "allow")), checkout);
  const artifacts = parseList(getInput(env, "artifacts").replace(/,/g, "\n"));
  const wantReceipt = getBool(env, "receipt", true);
  const failOnError = getBool(env, "fail-on-error", true);
  const timeout = Number(getInput(env, "timeout") || 1800);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 86400) throw new Error("timeout must be a whole number of seconds between 1 and 86400");
  const maxCost = getInput(env, "max-cost");
  if (maxCost && !/^\d+(\.\d+)?$/.test(maxCost)) throw new Error(`max-cost must be a decimal number like "0.20", got "${maxCost}"`);
  const apiUrl = getInput(env, "api-url") || void 0;
  const jobEnv = { ...userEnv };
  if (checkout) {
    if (!env.GITHUB_REPOSITORY || !env.GITHUB_SHA) throw new Error("checkout needs GITHUB_REPOSITORY and GITHUB_SHA \u2013 run the action inside a GitHub workflow or set checkout: false");
    Object.assign(jobEnv, {
      ...ghToken ? { WBX_GH_TOKEN: ghToken } : {},
      WBX_GH_REPO: env.GITHUB_REPOSITORY,
      WBX_GH_SHA: env.GITHUB_SHA,
      WBX_GH_API: (env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "")
    });
  }
  const artPrefix = checkout ? `${cwd}/`.replace(/^\/home\/user\//, "") : "";
  const wbx = new WBX({ apiKey, baseURL: apiUrl, headers: { "User-Agent": "wbxsandbox-github-action/1" } });
  const params = {
    command: buildCommand(userCommand, { checkout, cwd }),
    template: getInput(env, "template") || "base",
    timeoutSeconds: timeout,
    env: Object.keys(jobEnv).length ? jobEnv : void 0,
    // vzory výsledků se na serveru berou relativně k /home/user (výchozí adresář úlohy)
    artifacts: artifacts.length ? artifacts.map((a) => artPrefix + a) : void 0,
    network,
    metadata: metadataFor(env),
    maxCost: maxCost || void 0,
    computeClass: getInput(env, "compute-class") || void 0
  };
  params.idempotencyKey = idempotencyKey(env, params, apiKey);
  cmd("group", "WBX Sandbox: starting job");
  const job = await wbx.jobs.create(params);
  started = true;
  currentJob = job;
  const url = jobUrl(apiUrl || env.WBXSANDBOX_URL, job.id);
  say(`job ${job.id} (${params.template}, timeout ${timeout} s${maxCost ? `, price limit ${maxCost}` : ""})`);
  say(url);
  cmd("endgroup", "");
  setOutput("job-id", job.id);
  setOutput("job-url", url);
  let cancelling = false;
  const onCancel = async () => {
    if (cancelling) return;
    cancelling = true;
    resumeCommands();
    say(`
workflow cancelled \u2013 cancelling WBX job ${job.id}`);
    try {
      await job.cancel();
    } catch (e) {
      cmd("warning", `could not cancel job ${job.id}: ${e.message}`);
    }
    process.exit(1);
  };
  process.on("SIGINT", onCancel);
  process.on("SIGTERM", onCancel);
  stopCommands();
  let off = 0;
  for (; ; ) {
    const c = await patiently(() => job.logs({ offset: off }));
    if (c.data) process.stdout.write(c.data);
    off = c.next_offset;
    if (c.complete) break;
    if (!c.data) await sleep2(2e3);
  }
  resumeCommands();
  await patiently(() => job.wait());
  const d = job.data;
  let saved = [];
  if (artifacts.length && !d.artifacts_purged) {
    const list = await job.artifacts();
    for (const a of list.artifacts) {
      const rel = artifactPath(artPrefix && a.name.startsWith(artPrefix) ? a.name.slice(artPrefix.length) : a.name);
      writeInside(outDir, rel, await job.download(a.name));
      saved.push(rel);
    }
    if (list.skipped?.length) cmd("warning", `result files not kept (limits): ${list.skipped.join(", ")}`);
    say(`downloaded ${saved.length} result file(s) to ${outDir}`);
  }
  let receiptPath = "";
  if (wantReceipt) {
    try {
      const r = await job.signedReceipt();
      receiptPath = writeInside(outDir, "receipt.json", JSON.stringify(r, null, 2) + "\n");
    } catch (e) {
      cmd("warning", `signed receipt not available: ${e.message}`);
    }
  }
  let digest;
  try {
    digest = await job.digest({ mode: "summary", maxChars: 2e4 });
  } catch {
    digest = void 0;
  }
  if (env.GITHUB_STEP_SUMMARY) (0, import_node_fs2.appendFileSync)(env.GITHUB_STEP_SUMMARY, summaryMarkdown({ job, url, digest, artifacts: saved, receiptPath }));
  setOutput("status", d.status);
  setOutput("exit-code", d.exit_code ?? "");
  setOutput("cost", d.cost?.amount ?? "");
  setOutput("currency", d.cost?.currency ?? "");
  setOutput("receipt-path", receiptPath);
  const ok = d.status === "completed" && (d.exit_code ?? 0) === 0;
  const costText = d.cost ? `, cost ${d.cost.amount} ${d.cost.currency}` : "";
  if (ok) {
    say(`
WBX job ${job.id} completed${costText}`);
    return;
  }
  const why = d.error?.message || d.error?.code || `exit code ${d.exit_code}`;
  const msg = `WBX job ${job.id} ${d.status}: ${why}${costText} \u2013 ${url}`;
  if (failOnError) {
    cmd("error", msg);
    process.exitCode = 1;
  } else {
    cmd("warning", msg);
  }
}
run().catch(async (e) => {
  resumeCommands();
  if (!started) setOutput("status", "not_started");
  if (currentJob && !currentJob.done) {
    try {
      await currentJob.cancel();
      say(`WBX job ${currentJob.id} cancelled because the action failed`);
    } catch (c) {
      cmd("warning", `could not cancel job ${currentJob.id}: ${c.message}`);
    }
  }
  let msg = e?.message || String(e);
  if (e instanceof APIError) {
    msg = `WBX API ${e.status}${e.code ? ` ${e.code}` : ""}: ${msg.replace(/^\d{3}\s+/, "")}`;
    if (e.code === "budget_too_low" && !/raise/i.test(msg)) msg += " \u2013 raise max-cost or lower timeout (the price limit must cover the worst case: timeout + ~7 min)";
  }
  cmd("error", msg);
  process.exitCode = 1;
});
