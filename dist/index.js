let _ = null, x = null;
function u() {
  if (_) return _;
  if (window.location.protocol === "neboapp:")
    return _ = window.location.hostname, _;
  const n = window.location.pathname.match(/^(?:\/t\/[^/]+)?(?:\/k\/[^/]+)?\/apps\/([^/]+)\/ui(?:\/|$)/);
  if (n)
    return _ = decodeURIComponent(n[1]), _;
  const e = document.querySelector('meta[name="nebo-app-id"]');
  if (e)
    return _ = e.getAttribute("content") || "", _;
  throw new Error(
    '[nebo-sdk] Cannot detect app ID. In production, serve from /apps/{id}/ui/. In dev, add <meta name="nebo-app-id" content="your-id"> to index.html.'
  );
}
function p() {
  if (x) return x;
  const n = document.querySelector('meta[name="nebo-base-url"]');
  return n ? (x = n.getAttribute("content") || "", x) : window.location.protocol === "neboapp:" ? (x = "http://localhost:27895", x) : (x = window.location.origin, x);
}
function ie(n) {
  _ = n;
}
function de(n) {
  x = n;
}
async function le(n, e) {
  const t = u(), a = p();
  if (n.startsWith("http://") || n.startsWith("https://")) {
    const d = `${a}/api/v1/apps/${t}/http/proxy`, c = {};
    e != null && e.headers && new Headers(e.headers).forEach((b, E) => {
      c[E] = b;
    });
    const h = {
      url: n,
      method: (e == null ? void 0 : e.method) || "GET",
      headers: c,
      body: e != null && e.body ? String(e.body) : void 0
    }, l = await fetch(d, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(h)
    });
    if (!l.ok) return l;
    const i = await l.json();
    return new Response(i.body, {
      status: i.status,
      headers: i.headers
    });
  }
  const s = n.startsWith("/") ? n : `/${n}`, o = `${a}/api/v1/apps/${t}/api${s}`;
  return fetch(o, e);
}
class U {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectDelay = 1e3, this.maxReconnectDelay = 3e4, this._closed = !1, this.onopen = null, this.onmessage = null, this.onerror = null, this.onclose = null;
    const t = u(), s = p().replace(/^http/, "ws");
    this.url = `${s}/ws/app/${t}`, this.connect();
  }
  connect() {
    this._closed || (this.ws = new WebSocket(this.url), this.ws.onopen = (e) => {
      var t;
      this.reconnectDelay = 1e3, (t = this.onopen) == null || t.call(this, e);
    }, this.ws.onmessage = (e) => {
      var t;
      return (t = this.onmessage) == null ? void 0 : t.call(this, e);
    }, this.ws.onerror = (e) => {
      var t;
      return (t = this.onerror) == null ? void 0 : t.call(this, e);
    }, this.ws.onclose = (e) => {
      var t;
      (t = this.onclose) == null || t.call(this, e), this._closed || this.scheduleReconnect();
    });
  }
  scheduleReconnect() {
    this.reconnectTimer || this._closed || (this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null, this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay), this.connect();
    }, this.reconnectDelay));
  }
  get readyState() {
    var e;
    return ((e = this.ws) == null ? void 0 : e.readyState) ?? WebSocket.CLOSED;
  }
  send(e) {
    var t;
    (t = this.ws) == null || t.send(e);
  }
  close(e, t) {
    var a;
    this._closed = !0, this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), (a = this.ws) == null || a.close(e, t);
  }
}
const z = /* @__PURE__ */ new Set();
let P = null;
function he() {
  P || (P = new U(), P.onmessage = (n) => {
    let e;
    try {
      e = JSON.parse(n.data);
    } catch {
      return;
    }
    e.type !== "app_data_changed" || !e.data || e.data.appId && e.data.appId !== u() || z.forEach((t) => t(e.data));
  });
}
function ue(n) {
  if (typeof n != "string") return n;
  let e;
  try {
    e = JSON.parse(n);
  } catch {
    return n;
  }
  if (typeof e != "string") return e;
  try {
    return JSON.parse(e);
  } catch {
    return e;
  }
}
function J(n) {
  const e = u(), t = p();
  return n ? `${t}/api/v1/apps/${e}/storage/${encodeURIComponent(n)}` : `${t}/api/v1/apps/${e}/storage`;
}
const fe = {
  async getItem(n) {
    const e = await fetch(J(n));
    if (e.status === 404) return null;
    const t = await e.json();
    return ue(t.value);
  },
  async setItem(n, e) {
    const t = typeof e == "string" ? e : JSON.stringify(e);
    await fetch(J(n), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: t })
    });
  },
  async removeItem(n) {
    await fetch(J(n), { method: "DELETE" });
  },
  async clear() {
    const n = await this.keys();
    await Promise.all(n.map((e) => this.removeItem(e)));
  },
  async keys() {
    return ((await (await fetch(J())).json()).items || []).map((t) => t[0]);
  },
  /**
   * Call `handler` after every change to the store: the employee's writes
   * and other open views'. Returns a function that stops listening.
   */
  onChange(n) {
    return z.add(n), he(), () => {
      z.delete(n);
    };
  }
};
function Y(n) {
  const e = u();
  return `${p()}/api/v1/apps/${e}/agents/${n}`;
}
const pe = {
  async invoke(n, e) {
    return (await fetch(Y("invoke"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: n,
        agent: e == null ? void 0 : e.agent,
        data: e == null ? void 0 : e.data
      })
    })).json();
  },
  async *stream(n, e) {
    const t = await fetch(Y("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: n,
        agent: e == null ? void 0 : e.agent,
        data: e == null ? void 0 : e.data
      })
    });
    if (!t.body)
      throw new Error("No response body for streaming");
    const a = t.body.getReader(), s = new TextDecoder();
    let o = "";
    for (; ; ) {
      const { done: d, value: c } = await a.read();
      if (d) break;
      o += s.decode(c, { stream: !0 });
      const h = o.split(`
`);
      o = h.pop() || "";
      for (const l of h)
        if (l.startsWith("data: ")) {
          const i = l.slice(6);
          if (i === "[DONE]") return;
          try {
            yield JSON.parse(i);
          } catch {
            yield { text: i, done: !1 };
          }
        }
    }
  }
};
function Q(n) {
  const e = u();
  return `${p()}/api/v1/apps/${e}/janus/${n}`;
}
const me = {
  async complete(n) {
    const t = await (await fetch(Q("complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n)
    })).json();
    return t.text || t.content || "";
  },
  async *stream(n) {
    const e = await fetch(Q("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n)
    });
    if (!e.body)
      throw new Error("No response body for streaming");
    const t = e.body.getReader(), a = new TextDecoder();
    let s = "";
    for (; ; ) {
      const { done: o, value: d } = await t.read();
      if (o) break;
      s += a.decode(d, { stream: !0 });
      const c = s.split(`
`);
      s = c.pop() || "";
      for (const h of c)
        if (h.startsWith("data: ")) {
          const l = h.slice(6);
          if (l === "[DONE]") return;
          try {
            yield JSON.parse(l).text;
          } catch {
            yield l;
          }
        }
    }
  }
};
async function ge(n) {
  const e = await fetch(`${p()}/api/v1/apps/${u()}/janus/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(n)
  }), t = await e.json().catch(() => ({}));
  if (!e.ok)
    throw new Error(t.error || `decide failed (${e.status})`);
  return t;
}
async function be(n) {
  const e = new URLSearchParams(window.location.search), t = e.get("thread") || "", a = e.get("client") || "", s = await fetch(`${p()}/api/v1/apps/${u()}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: n.name, content: n.content, thread: t, client: a })
  }), o = await s.json().catch(() => ({}));
  if (!s.ok)
    throw new Error(o.error || `share failed (${s.status})`);
  return o;
}
const ye = 1e4;
let $ = null, g = null, C = null;
async function W(n) {
  const e = new URLSearchParams(window.location.search).get("client") || "", t = await fetch(`${p()}/api/v1/apps/${u()}/listen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ on: n, client: e })
  });
  if (!t.ok) {
    const a = await t.text().catch(() => "");
    throw new Error(a || `listen failed (${t.status})`);
  }
}
function j(n) {
  var t;
  C && clearTimeout(C), C = null;
  const e = g;
  g = null, $ == null || $.close(), $ = null, (t = e == null ? void 0 : e.onState) == null || t.call(e, "stopped", n);
}
function we(n) {
  var a;
  let e;
  try {
    e = JSON.parse(n.data);
  } catch {
    return;
  }
  const t = e.data;
  e.type !== "app_heard" || !t || !g || t.appId && t.appId !== u() || (t.type === "ready" ? (C && clearTimeout(C), C = null, (a = g.onState) == null || a.call(g, "listening")) : t.type === "text" ? g.onWords({ text: t.text ?? "", start: t.start ?? 0, end: t.end ?? 0, final: !!t.final }) : t.type === "error" ? j(t.message || "Nebo could not listen.") : t.type === "ended" && j());
}
const te = {
  /**
   * Ask Nebo to listen. Resolves once Nebo has the request; `onState` says
   * when the microphone is open. Throws when the app may not listen.
   */
  async start(n) {
    var t;
    g && await te.stop(), g = n, (t = n.onState) == null || t.call(n, "starting");
    const e = new Promise((a) => {
      $ = new U(), $.onmessage = we, $.onopen = () => a();
    });
    try {
      await e, await W(!0);
    } catch (a) {
      throw j(a instanceof Error ? a.message : String(a)), a;
    }
    C = setTimeout(() => {
      W(!1).catch(() => {
      }), j("Nebo is not open on this device to listen.");
    }, ye);
  },
  /** Stop listening. */
  async stop() {
    g && (j(), await W(!1).catch(() => {
    }));
  }
}, _e = {
  /**
   * `files.url('Media/Projects/reel/render.mp4')`. A path with a `.` or `..`
   * part names nothing inside a granted folder and is refused here.
   */
  url(n) {
    const e = n.split("/").filter((s) => s !== "");
    if (e.some((s) => s === "." || s === ".."))
      throw new Error(`[nebo-sdk] files.url: "${n}" climbs out of its folder; name the file inside the granted folder`);
    const t = encodeURIComponent(u()), a = e.map(encodeURIComponent).join("/");
    return `${p()}/api/v1/apps/${t}/files/${a}`;
  }
};
function ne(n) {
  return `${p()}/api/v1/apps/${encodeURIComponent(u())}/plugins/${n}`;
}
async function ae(n) {
  const e = await n.text().catch(() => "");
  return new Error(e || `plugin call failed (${n.status})`);
}
async function xe(n, e) {
  const t = await fetch(ne(`jobs/${encodeURIComponent(n)}`), {
    headers: { Accept: "text/event-stream" }
  });
  if (!t.ok || !t.body) throw await ae(t);
  const a = t.body.getReader(), s = new TextDecoder();
  let o = "", d = "", c = [];
  for (; ; ) {
    const { done: h, value: l } = await a.read();
    if (h) break;
    o += s.decode(l, { stream: !0 });
    const i = o.split(`
`);
    o = i.pop() || "";
    for (const v of i) {
      const b = v.replace(/\r$/, "");
      if (b === "") {
        if (d === "result") return JSON.parse(c.join(`
`));
        d === "progress" && e(c.join(`
`)), d = "", c = [];
      } else b.startsWith("event:") ? d = b.slice(6).trim() : b.startsWith("data:") && c.push(b.slice(5).replace(/^ /, ""));
    }
  }
  throw new Error("the plugin job ended without a result");
}
const ve = {
  /**
   * Run `command` on the installed plugin `slug`, with `args` as its flags
   * (each key becomes `--key`; objects and lists go as JSON).
   */
  async run(n, e, t = {}, a = {}) {
    const s = typeof a.onProgress == "function", o = await fetch(ne(`${encodeURIComponent(n)}/run`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: e, args: t, timeout: a.timeout, background: s })
    });
    if (!o.ok) throw await ae(o);
    const d = await o.json();
    return s ? xe(d.job, a.onProgress) : d;
  }
};
class Se {
  constructor() {
    this.ws = null, this.listeners = /* @__PURE__ */ new Map(), this._connected = !1, this._a2uiHandler = null, this.state = {};
  }
  /** Whether the WebSocket is connected */
  get connected() {
    return this._connected;
  }
  /** Connect to the app's surface WebSocket */
  connect() {
    this.ws || (this.ws = new U(), this.ws.onopen = () => {
      this._connected = !0;
    }, this.ws.onmessage = (e) => {
      var t, a;
      try {
        const s = JSON.parse(e.data);
        if (s.type === "a2ui_message" && ((t = s.data) != null && t.message)) {
          (a = this._a2uiHandler) == null || a.call(this, s.data.message);
          return;
        }
        this.handleEvent(s);
      } catch {
      }
    }, this.ws.onclose = () => {
      this._connected = !1;
    }, this.ws.onerror = () => {
      this._connected = !1;
    });
  }
  /** Disconnect and stop reconnecting */
  disconnect() {
    this.ws && (this.ws.close(), this.ws = null), this._connected = !1;
  }
  /** Subscribe to a specific event type (or '*' for all) */
  on(e, t) {
    return this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set()), this.listeners.get(e).add(t), () => {
      var a;
      (a = this.listeners.get(e)) == null || a.delete(t);
    };
  }
  /** Remove a specific listener */
  off(e, t) {
    var a;
    (a = this.listeners.get(e)) == null || a.delete(t);
  }
  /** Send an action/event to the agent */
  send(e, t) {
    !this.ws || this.ws.readyState !== WebSocket.OPEN || this.ws.send(JSON.stringify({ type: "action", name: e, ...t }));
  }
  /** Request a state snapshot from the agent */
  requestState() {
    this.send("request_state");
  }
  /** @internal Send raw data through the WebSocket (used by a2ui module) */
  _rawSend(e) {
    this.ws && this.ws.readyState === WebSocket.OPEN && this.ws.send(e);
  }
  // ─── Internal ────────────────────────────────────────────────────
  handleEvent(e) {
    e.type === "state_snapshot" ? this.state = { ...e.snapshot } : e.type === "state_delta" && this.applyDelta(e.delta);
    const t = this.listeners.get(e.type);
    if (t)
      for (const s of t)
        try {
          s(e);
        } catch {
        }
    const a = this.listeners.get("*");
    if (a)
      for (const s of a)
        try {
          s(e);
        } catch {
        }
  }
  applyDelta(e) {
    for (const t of e) {
      const a = t.path.split("/").filter(Boolean);
      if (a.length === 0) continue;
      const s = this.resolveParent(a);
      if (!s) continue;
      const o = a[a.length - 1];
      switch (t.op) {
        case "add":
        case "replace":
          s[o] = t.value;
          break;
        case "remove":
          delete s[o];
          break;
      }
    }
  }
  resolveParent(e) {
    let t = this.state;
    for (let a = 0; a < e.length - 1; a++) {
      if (t == null || typeof t != "object") return null;
      t = t[e[a]];
    }
    return t;
  }
}
const A = new Se();
class ke {
  constructor() {
    this.processor = null, this.sendFn = null;
  }
  /**
   * Initialize with a @a2ui/web_core MessageProcessor.
   * Call before nebo.surfaces.connect().
   */
  init(e) {
    this.processor = e;
  }
  /** Whether a processor has been initialized */
  get initialized() {
    return this.processor !== null;
  }
  /**
   * @internal Called by surfaces module when an a2ui_message arrives.
   */
  _handleMessage(e) {
    if (this.processor)
      try {
        this.processor.processMessages([e]);
      } catch (t) {
        console.error("[nebo-sdk] A2UI processing error:", t);
      }
  }
  /**
   * @internal Called by SDK to provide WebSocket send capability.
   */
  _setSendFn(e) {
    this.sendFn = e;
  }
  /**
   * Send a v0.9 client action back to the agent.
   */
  sendAction(e, t) {
    this.sendFn && this.sendFn(JSON.stringify({
      type: "a2ui_action",
      data: {
        surface_id: e,
        message: {
          version: "v0.9",
          action: {
            surfaceId: e,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ...t
          }
        }
      }
    }));
  }
  /**
   * Send a v0.9 client error report back to the agent.
   */
  sendError(e, t, a, s) {
    this.sendFn && this.sendFn(JSON.stringify({
      type: "a2ui_action",
      data: {
        surface_id: e,
        message: {
          version: "v0.9",
          error: { code: t, surfaceId: e, message: a, path: s }
        }
      }
    }));
  }
}
const M = new ke();
let O = null;
const $e = {
  async get() {
    if (O) return O;
    const n = u(), e = p(), t = await fetch(`${e}/api/v1/apps/${n}/identity`);
    if (!t.ok)
      throw new Error(`[nebo-sdk] identity fetch failed: ${t.status}`);
    return O = await t.json(), O;
  },
  invalidate() {
    O = null;
  }
}, D = /* @__PURE__ */ new Set();
let T = null, V = null;
function se(n = "") {
  return `${p()}/api/v1/apps/${encodeURIComponent(u())}/chat${n}`;
}
function Te(n) {
  if (typeof n != "string") return null;
  const e = `agent:${u()}:page`;
  if (n !== e)
    return n.startsWith(e + ":") ? n.slice(e.length + 1) : null;
}
function k(n) {
  D.forEach((e) => e(n));
}
let L = !1;
function N() {
  T || (L = !1, T = new U(), T.onopen = () => {
    L && k({ type: "reconnected" }), L = !0;
  }, T.onmessage = (n) => {
    let e;
    try {
      e = JSON.parse(n.data);
    } catch {
      return;
    }
    const t = e.data ?? {}, a = Te(t.session_id);
    if (a !== null)
      switch (e.type) {
        case "chat_user_message":
          k({
            type: "message",
            thread: a,
            message: {
              id: String(t.id ?? ""),
              role: "user",
              content: String(t.content ?? ""),
              createdAt: Number(t.createdAt ?? Date.now())
            }
          });
          break;
        case "chat_stream":
          typeof t.content == "string" && t.content && k({ type: "stream", thread: a, text: t.content });
          break;
        case "chat_complete":
          if (t.stop_reason === "queued_into_running_turn") break;
          k({ type: "complete", thread: a, notice: typeof t.stop_notice == "string" ? t.stop_notice : void 0 });
          break;
        case "chat_error":
          k({ type: "error", thread: a, error: String(t.error ?? "Something went wrong. Try again.") });
          break;
        case "chat_cancelled":
          k({ type: "stopped", thread: a });
          break;
        case "chat_waiting":
          k({ type: "waiting", thread: a });
          break;
      }
  });
}
class re extends Error {
  constructor(e, t) {
    super(t), this.status = e;
  }
}
async function F(n, e) {
  const t = await fetch(se(n), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(e)
  });
  if (!t.ok) throw new re(t.status, await t.text() || `chat: ${t.status}`);
  return t;
}
const I = {
  /** The conversation so far, oldest first (the last 50, or `limit`). */
  async history(n) {
    const e = new URLSearchParams();
    n != null && n.thread && e.set("thread", n.thread), n != null && n.before && e.set("before", n.before), n != null && n.limit && e.set("limit", String(n.limit));
    const t = e.toString();
    N();
    const a = await fetch(se(t ? `?${t}` : ""));
    if (!a.ok) throw new Error(await a.text() || `chat: ${a.status}`);
    const s = await a.json();
    return { messages: s.messages ?? [], running: !!s.running, waiting: !!s.waiting, hasMore: !!s.hasMore };
  },
  /** Say something to the employee. The reply arrives through `onMessage`.
   *  One message at a time: while a reply is on its way, a send is refused
   *  (stop it or wait). */
  async send(n, e) {
    N(), await F("", { message: n, thread: e == null ? void 0 : e.thread, scope: e == null ? void 0 : e.scope, context: V });
  },
  /** Stop the turn running in the conversation. */
  async stop(n) {
    N(), await F("/stop", { thread: n == null ? void 0 : n.thread });
  },
  /** Start the conversation over; the one before stays with the owner. */
  async newThread(n) {
    N(), await F("/new", { thread: n == null ? void 0 : n.thread }), f && f.thread === ((n == null ? void 0 : n.thread) || void 0) && f.reset();
  },
  /** Hear the conversation live: words sent (from any open view), the
   *  reply as it streams, and how each turn ends. Returns an unsubscribe. */
  onMessage(n) {
    return N(), D.add(n), () => {
      D.delete(n), X();
    };
  },
  /** What is on the page, sent beside every message. `null` clears it. */
  setContext(n) {
    V = n;
  },
  /** A ready chat with the employee, drawn inside `element`. */
  mount(n, e) {
    f == null || f.destroy(), f = Oe(n, e ?? {});
  },
  unmount() {
    f == null || f.destroy(), f = null, X();
  }
};
function X() {
  D.size || f || !T || (T.close(), T = null);
}
let f = null;
const Z = "nebo-chat-style", Ce = `
.nebo-chat{--nc-bg:#fff;--nc-fg:#16181d;--nc-muted:#6b7280;--nc-line:#e5e7eb;--nc-me:#16181d;--nc-me-fg:#fff;--nc-them:#f3f4f6;--nc-accent:#4f46e5;
  display:flex;flex-direction:column;height:100%;min-height:0;background:var(--nc-bg);color:var(--nc-fg);
  font:16px/1.6 "Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;border:1px solid var(--nc-line);border-radius:12px;overflow:hidden;box-sizing:border-box}
.nebo-chat *{box-sizing:border-box}
.nebo-chat.nebo-chat--borderless{border:0;border-radius:0}
.nebo-chat.nebo-chat--dark{--nc-bg:#111318;--nc-fg:#eceef2;--nc-muted:#9aa1ad;--nc-line:#262a33;--nc-me:#eceef2;--nc-me-fg:#111318;--nc-them:#1c1f26;--nc-accent:#8b8cf8}
@media (prefers-color-scheme:dark){.nebo-chat.nebo-chat--auto{--nc-bg:#111318;--nc-fg:#eceef2;--nc-muted:#9aa1ad;--nc-line:#262a33;--nc-me:#eceef2;--nc-me-fg:#111318;--nc-them:#1c1f26;--nc-accent:#8b8cf8}}
.nebo-chat__log{flex:1;min-height:0;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:12px}
.nebo-chat__empty{margin:auto;color:var(--nc-muted);text-align:center;font-size:15px}
.nebo-chat__msg{max-width:85%;padding:10px 14px;border-radius:18px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}
.nebo-chat__msg--user{align-self:flex-end;background:var(--nc-me);color:var(--nc-me-fg);border-bottom-right-radius:6px}
.nebo-chat__msg--assistant{align-self:flex-start;background:var(--nc-them);border-bottom-left-radius:6px}
.nebo-chat__msg--error{align-self:center;background:transparent;color:#dc2626;font-size:14px;padding:4px 8px}

.nebo-chat__msg--waiting{color:var(--nc-muted);font-size:14px}
.nebo-chat__msg--note{align-self:center;background:transparent;color:var(--nc-muted);font-size:14px;padding:4px 8px}
.nebo-chat__msg code{font:14px ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(127,127,127,.15);padding:1px 5px;border-radius:5px}
.nebo-chat__msg a{color:inherit;text-decoration:underline}
.nebo-chat__dots{display:inline-flex;gap:4px;align-items:center;height:1.6em}
.nebo-chat__dots i{width:6px;height:6px;border-radius:50%;background:var(--nc-muted);animation:nebo-chat-blink 1.2s infinite ease-in-out}
.nebo-chat__dots i:nth-child(2){animation-delay:.2s}.nebo-chat__dots i:nth-child(3){animation-delay:.4s}
@keyframes nebo-chat-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.nebo-chat__composer{display:flex;gap:8px;align-items:flex-end;padding:12px;border-top:1px solid var(--nc-line)}
.nebo-chat__input{flex:1;resize:none;border:1px solid var(--nc-line);border-radius:14px;padding:10px 14px;background:var(--nc-bg);color:var(--nc-fg);font:inherit;max-height:160px;outline:none}
.nebo-chat__input:focus{border-color:var(--nc-accent)}
.nebo-chat__input::placeholder{color:var(--nc-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nebo-chat__button{flex:none;height:44px;min-width:44px;padding:0 16px;border:0;border-radius:22px;background:var(--nc-accent);color:#fff;font:600 15px/1 inherit;font-family:inherit;cursor:pointer}
.nebo-chat__button:disabled{opacity:.4;cursor:default}
.nebo-chat__button--stop{background:var(--nc-fg);color:var(--nc-bg)}
`;
function Ee() {
  if (document.getElementById(Z)) return;
  const n = document.createElement("style");
  n.id = Z, n.textContent = Ce, document.head.appendChild(n);
}
function w(n, e) {
  const t = document.createElement(n);
  return t.className = e, t;
}
function ee(n, e) {
  n.textContent = "";
  const t = /(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
  let a = 0;
  for (const s of e.matchAll(t)) {
    const o = s.index ?? 0;
    o > a && n.appendChild(document.createTextNode(e.slice(a, o)));
    const d = s[0];
    if (d.startsWith("`"))
      n.appendChild(document.createElement("code")).textContent = d.slice(1, -1);
    else if (d.startsWith("**"))
      n.appendChild(document.createElement("strong")).textContent = d.slice(2, -2);
    else {
      const c = n.appendChild(document.createElement("a"));
      c.href = d, c.target = "_blank", c.rel = "noopener noreferrer", c.textContent = d;
    }
    a = o + d.length;
  }
  a < e.length && n.appendChild(document.createTextNode(e.slice(a)));
}
function Oe(n, e) {
  Ee();
  const t = e.contextId || void 0, a = e.theme ?? "auto", s = w("div", `nebo-chat nebo-chat--${a}${e.borderless ? " nebo-chat--borderless" : ""}`);
  e.height && (s.style.height = e.height);
  const o = w("div", "nebo-chat__log");
  o.setAttribute("role", "log"), o.setAttribute("aria-live", "polite");
  const d = w("form", "nebo-chat__composer"), c = w("textarea", "nebo-chat__input");
  c.rows = 1, c.setAttribute("aria-label", "Message"), c.placeholder = e.placeholder || (e.name ? `Message ${e.name}` : "Message");
  const h = w("button", "nebo-chat__button");
  h.type = "submit", d.append(c, h), s.append(o, d), n.appendChild(s);
  let l = !1, i = null;
  const v = w("div", "nebo-chat__empty");
  v.textContent = e.name ? `Ask ${e.name} anything.` : "Ask anything.";
  const b = () => o.scrollHeight - o.scrollTop - o.clientHeight < 48, E = (r = !1) => {
    (r || b()) && (o.scrollTop = o.scrollHeight);
  }, H = () => {
    o.querySelector(".nebo-chat__msg") ? v.remove() : o.appendChild(v);
  }, S = (r, y) => {
    v.remove();
    const R = w("div", `nebo-chat__msg nebo-chat__msg--${r}`);
    return ee(R, y), o.appendChild(R), R;
  }, oe = () => {
    const r = w("div", "nebo-chat__msg nebo-chat__msg--assistant");
    return r.appendChild(w("span", "nebo-chat__dots")).append(document.createElement("i"), document.createElement("i"), document.createElement("i")), v.remove(), o.appendChild(r), r;
  }, q = () => {
    !i || i.text || (i.node.classList.add("nebo-chat__msg--waiting"), i.node.textContent = e.name ? `${e.name} is waiting for your OK in Nebo.` : "Waiting for your OK in Nebo.");
  }, m = (r) => {
    l = r, h.textContent = r ? "Stop" : "Send", h.classList.toggle("nebo-chat__button--stop", r), h.disabled = !r && !c.value.trim(), r && !i && (i = { node: oe(), text: "" }, E(!0)), r || (i && !i.text && i.node.remove(), i = null, H());
  }, B = () => {
    c.style.height = "auto", c.style.height = `${Math.min(c.scrollHeight, 160)}px`, l || (h.disabled = !c.value.trim());
  }, K = async () => {
    m(!1), o.textContent = "";
    try {
      const r = await I.history({ thread: t });
      for (const y of r.messages) S(y.role, y.content);
      H(), m(r.running), r.running && r.waiting && q(), E(!0);
    } catch {
      S("error", "Could not load the conversation. Try again.");
    }
  }, ce = I.onMessage((r) => {
    if (r.type === "reconnected") {
      K();
      return;
    }
    r.thread === t && (r.type === "waiting" ? (i || m(!0), q()) : r.type === "message" ? l || (S("user", r.message.content), m(!0)) : r.type === "stream" ? (i || m(!0), i && (i.text += r.text, i.node.classList.remove("nebo-chat__msg--waiting"), i.node.textContent = "", ee(i.node, i.text), E())) : r.type === "error" ? (m(!1), S("error", r.error), E()) : (m(!1), r.type === "complete" && r.notice && S("note", r.notice)));
  }), G = async () => {
    if (l) {
      try {
        await I.stop({ thread: t });
      } catch {
      }
      return;
    }
    const r = c.value.trim();
    if (r) {
      c.value = "", B(), S("user", r), m(!0);
      try {
        await I.send(r, { thread: t, scope: e.scope });
      } catch (y) {
        m(!1), S("error", y instanceof re && y.status === 409 ? y.message : "Could not send. Try again.");
      }
    }
  };
  return d.addEventListener("submit", (r) => {
    r.preventDefault(), G();
  }), c.addEventListener("input", B), c.addEventListener("keydown", (r) => {
    r.key === "Enter" && !r.shiftKey && !r.isComposing && (r.preventDefault(), G());
  }), m(!1), K(), {
    thread: t,
    reset() {
      o.textContent = "", m(!1);
    },
    destroy() {
      ce(), s.remove();
    }
  };
}
class Ne {
  constructor() {
    this.fetch = le, this.WebSocket = U, this.storage = fe, this.agents = pe, this.janus = me, this.decide = ge, this.share = be, this.listen = te, this.files = _e, this.plugins = ve, this.surfaces = A, this.a2ui = M, this.identity = $e, this.chat = I, A._a2uiHandler = (e) => M._handleMessage(e), M._setSendFn((e) => A._rawSend(e));
  }
  /**
   * Manually configure the SDK (optional — auto-detection works in most cases).
   */
  configure(e) {
    e.appId && ie(e.appId), e.baseUrl && de(e.baseUrl);
  }
}
const Ie = new Ne();
export {
  re as ChatError,
  ke as NeboA2UI,
  Ne as NeboSDK,
  Se as NeboSurfaces,
  U as NeboWebSocket,
  M as a2ui,
  pe as agents,
  I as chat,
  ge as decide,
  _e as files,
  u as getAppId,
  p as getBaseUrl,
  $e as identity,
  me as janus,
  te as listen,
  Ie as nebo,
  le as neboFetch,
  ve as plugins,
  ie as setAppId,
  de as setBaseUrl,
  be as share,
  fe as storage,
  A as surfaces
};
