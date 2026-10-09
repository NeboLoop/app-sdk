let d = null, h = null;
function i() {
  if (d) return d;
  if (window.location.protocol === "neboapp:")
    return d = window.location.hostname, d;
  const s = window.location.pathname.match(/^\/apps\/([^/]+)\/ui/);
  if (s)
    return d = s[1], d;
  const e = document.querySelector('meta[name="nebo-app-id"]');
  if (e)
    return d = e.getAttribute("content") || "", d;
  throw new Error(
    '[nebo-sdk] Cannot detect app ID. In production, serve from /apps/{id}/ui/. In dev, add <meta name="nebo-app-id" content="your-id"> to index.html.'
  );
}
function l() {
  if (h) return h;
  if (window.location.protocol === "neboapp:")
    return h = "http://localhost:27895", h;
  const s = document.querySelector('meta[name="nebo-base-url"]');
  return s ? (h = s.getAttribute("content") || "", h) : (h = window.location.origin, h);
}
function k(s) {
  d = s;
}
function x(s) {
  h = s;
}
async function D(s, e) {
  const t = i(), n = l();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    const f = `${n}/api/v1/apps/${t}/http/proxy`, r = {};
    e != null && e.headers && new Headers(e.headers).forEach((E, j) => {
      r[j] = E;
    });
    const p = {
      url: s,
      method: (e == null ? void 0 : e.method) || "GET",
      headers: r,
      body: e != null && e.body ? String(e.body) : void 0
    }, u = await (await fetch(f, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p)
    })).json();
    return new Response(u.body, {
      status: u.status,
      headers: u.headers
    });
  }
  const a = s.startsWith("/") ? s : `/${s}`, c = `${n}/api/v1/apps/${t}/api${a}`;
  return fetch(c, e);
}
class N {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectDelay = 1e3, this.maxReconnectDelay = 3e4, this._closed = !1, this.onopen = null, this.onmessage = null, this.onerror = null, this.onclose = null;
    const t = i(), a = l().replace(/^http/, "ws");
    this.url = `${a}/ws/app/${t}`, this.connect();
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
    var n;
    this._closed = !0, this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), (n = this.ws) == null || n.close(e, t);
  }
}
const T = /* @__PURE__ */ new Set();
let _ = null;
function J() {
  _ || (_ = new N(), _.onmessage = (s) => {
    let e;
    try {
      e = JSON.parse(s.data);
    } catch {
      return;
    }
    e.type !== "app_data_changed" || !e.data || e.data.appId && e.data.appId !== i() || T.forEach((t) => t(e.data));
  });
}
function C(s) {
  if (typeof s != "string") return s;
  let e;
  try {
    e = JSON.parse(s);
  } catch {
    return s;
  }
  if (typeof e != "string") return e;
  try {
    return JSON.parse(e);
  } catch {
    return e;
  }
}
function b(s) {
  const e = i(), t = l();
  return s ? `${t}/api/v1/apps/${e}/storage/${encodeURIComponent(s)}` : `${t}/api/v1/apps/${e}/storage`;
}
const P = {
  async getItem(s) {
    const e = await fetch(b(s));
    if (e.status === 404) return null;
    const t = await e.json();
    return C(t.value);
  },
  async setItem(s, e) {
    const t = typeof e == "string" ? e : JSON.stringify(e);
    await fetch(b(s), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: t })
    });
  },
  async removeItem(s) {
    await fetch(b(s), { method: "DELETE" });
  },
  async clear() {
    const s = await this.keys();
    await Promise.all(s.map((e) => this.removeItem(e)));
  },
  async keys() {
    return ((await (await fetch(b())).json()).items || []).map((t) => t[0]);
  },
  /**
   * Call `handler` after every change to the store: the employee's writes
   * and other open views'. Returns a function that stops listening.
   */
  onChange(s) {
    return T.add(s), J(), () => {
      T.delete(s);
    };
  }
};
function v(s) {
  const e = i();
  return `${l()}/api/v1/apps/${e}/agents/${s}`;
}
const U = {
  async invoke(s, e) {
    return (await fetch(v("invoke"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: s,
        agent: e == null ? void 0 : e.agent,
        data: e == null ? void 0 : e.data
      })
    })).json();
  },
  async *stream(s, e) {
    const t = await fetch(v("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: s,
        agent: e == null ? void 0 : e.agent,
        data: e == null ? void 0 : e.data
      })
    });
    if (!t.body)
      throw new Error("No response body for streaming");
    const n = t.body.getReader(), a = new TextDecoder();
    let c = "";
    for (; ; ) {
      const { done: f, value: r } = await n.read();
      if (f) break;
      c += a.decode(r, { stream: !0 });
      const p = c.split(`
`);
      c = p.pop() || "";
      for (const y of p)
        if (y.startsWith("data: ")) {
          const u = y.slice(6);
          if (u === "[DONE]") return;
          try {
            yield JSON.parse(u);
          } catch {
            yield { text: u, done: !1 };
          }
        }
    }
  }
};
function I(s) {
  const e = i();
  return `${l()}/api/v1/apps/${e}/janus/${s}`;
}
const W = {
  async complete(s) {
    const t = await (await fetch(I("complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s)
    })).json();
    return t.text || t.content || "";
  },
  async *stream(s) {
    const e = await fetch(I("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s)
    });
    if (!e.body)
      throw new Error("No response body for streaming");
    const t = e.body.getReader(), n = new TextDecoder();
    let a = "";
    for (; ; ) {
      const { done: c, value: f } = await t.read();
      if (c) break;
      a += n.decode(f, { stream: !0 });
      const r = a.split(`
`);
      a = r.pop() || "";
      for (const p of r)
        if (p.startsWith("data: ")) {
          const y = p.slice(6);
          if (y === "[DONE]") return;
          try {
            yield JSON.parse(y).text;
          } catch {
            yield y;
          }
        }
    }
  }
};
async function R(s) {
  const e = await fetch(`${l()}/api/v1/apps/${i()}/janus/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s)
  }), t = await e.json().catch(() => ({}));
  if (!e.ok)
    throw new Error(t.error || `decide failed (${e.status})`);
  return t;
}
async function F(s) {
  const e = new URLSearchParams(window.location.search), t = e.get("thread") || "", n = e.get("client") || "", a = await fetch(`${l()}/api/v1/apps/${i()}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: s.name, content: s.content, thread: t, client: n })
  }), c = await a.json().catch(() => ({}));
  if (!a.ok)
    throw new Error(c.error || `share failed (${a.status})`);
  return c;
}
class M {
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
      var t, n;
      try {
        const a = JSON.parse(e.data);
        if (a.type === "a2ui_message" && ((t = a.data) != null && t.message)) {
          (n = this._a2uiHandler) == null || n.call(this, a.data.message);
          return;
        }
        this.handleEvent(a);
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
      var n;
      (n = this.listeners.get(e)) == null || n.delete(t);
    };
  }
  /** Remove a specific listener */
  off(e, t) {
    var n;
    (n = this.listeners.get(e)) == null || n.delete(t);
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
      for (const a of t)
        try {
          a(e);
        } catch {
        }
    const n = this.listeners.get("*");
    if (n)
      for (const a of n)
        try {
          a(e);
        } catch {
        }
  }
  applyDelta(e) {
    for (const t of e) {
      const n = t.path.split("/").filter(Boolean);
      if (n.length === 0) continue;
      const a = this.resolveParent(n);
      if (!a) continue;
      const c = n[n.length - 1];
      switch (t.op) {
        case "add":
        case "replace":
          a[c] = t.value;
          break;
        case "remove":
          delete a[c];
          break;
      }
    }
  }
  resolveParent(e) {
    let t = this.state;
    for (let n = 0; n < e.length - 1; n++) {
      if (t == null || typeof t != "object") return null;
      t = t[e[n]];
    }
    return t;
  }
}
const $ = new M();
class A {
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
  sendError(e, t, n, a) {
    this.sendFn && this.sendFn(JSON.stringify({
      type: "a2ui_action",
      data: {
        surface_id: e,
        message: {
          version: "v0.9",
          error: { code: t, surfaceId: e, message: n, path: a }
        }
      }
    }));
  }
}
const O = new A();
let w = null;
const L = {
  async get() {
    if (w) return w;
    const s = i(), e = l(), t = await fetch(`${e}/api/v1/apps/${s}/identity`);
    if (!t.ok)
      throw new Error(`[nebo-sdk] identity fetch failed: ${t.status}`);
    return w = await t.json(), w;
  },
  invalidate() {
    w = null;
  }
};
let o = null, S = null, g = [], m = null;
function H(s) {
  if (!(!s.data || typeof s.data.type != "string") && s.data.type.startsWith("nebo:")) {
    s.data.type === "nebo:resize" && o && s.data.height && (o.style.height = `${s.data.height}px`);
    for (const e of g)
      e(s.data);
  }
}
const q = {
  mount(s, e) {
    o && this.unmount();
    const t = i(), n = l(), a = new URLSearchParams();
    e != null && e.placeholder && a.set("placeholder", e.placeholder), e != null && e.theme && a.set("theme", e.theme), e != null && e.borderless && a.set("borderless", "1"), e != null && e.contextId && a.set("ctx", e.contextId), e != null && e.scope && a.set("scope", e.scope);
    const c = a.toString(), f = `${n}/chat-embed/${t}${c ? "?" + c : ""}`, r = document.createElement("iframe");
    r.src = f, r.style.width = "100%", r.style.height = (e == null ? void 0 : e.height) || "400px", r.style.border = e != null && e.borderless ? "none" : "", r.style.borderRadius = e != null && e.borderless ? "0" : "0.5rem", r.style.colorScheme = "normal", r.setAttribute("allow", "microphone"), s.appendChild(r), o = r, S = s, m = H, window.addEventListener("message", m);
  },
  unmount() {
    o && S && S.removeChild(o), m && (window.removeEventListener("message", m), m = null), o = null, S = null, g = [];
  },
  send(s) {
    var e;
    (e = o == null ? void 0 : o.contentWindow) == null || e.postMessage(
      { type: "nebo:send", message: s },
      "*"
    );
  },
  onMessage(s) {
    return g.push(s), () => {
      g = g.filter((e) => e !== s);
    };
  },
  /**
   * Set app context that gets injected into every agent request from the chat.
   * The agent sees this as invisible context — not rendered in the chat UI.
   *
   * Call this whenever the user navigates or the displayed data changes.
   * Pass null to clear context.
   */
  setContext(s) {
    var e;
    (e = o == null ? void 0 : o.contentWindow) == null || e.postMessage(
      { type: "nebo:set-context", context: s },
      "*"
    );
  },
  newThread() {
    var s;
    (s = o == null ? void 0 : o.contentWindow) == null || s.postMessage(
      { type: "nebo:new-thread" },
      "*"
    );
  }
};
class B {
  constructor() {
    this.fetch = D, this.WebSocket = N, this.storage = P, this.agents = U, this.janus = W, this.decide = R, this.share = F, this.surfaces = $, this.a2ui = O, this.identity = L, this.chat = q, $._a2uiHandler = (e) => O._handleMessage(e), O._setSendFn((e) => $._rawSend(e));
  }
  /**
   * Manually configure the SDK (optional — auto-detection works in most cases).
   */
  configure(e) {
    e.appId && k(e.appId), e.baseUrl && x(e.baseUrl);
  }
}
const G = new B();
export {
  A as NeboA2UI,
  B as NeboSDK,
  M as NeboSurfaces,
  N as NeboWebSocket,
  O as a2ui,
  U as agents,
  q as chat,
  R as decide,
  i as getAppId,
  l as getBaseUrl,
  L as identity,
  W as janus,
  G as nebo,
  D as neboFetch,
  k as setAppId,
  x as setBaseUrl,
  F as share,
  P as storage,
  $ as surfaces
};
