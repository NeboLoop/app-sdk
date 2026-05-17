let i = null, l = null;
function p() {
  if (i) return i;
  if (window.location.protocol === "neboapp:")
    return i = window.location.hostname, i;
  const s = window.location.pathname.match(/^\/apps\/([^/]+)\/ui/);
  if (s)
    return i = s[1], i;
  const e = document.querySelector('meta[name="nebo-app-id"]');
  if (e)
    return i = e.getAttribute("content") || "", i;
  throw new Error(
    '[nebo-sdk] Cannot detect app ID. In production, serve from /apps/{id}/ui/. In dev, add <meta name="nebo-app-id" content="your-id"> to index.html.'
  );
}
function y() {
  if (l) return l;
  if (window.location.protocol === "neboapp:")
    return l = "http://localhost:27895", l;
  const s = document.querySelector('meta[name="nebo-base-url"]');
  return s ? (l = s.getAttribute("content") || "", l) : (l = window.location.origin, l);
}
function E(s) {
  i = s;
}
function x(s) {
  l = s;
}
async function k(s, e) {
  const t = p(), n = y();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    const h = `${n}/api/v1/apps/${t}/http/proxy`, r = {};
    e != null && e.headers && new Headers(e.headers).forEach((N, I) => {
      r[I] = N;
    });
    const u = {
      url: s,
      method: (e == null ? void 0 : e.method) || "GET",
      headers: r,
      body: e != null && e.body ? String(e.body) : void 0
    }, d = await (await fetch(h, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(u)
    })).json();
    return new Response(d.body, {
      status: d.status,
      headers: d.headers
    });
  }
  const a = s.startsWith("/") ? s : `/${s}`, o = `${n}/api/v1/apps/${t}/api${a}`;
  return fetch(o, e);
}
class O {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectDelay = 1e3, this.maxReconnectDelay = 3e4, this._closed = !1, this.onopen = null, this.onmessage = null, this.onerror = null, this.onclose = null;
    const t = p(), a = y().replace(/^http/, "ws");
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
function b(s) {
  const e = p(), t = y();
  return s ? `${t}/api/v1/apps/${e}/storage/${encodeURIComponent(s)}` : `${t}/api/v1/apps/${e}/storage`;
}
const D = {
  async getItem(s) {
    const e = await fetch(b(s));
    if (e.status === 404) return null;
    const t = await e.json();
    try {
      return JSON.parse(t.value);
    } catch {
      return t.value;
    }
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
  }
};
function T(s) {
  const e = p();
  return `${y()}/api/v1/apps/${e}/agents/${s}`;
}
const j = {
  async invoke(s, e) {
    return (await fetch(T("invoke"), {
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
    const t = await fetch(T("stream"), {
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
    let o = "";
    for (; ; ) {
      const { done: h, value: r } = await n.read();
      if (h) break;
      o += a.decode(r, { stream: !0 });
      const u = o.split(`
`);
      o = u.pop() || "";
      for (const f of u)
        if (f.startsWith("data: ")) {
          const d = f.slice(6);
          if (d === "[DONE]") return;
          try {
            yield JSON.parse(d);
          } catch {
            yield { text: d, done: !1 };
          }
        }
    }
  }
};
function $(s) {
  const e = p();
  return `${y()}/api/v1/apps/${e}/janus/${s}`;
}
const W = {
  async complete(s) {
    const t = await (await fetch($("complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s)
    })).json();
    return t.text || t.content || "";
  },
  async *stream(s) {
    const e = await fetch($("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s)
    });
    if (!e.body)
      throw new Error("No response body for streaming");
    const t = e.body.getReader(), n = new TextDecoder();
    let a = "";
    for (; ; ) {
      const { done: o, value: h } = await t.read();
      if (o) break;
      a += n.decode(h, { stream: !0 });
      const r = a.split(`
`);
      a = r.pop() || "";
      for (const u of r)
        if (u.startsWith("data: ")) {
          const f = u.slice(6);
          if (f === "[DONE]") return;
          try {
            yield JSON.parse(f).text;
          } catch {
            yield f;
          }
        }
    }
  }
};
class J {
  constructor() {
    this.ws = null, this.listeners = /* @__PURE__ */ new Map(), this._connected = !1, this._a2uiHandler = null, this.state = {};
  }
  /** Whether the WebSocket is connected */
  get connected() {
    return this._connected;
  }
  /** Connect to the app's surface WebSocket */
  connect() {
    this.ws || (this.ws = new O(), this.ws.onopen = () => {
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
      const o = n[n.length - 1];
      switch (t.op) {
        case "add":
        case "replace":
          a[o] = t.value;
          break;
        case "remove":
          delete a[o];
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
const _ = new J();
class U {
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
const v = new U();
let w = null;
const P = {
  async get() {
    if (w) return w;
    const s = p(), e = y(), t = await fetch(`${e}/api/v1/apps/${s}/identity`);
    if (!t.ok)
      throw new Error(`[nebo-sdk] identity fetch failed: ${t.status}`);
    return w = await t.json(), w;
  },
  invalidate() {
    w = null;
  }
};
let c = null, S = null, g = [], m = null;
function C(s) {
  if (!(!s.data || typeof s.data.type != "string") && s.data.type.startsWith("nebo:")) {
    s.data.type === "nebo:resize" && c && s.data.height && (c.style.height = `${s.data.height}px`);
    for (const e of g)
      e(s.data);
  }
}
const M = {
  mount(s, e) {
    c && this.unmount();
    const t = p(), n = y(), a = new URLSearchParams();
    e != null && e.placeholder && a.set("placeholder", e.placeholder), e != null && e.theme && a.set("theme", e.theme), e != null && e.borderless && a.set("borderless", "1"), e != null && e.contextId && a.set("ctx", e.contextId), e != null && e.scope && a.set("scope", e.scope);
    const o = a.toString(), h = `${n}/chat-embed/${t}${o ? "?" + o : ""}`, r = document.createElement("iframe");
    r.src = h, r.style.width = "100%", r.style.height = (e == null ? void 0 : e.height) || "400px", r.style.border = e != null && e.borderless ? "none" : "", r.style.borderRadius = e != null && e.borderless ? "0" : "0.5rem", r.style.colorScheme = "normal", r.setAttribute("allow", "microphone"), s.appendChild(r), c = r, S = s, m = C, window.addEventListener("message", m);
  },
  unmount() {
    c && S && S.removeChild(c), m && (window.removeEventListener("message", m), m = null), c = null, S = null, g = [];
  },
  send(s) {
    var e;
    (e = c == null ? void 0 : c.contentWindow) == null || e.postMessage(
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
    (e = c == null ? void 0 : c.contentWindow) == null || e.postMessage(
      { type: "nebo:set-context", context: s },
      "*"
    );
  },
  newThread() {
    var s;
    (s = c == null ? void 0 : c.contentWindow) == null || s.postMessage(
      { type: "nebo:new-thread" },
      "*"
    );
  }
};
class R {
  constructor() {
    this.fetch = k, this.WebSocket = O, this.storage = D, this.agents = j, this.janus = W, this.surfaces = _, this.a2ui = v, this.identity = P, this.chat = M, _._a2uiHandler = (e) => v._handleMessage(e), v._setSendFn((e) => _._rawSend(e));
  }
  /**
   * Manually configure the SDK (optional — auto-detection works in most cases).
   */
  configure(e) {
    e.appId && E(e.appId), e.baseUrl && x(e.baseUrl);
  }
}
const A = new R();
export {
  U as NeboA2UI,
  R as NeboSDK,
  J as NeboSurfaces,
  O as NeboWebSocket,
  v as a2ui,
  j as agents,
  M as chat,
  p as getAppId,
  y as getBaseUrl,
  P as identity,
  W as janus,
  A as nebo,
  k as neboFetch,
  E as setAppId,
  x as setBaseUrl,
  D as storage,
  _ as surfaces
};
