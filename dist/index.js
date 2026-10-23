let y = null, w = null;
function f() {
  if (y) return y;
  if (window.location.protocol === "neboapp:")
    return y = window.location.hostname, y;
  const t = window.location.pathname.match(/^(?:\/t\/[^/]+)?(?:\/k\/[^/]+)?\/apps\/([^/]+)\/ui(?:\/|$)/);
  if (t)
    return y = decodeURIComponent(t[1]), y;
  const e = document.querySelector('meta[name="nebo-app-id"]');
  if (e)
    return y = e.getAttribute("content") || "", y;
  throw new Error(
    '[nebo-sdk] Cannot detect app ID. In production, serve from /apps/{id}/ui/. In dev, add <meta name="nebo-app-id" content="your-id"> to index.html.'
  );
}
function m() {
  if (w) return w;
  const t = document.querySelector('meta[name="nebo-base-url"]');
  return t ? (w = t.getAttribute("content") || "", w) : window.location.protocol === "neboapp:" ? (w = "http://localhost:27895", w) : (w = window.location.origin, w);
}
function ee(t) {
  y = t;
}
function te(t) {
  w = t;
}
async function ne(t, e) {
  const n = f(), a = m();
  if (t.startsWith("http://") || t.startsWith("https://")) {
    const d = `${a}/api/v1/apps/${n}/http/proxy`, i = {};
    e != null && e.headers && new Headers(e.headers).forEach((I, k) => {
      i[k] = I;
    });
    const h = {
      url: t,
      method: (e == null ? void 0 : e.method) || "GET",
      headers: i,
      body: e != null && e.body ? String(e.body) : void 0
    }, l = await fetch(d, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(h)
    });
    if (!l.ok) return l;
    const c = await l.json();
    return new Response(c.body, {
      status: c.status,
      headers: c.headers
    });
  }
  const s = t.startsWith("/") ? t : `/${t}`, o = `${a}/api/v1/apps/${n}/api${s}`;
  return fetch(o, e);
}
class N {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectDelay = 1e3, this.maxReconnectDelay = 3e4, this._closed = !1, this.onopen = null, this.onmessage = null, this.onerror = null, this.onclose = null;
    const n = f(), s = m().replace(/^http/, "ws");
    this.url = `${s}/ws/app/${n}`, this.connect();
  }
  connect() {
    this._closed || (this.ws = new WebSocket(this.url), this.ws.onopen = (e) => {
      var n;
      this.reconnectDelay = 1e3, (n = this.onopen) == null || n.call(this, e);
    }, this.ws.onmessage = (e) => {
      var n;
      return (n = this.onmessage) == null ? void 0 : n.call(this, e);
    }, this.ws.onerror = (e) => {
      var n;
      return (n = this.onerror) == null ? void 0 : n.call(this, e);
    }, this.ws.onclose = (e) => {
      var n;
      (n = this.onclose) == null || n.call(this, e), this._closed || this.scheduleReconnect();
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
    var n;
    (n = this.ws) == null || n.send(e);
  }
  close(e, n) {
    var a;
    this._closed = !0, this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), (a = this.ws) == null || a.close(e, n);
  }
}
const W = /* @__PURE__ */ new Set();
let D = null;
function ae() {
  D || (D = new N(), D.onmessage = (t) => {
    let e;
    try {
      e = JSON.parse(t.data);
    } catch {
      return;
    }
    e.type !== "app_data_changed" || !e.data || e.data.appId && e.data.appId !== f() || W.forEach((n) => n(e.data));
  });
}
function se(t) {
  if (typeof t != "string") return t;
  let e;
  try {
    e = JSON.parse(t);
  } catch {
    return t;
  }
  if (typeof e != "string") return e;
  try {
    return JSON.parse(e);
  } catch {
    return e;
  }
}
function T(t) {
  const e = f(), n = m();
  return t ? `${n}/api/v1/apps/${e}/storage/${encodeURIComponent(t)}` : `${n}/api/v1/apps/${e}/storage`;
}
const re = {
  async getItem(t) {
    const e = await fetch(T(t));
    if (e.status === 404) return null;
    const n = await e.json();
    return se(n.value);
  },
  async setItem(t, e) {
    const n = typeof e == "string" ? e : JSON.stringify(e);
    await fetch(T(t), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: n })
    });
  },
  async removeItem(t) {
    await fetch(T(t), { method: "DELETE" });
  },
  async clear() {
    const t = await this.keys();
    await Promise.all(t.map((e) => this.removeItem(e)));
  },
  async keys() {
    return ((await (await fetch(T())).json()).items || []).map((n) => n[0]);
  },
  /**
   * Call `handler` after every change to the store: the employee's writes
   * and other open views'. Returns a function that stops listening.
   */
  onChange(t) {
    return W.add(t), ae(), () => {
      W.delete(t);
    };
  }
};
function H(t) {
  const e = f();
  return `${m()}/api/v1/apps/${e}/agents/${t}`;
}
const oe = {
  async invoke(t, e) {
    return (await fetch(H("invoke"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: t,
        agent: e == null ? void 0 : e.agent,
        data: e == null ? void 0 : e.data
      })
    })).json();
  },
  async *stream(t, e) {
    const n = await fetch(H("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: t,
        agent: e == null ? void 0 : e.agent,
        data: e == null ? void 0 : e.data
      })
    });
    if (!n.body)
      throw new Error("No response body for streaming");
    const a = n.body.getReader(), s = new TextDecoder();
    let o = "";
    for (; ; ) {
      const { done: d, value: i } = await a.read();
      if (d) break;
      o += s.decode(i, { stream: !0 });
      const h = o.split(`
`);
      o = h.pop() || "";
      for (const l of h)
        if (l.startsWith("data: ")) {
          const c = l.slice(6);
          if (c === "[DONE]") return;
          try {
            yield JSON.parse(c);
          } catch {
            yield { text: c, done: !1 };
          }
        }
    }
  }
};
function q(t) {
  const e = f();
  return `${m()}/api/v1/apps/${e}/janus/${t}`;
}
const ce = {
  async complete(t) {
    const n = await (await fetch(q("complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t)
    })).json();
    return n.text || n.content || "";
  },
  async *stream(t) {
    const e = await fetch(q("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t)
    });
    if (!e.body)
      throw new Error("No response body for streaming");
    const n = e.body.getReader(), a = new TextDecoder();
    let s = "";
    for (; ; ) {
      const { done: o, value: d } = await n.read();
      if (o) break;
      s += a.decode(d, { stream: !0 });
      const i = s.split(`
`);
      s = i.pop() || "";
      for (const h of i)
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
async function ie(t) {
  const e = await fetch(`${m()}/api/v1/apps/${f()}/janus/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t)
  }), n = await e.json().catch(() => ({}));
  if (!e.ok)
    throw new Error(n.error || `decide failed (${e.status})`);
  return n;
}
async function de(t) {
  const e = new URLSearchParams(window.location.search), n = e.get("thread") || "", a = e.get("client") || "", s = await fetch(`${m()}/api/v1/apps/${f()}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: t.name, content: t.content, thread: n, client: a })
  }), o = await s.json().catch(() => ({}));
  if (!s.ok)
    throw new Error(o.error || `share failed (${s.status})`);
  return o;
}
const le = {
  /**
   * `files.url('Media/Projects/reel/render.mp4')`. A path with a `.` or `..`
   * part names nothing inside a granted folder and is refused here.
   */
  url(t) {
    const e = t.split("/").filter((s) => s !== "");
    if (e.some((s) => s === "." || s === ".."))
      throw new Error(`[nebo-sdk] files.url: "${t}" climbs out of its folder; name the file inside the granted folder`);
    const n = encodeURIComponent(f()), a = e.map(encodeURIComponent).join("/");
    return `${m()}/api/v1/apps/${n}/files/${a}`;
  }
};
class he {
  constructor() {
    this.ws = null, this.listeners = /* @__PURE__ */ new Map(), this._connected = !1, this._a2uiHandler = null, this.state = {};
  }
  /** Whether the WebSocket is connected */
  get connected() {
    return this._connected;
  }
  /** Connect to the app's surface WebSocket */
  connect() {
    this.ws || (this.ws = new N(), this.ws.onopen = () => {
      this._connected = !0;
    }, this.ws.onmessage = (e) => {
      var n, a;
      try {
        const s = JSON.parse(e.data);
        if (s.type === "a2ui_message" && ((n = s.data) != null && n.message)) {
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
  on(e, n) {
    return this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set()), this.listeners.get(e).add(n), () => {
      var a;
      (a = this.listeners.get(e)) == null || a.delete(n);
    };
  }
  /** Remove a specific listener */
  off(e, n) {
    var a;
    (a = this.listeners.get(e)) == null || a.delete(n);
  }
  /** Send an action/event to the agent */
  send(e, n) {
    !this.ws || this.ws.readyState !== WebSocket.OPEN || this.ws.send(JSON.stringify({ type: "action", name: e, ...n }));
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
    const n = this.listeners.get(e.type);
    if (n)
      for (const s of n)
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
    for (const n of e) {
      const a = n.path.split("/").filter(Boolean);
      if (a.length === 0) continue;
      const s = this.resolveParent(a);
      if (!s) continue;
      const o = a[a.length - 1];
      switch (n.op) {
        case "add":
        case "replace":
          s[o] = n.value;
          break;
        case "remove":
          delete s[o];
          break;
      }
    }
  }
  resolveParent(e) {
    let n = this.state;
    for (let a = 0; a < e.length - 1; a++) {
      if (n == null || typeof n != "object") return null;
      n = n[e[a]];
    }
    return n;
  }
}
const U = new he();
class ue {
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
      } catch (n) {
        console.error("[nebo-sdk] A2UI processing error:", n);
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
  sendAction(e, n) {
    this.sendFn && this.sendFn(JSON.stringify({
      type: "a2ui_action",
      data: {
        surface_id: e,
        message: {
          version: "v0.9",
          action: {
            surfaceId: e,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ...n
          }
        }
      }
    }));
  }
  /**
   * Send a v0.9 client error report back to the agent.
   */
  sendError(e, n, a, s) {
    this.sendFn && this.sendFn(JSON.stringify({
      type: "a2ui_action",
      data: {
        surface_id: e,
        message: {
          version: "v0.9",
          error: { code: n, surfaceId: e, message: a, path: s }
        }
      }
    }));
  }
}
const J = new ue();
let $ = null;
const fe = {
  async get() {
    if ($) return $;
    const t = f(), e = m(), n = await fetch(`${e}/api/v1/apps/${t}/identity`);
    if (!n.ok)
      throw new Error(`[nebo-sdk] identity fetch failed: ${n.status}`);
    return $ = await n.json(), $;
  },
  invalidate() {
    $ = null;
  }
}, O = /* @__PURE__ */ new Set();
let v = null, B = null;
function Q(t = "") {
  return `${m()}/api/v1/apps/${encodeURIComponent(f())}/chat${t}`;
}
function pe(t) {
  if (typeof t != "string") return null;
  const e = `agent:${f()}:page`;
  if (t !== e)
    return t.startsWith(e + ":") ? t.slice(e.length + 1) : null;
}
function x(t) {
  O.forEach((e) => e(t));
}
let R = !1;
function C() {
  v || (R = !1, v = new N(), v.onopen = () => {
    R && x({ type: "reconnected" }), R = !0;
  }, v.onmessage = (t) => {
    let e;
    try {
      e = JSON.parse(t.data);
    } catch {
      return;
    }
    const n = e.data ?? {}, a = pe(n.session_id);
    if (a !== null)
      switch (e.type) {
        case "chat_user_message":
          x({
            type: "message",
            thread: a,
            message: {
              id: String(n.id ?? ""),
              role: "user",
              content: String(n.content ?? ""),
              createdAt: Number(n.createdAt ?? Date.now())
            }
          });
          break;
        case "chat_stream":
          typeof n.content == "string" && n.content && x({ type: "stream", thread: a, text: n.content });
          break;
        case "chat_complete":
          if (n.stop_reason === "queued_into_running_turn") break;
          x({ type: "complete", thread: a, notice: typeof n.stop_notice == "string" ? n.stop_notice : void 0 });
          break;
        case "chat_error":
          x({ type: "error", thread: a, error: String(n.error ?? "Something went wrong. Try again.") });
          break;
        case "chat_cancelled":
          x({ type: "stopped", thread: a });
          break;
        case "chat_waiting":
          x({ type: "waiting", thread: a });
          break;
      }
  });
}
class V extends Error {
  constructor(e, n) {
    super(n), this.status = e;
  }
}
async function P(t, e) {
  const n = await fetch(Q(t), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(e)
  });
  if (!n.ok) throw new V(n.status, await n.text() || `chat: ${n.status}`);
  return n;
}
const E = {
  /** The conversation so far, oldest first (the last 50, or `limit`). */
  async history(t) {
    const e = new URLSearchParams();
    t != null && t.thread && e.set("thread", t.thread), t != null && t.before && e.set("before", t.before), t != null && t.limit && e.set("limit", String(t.limit));
    const n = e.toString();
    C();
    const a = await fetch(Q(n ? `?${n}` : ""));
    if (!a.ok) throw new Error(await a.text() || `chat: ${a.status}`);
    const s = await a.json();
    return { messages: s.messages ?? [], running: !!s.running, waiting: !!s.waiting, hasMore: !!s.hasMore };
  },
  /** Say something to the employee. The reply arrives through `onMessage`.
   *  One message at a time: while a reply is on its way, a send is refused
   *  (stop it or wait). */
  async send(t, e) {
    C(), await P("", { message: t, thread: e == null ? void 0 : e.thread, scope: e == null ? void 0 : e.scope, context: B });
  },
  /** Stop the turn running in the conversation. */
  async stop(t) {
    C(), await P("/stop", { thread: t == null ? void 0 : t.thread });
  },
  /** Start the conversation over; the one before stays with the owner. */
  async newThread(t) {
    C(), await P("/new", { thread: t == null ? void 0 : t.thread }), u && u.thread === ((t == null ? void 0 : t.thread) || void 0) && u.reset();
  },
  /** Hear the conversation live: words sent (from any open view), the
   *  reply as it streams, and how each turn ends. Returns an unsubscribe. */
  onMessage(t) {
    return C(), O.add(t), () => {
      O.delete(t), K();
    };
  },
  /** What is on the page, sent beside every message. `null` clears it. */
  setContext(t) {
    B = t;
  },
  /** A ready chat with the employee, drawn inside `element`. */
  mount(t, e) {
    u == null || u.destroy(), u = be(t, e ?? {});
  },
  unmount() {
    u == null || u.destroy(), u = null, K();
  }
};
function K() {
  O.size || u || !v || (v.close(), v = null);
}
let u = null;
const G = "nebo-chat-style", me = `
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
function ge() {
  if (document.getElementById(G)) return;
  const t = document.createElement("style");
  t.id = G, t.textContent = me, document.head.appendChild(t);
}
function b(t, e) {
  const n = document.createElement(t);
  return n.className = e, n;
}
function Y(t, e) {
  t.textContent = "";
  const n = /(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
  let a = 0;
  for (const s of e.matchAll(n)) {
    const o = s.index ?? 0;
    o > a && t.appendChild(document.createTextNode(e.slice(a, o)));
    const d = s[0];
    if (d.startsWith("`"))
      t.appendChild(document.createElement("code")).textContent = d.slice(1, -1);
    else if (d.startsWith("**"))
      t.appendChild(document.createElement("strong")).textContent = d.slice(2, -2);
    else {
      const i = t.appendChild(document.createElement("a"));
      i.href = d, i.target = "_blank", i.rel = "noopener noreferrer", i.textContent = d;
    }
    a = o + d.length;
  }
  a < e.length && t.appendChild(document.createTextNode(e.slice(a)));
}
function be(t, e) {
  ge();
  const n = e.contextId || void 0, a = e.theme ?? "auto", s = b("div", `nebo-chat nebo-chat--${a}${e.borderless ? " nebo-chat--borderless" : ""}`);
  e.height && (s.style.height = e.height);
  const o = b("div", "nebo-chat__log");
  o.setAttribute("role", "log"), o.setAttribute("aria-live", "polite");
  const d = b("form", "nebo-chat__composer"), i = b("textarea", "nebo-chat__input");
  i.rows = 1, i.setAttribute("aria-label", "Message"), i.placeholder = e.placeholder || (e.name ? `Message ${e.name}` : "Message");
  const h = b("button", "nebo-chat__button");
  h.type = "submit", d.append(i, h), s.append(o, d), t.appendChild(s);
  let l = !1, c = null;
  const S = b("div", "nebo-chat__empty");
  S.textContent = e.name ? `Ask ${e.name} anything.` : "Ask anything.";
  const I = () => o.scrollHeight - o.scrollTop - o.clientHeight < 48, k = (r = !1) => {
    (r || I()) && (o.scrollTop = o.scrollHeight);
  }, A = () => {
    o.querySelector(".nebo-chat__msg") ? S.remove() : o.appendChild(S);
  }, _ = (r, g) => {
    S.remove();
    const j = b("div", `nebo-chat__msg nebo-chat__msg--${r}`);
    return Y(j, g), o.appendChild(j), j;
  }, X = () => {
    const r = b("div", "nebo-chat__msg nebo-chat__msg--assistant");
    return r.appendChild(b("span", "nebo-chat__dots")).append(document.createElement("i"), document.createElement("i"), document.createElement("i")), S.remove(), o.appendChild(r), r;
  }, M = () => {
    !c || c.text || (c.node.classList.add("nebo-chat__msg--waiting"), c.node.textContent = e.name ? `${e.name} is waiting for your OK in Nebo.` : "Waiting for your OK in Nebo.");
  }, p = (r) => {
    l = r, h.textContent = r ? "Stop" : "Send", h.classList.toggle("nebo-chat__button--stop", r), h.disabled = !r && !i.value.trim(), r && !c && (c = { node: X(), text: "" }, k(!0)), r || (c && !c.text && c.node.remove(), c = null, A());
  }, L = () => {
    i.style.height = "auto", i.style.height = `${Math.min(i.scrollHeight, 160)}px`, l || (h.disabled = !i.value.trim());
  }, F = async () => {
    p(!1), o.textContent = "";
    try {
      const r = await E.history({ thread: n });
      for (const g of r.messages) _(g.role, g.content);
      A(), p(r.running), r.running && r.waiting && M(), k(!0);
    } catch {
      _("error", "Could not load the conversation. Try again.");
    }
  }, Z = E.onMessage((r) => {
    if (r.type === "reconnected") {
      F();
      return;
    }
    r.thread === n && (r.type === "waiting" ? (c || p(!0), M()) : r.type === "message" ? l || (_("user", r.message.content), p(!0)) : r.type === "stream" ? (c || p(!0), c && (c.text += r.text, c.node.classList.remove("nebo-chat__msg--waiting"), c.node.textContent = "", Y(c.node, c.text), k())) : r.type === "error" ? (p(!1), _("error", r.error), k()) : (p(!1), r.type === "complete" && r.notice && _("note", r.notice)));
  }), z = async () => {
    if (l) {
      try {
        await E.stop({ thread: n });
      } catch {
      }
      return;
    }
    const r = i.value.trim();
    if (r) {
      i.value = "", L(), _("user", r), p(!0);
      try {
        await E.send(r, { thread: n, scope: e.scope });
      } catch (g) {
        p(!1), _("error", g instanceof V && g.status === 409 ? g.message : "Could not send. Try again.");
      }
    }
  };
  return d.addEventListener("submit", (r) => {
    r.preventDefault(), z();
  }), i.addEventListener("input", L), i.addEventListener("keydown", (r) => {
    r.key === "Enter" && !r.shiftKey && !r.isComposing && (r.preventDefault(), z());
  }), p(!1), F(), {
    thread: n,
    reset() {
      o.textContent = "", p(!1);
    },
    destroy() {
      Z(), s.remove();
    }
  };
}
class ye {
  constructor() {
    this.fetch = ne, this.WebSocket = N, this.storage = re, this.agents = oe, this.janus = ce, this.decide = ie, this.share = de, this.files = le, this.surfaces = U, this.a2ui = J, this.identity = fe, this.chat = E, U._a2uiHandler = (e) => J._handleMessage(e), J._setSendFn((e) => U._rawSend(e));
  }
  /**
   * Manually configure the SDK (optional — auto-detection works in most cases).
   */
  configure(e) {
    e.appId && ee(e.appId), e.baseUrl && te(e.baseUrl);
  }
}
const we = new ye();
export {
  V as ChatError,
  ue as NeboA2UI,
  ye as NeboSDK,
  he as NeboSurfaces,
  N as NeboWebSocket,
  J as a2ui,
  oe as agents,
  E as chat,
  ie as decide,
  le as files,
  f as getAppId,
  m as getBaseUrl,
  fe as identity,
  ce as janus,
  we as nebo,
  ne as neboFetch,
  ee as setAppId,
  te as setBaseUrl,
  de as share,
  re as storage,
  U as surfaces
};
