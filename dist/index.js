let h = null, l = null;
function i() {
  if (h) return h;
  if (window.location.protocol === "neboapp:")
    return h = window.location.hostname, h;
  const t = window.location.pathname.match(/^(?:\/t\/[^/]+)?(?:\/k\/[^/]+)?\/apps\/([^/]+)\/ui(?:\/|$)/);
  if (t)
    return h = decodeURIComponent(t[1]), h;
  const e = document.querySelector('meta[name="nebo-app-id"]');
  if (e)
    return h = e.getAttribute("content") || "", h;
  throw new Error(
    '[nebo-sdk] Cannot detect app ID. In production, serve from /apps/{id}/ui/. In dev, add <meta name="nebo-app-id" content="your-id"> to index.html.'
  );
}
function d() {
  if (l) return l;
  const t = document.querySelector('meta[name="nebo-base-url"]');
  return t ? (l = t.getAttribute("content") || "", l) : window.location.protocol === "neboapp:" ? (l = "http://localhost:27895", l) : (l = window.location.origin, l);
}
function k(t) {
  h = t;
}
function x(t) {
  l = t;
}
async function C(t, e) {
  const s = i(), a = d();
  if (t.startsWith("http://") || t.startsWith("https://")) {
    const f = `${a}/api/v1/apps/${s}/http/proxy`, r = {};
    e != null && e.headers && new Headers(e.headers).forEach((E, j) => {
      r[j] = E;
    });
    const p = {
      url: t,
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
  const n = t.startsWith("/") ? t : `/${t}`, c = `${a}/api/v1/apps/${s}/api${n}`;
  return fetch(c, e);
}
class I {
  constructor(e) {
    this.ws = null, this.reconnectTimer = null, this.reconnectDelay = 1e3, this.maxReconnectDelay = 3e4, this._closed = !1, this.onopen = null, this.onmessage = null, this.onerror = null, this.onclose = null;
    const s = i(), n = d().replace(/^http/, "ws");
    this.url = `${n}/ws/app/${s}`, this.connect();
  }
  connect() {
    this._closed || (this.ws = new WebSocket(this.url), this.ws.onopen = (e) => {
      var s;
      this.reconnectDelay = 1e3, (s = this.onopen) == null || s.call(this, e);
    }, this.ws.onmessage = (e) => {
      var s;
      return (s = this.onmessage) == null ? void 0 : s.call(this, e);
    }, this.ws.onerror = (e) => {
      var s;
      return (s = this.onerror) == null ? void 0 : s.call(this, e);
    }, this.ws.onclose = (e) => {
      var s;
      (s = this.onclose) == null || s.call(this, e), this._closed || this.scheduleReconnect();
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
    var s;
    (s = this.ws) == null || s.send(e);
  }
  close(e, s) {
    var a;
    this._closed = !0, this.reconnectTimer && (clearTimeout(this.reconnectTimer), this.reconnectTimer = null), (a = this.ws) == null || a.close(e, s);
  }
}
const T = /* @__PURE__ */ new Set();
let $ = null;
function D() {
  $ || ($ = new I(), $.onmessage = (t) => {
    let e;
    try {
      e = JSON.parse(t.data);
    } catch {
      return;
    }
    e.type !== "app_data_changed" || !e.data || e.data.appId && e.data.appId !== i() || T.forEach((s) => s(e.data));
  });
}
function J(t) {
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
function b(t) {
  const e = i(), s = d();
  return t ? `${s}/api/v1/apps/${e}/storage/${encodeURIComponent(t)}` : `${s}/api/v1/apps/${e}/storage`;
}
const U = {
  async getItem(t) {
    const e = await fetch(b(t));
    if (e.status === 404) return null;
    const s = await e.json();
    return J(s.value);
  },
  async setItem(t, e) {
    const s = typeof e == "string" ? e : JSON.stringify(e);
    await fetch(b(t), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: s })
    });
  },
  async removeItem(t) {
    await fetch(b(t), { method: "DELETE" });
  },
  async clear() {
    const t = await this.keys();
    await Promise.all(t.map((e) => this.removeItem(e)));
  },
  async keys() {
    return ((await (await fetch(b())).json()).items || []).map((s) => s[0]);
  },
  /**
   * Call `handler` after every change to the store: the employee's writes
   * and other open views'. Returns a function that stops listening.
   */
  onChange(t) {
    return T.add(t), D(), () => {
      T.delete(t);
    };
  }
};
function v(t) {
  const e = i();
  return `${d()}/api/v1/apps/${e}/agents/${t}`;
}
const P = {
  async invoke(t, e) {
    return (await fetch(v("invoke"), {
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
    const s = await fetch(v("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: t,
        agent: e == null ? void 0 : e.agent,
        data: e == null ? void 0 : e.data
      })
    });
    if (!s.body)
      throw new Error("No response body for streaming");
    const a = s.body.getReader(), n = new TextDecoder();
    let c = "";
    for (; ; ) {
      const { done: f, value: r } = await a.read();
      if (f) break;
      c += n.decode(r, { stream: !0 });
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
function N(t) {
  const e = i();
  return `${d()}/api/v1/apps/${e}/janus/${t}`;
}
const W = {
  async complete(t) {
    const s = await (await fetch(N("complete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t)
    })).json();
    return s.text || s.content || "";
  },
  async *stream(t) {
    const e = await fetch(N("stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t)
    });
    if (!e.body)
      throw new Error("No response body for streaming");
    const s = e.body.getReader(), a = new TextDecoder();
    let n = "";
    for (; ; ) {
      const { done: c, value: f } = await s.read();
      if (c) break;
      n += a.decode(f, { stream: !0 });
      const r = n.split(`
`);
      n = r.pop() || "";
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
async function R(t) {
  const e = await fetch(`${d()}/api/v1/apps/${i()}/janus/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t)
  }), s = await e.json().catch(() => ({}));
  if (!e.ok)
    throw new Error(s.error || `decide failed (${e.status})`);
  return s;
}
async function F(t) {
  const e = new URLSearchParams(window.location.search), s = e.get("thread") || "", a = e.get("client") || "", n = await fetch(`${d()}/api/v1/apps/${i()}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: t.name, content: t.content, thread: s, client: a })
  }), c = await n.json().catch(() => ({}));
  if (!n.ok)
    throw new Error(c.error || `share failed (${n.status})`);
  return c;
}
const M = {
  /**
   * `files.url('Media/Projects/reel/render.mp4')`. A path with a `.` or `..`
   * part names nothing inside a granted folder and is refused here.
   */
  url(t) {
    const e = t.split("/").filter((n) => n !== "");
    if (e.some((n) => n === "." || n === ".."))
      throw new Error(`[nebo-sdk] files.url: "${t}" climbs out of its folder; name the file inside the granted folder`);
    const s = encodeURIComponent(i()), a = e.map(encodeURIComponent).join("/");
    return `${d()}/api/v1/apps/${s}/files/${a}`;
  }
};
class A {
  constructor() {
    this.ws = null, this.listeners = /* @__PURE__ */ new Map(), this._connected = !1, this._a2uiHandler = null, this.state = {};
  }
  /** Whether the WebSocket is connected */
  get connected() {
    return this._connected;
  }
  /** Connect to the app's surface WebSocket */
  connect() {
    this.ws || (this.ws = new I(), this.ws.onopen = () => {
      this._connected = !0;
    }, this.ws.onmessage = (e) => {
      var s, a;
      try {
        const n = JSON.parse(e.data);
        if (n.type === "a2ui_message" && ((s = n.data) != null && s.message)) {
          (a = this._a2uiHandler) == null || a.call(this, n.data.message);
          return;
        }
        this.handleEvent(n);
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
  on(e, s) {
    return this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set()), this.listeners.get(e).add(s), () => {
      var a;
      (a = this.listeners.get(e)) == null || a.delete(s);
    };
  }
  /** Remove a specific listener */
  off(e, s) {
    var a;
    (a = this.listeners.get(e)) == null || a.delete(s);
  }
  /** Send an action/event to the agent */
  send(e, s) {
    !this.ws || this.ws.readyState !== WebSocket.OPEN || this.ws.send(JSON.stringify({ type: "action", name: e, ...s }));
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
    const s = this.listeners.get(e.type);
    if (s)
      for (const n of s)
        try {
          n(e);
        } catch {
        }
    const a = this.listeners.get("*");
    if (a)
      for (const n of a)
        try {
          n(e);
        } catch {
        }
  }
  applyDelta(e) {
    for (const s of e) {
      const a = s.path.split("/").filter(Boolean);
      if (a.length === 0) continue;
      const n = this.resolveParent(a);
      if (!n) continue;
      const c = a[a.length - 1];
      switch (s.op) {
        case "add":
        case "replace":
          n[c] = s.value;
          break;
        case "remove":
          delete n[c];
          break;
      }
    }
  }
  resolveParent(e) {
    let s = this.state;
    for (let a = 0; a < e.length - 1; a++) {
      if (s == null || typeof s != "object") return null;
      s = s[e[a]];
    }
    return s;
  }
}
const _ = new A();
class L {
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
      } catch (s) {
        console.error("[nebo-sdk] A2UI processing error:", s);
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
  sendAction(e, s) {
    this.sendFn && this.sendFn(JSON.stringify({
      type: "a2ui_action",
      data: {
        surface_id: e,
        message: {
          version: "v0.9",
          action: {
            surfaceId: e,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ...s
          }
        }
      }
    }));
  }
  /**
   * Send a v0.9 client error report back to the agent.
   */
  sendError(e, s, a, n) {
    this.sendFn && this.sendFn(JSON.stringify({
      type: "a2ui_action",
      data: {
        surface_id: e,
        message: {
          version: "v0.9",
          error: { code: s, surfaceId: e, message: a, path: n }
        }
      }
    }));
  }
}
const O = new L();
let w = null;
const H = {
  async get() {
    if (w) return w;
    const t = i(), e = d(), s = await fetch(`${e}/api/v1/apps/${t}/identity`);
    if (!s.ok)
      throw new Error(`[nebo-sdk] identity fetch failed: ${s.status}`);
    return w = await s.json(), w;
  },
  invalidate() {
    w = null;
  }
};
let o = null, S = null, g = [], m = null;
function q(t) {
  if (!(!t.data || typeof t.data.type != "string") && t.data.type.startsWith("nebo:")) {
    t.data.type === "nebo:resize" && o && t.data.height && (o.style.height = `${t.data.height}px`);
    for (const e of g)
      e(t.data);
  }
}
const B = {
  mount(t, e) {
    o && this.unmount();
    const s = i(), a = d(), n = new URLSearchParams();
    e != null && e.placeholder && n.set("placeholder", e.placeholder), e != null && e.theme && n.set("theme", e.theme), e != null && e.borderless && n.set("borderless", "1"), e != null && e.contextId && n.set("ctx", e.contextId), e != null && e.scope && n.set("scope", e.scope);
    const c = n.toString(), f = `${a}/chat-embed/${s}${c ? "?" + c : ""}`, r = document.createElement("iframe");
    r.src = f, r.style.width = "100%", r.style.height = (e == null ? void 0 : e.height) || "400px", r.style.border = e != null && e.borderless ? "none" : "", r.style.borderRadius = e != null && e.borderless ? "0" : "0.5rem", r.style.colorScheme = "normal", r.setAttribute("allow", "microphone"), t.appendChild(r), o = r, S = t, m = q, window.addEventListener("message", m);
  },
  unmount() {
    o && S && S.removeChild(o), m && (window.removeEventListener("message", m), m = null), o = null, S = null, g = [];
  },
  send(t) {
    var e;
    (e = o == null ? void 0 : o.contentWindow) == null || e.postMessage(
      { type: "nebo:send", message: t },
      "*"
    );
  },
  onMessage(t) {
    return g.push(t), () => {
      g = g.filter((e) => e !== t);
    };
  },
  /**
   * Set app context that gets injected into every agent request from the chat.
   * The agent sees this as invisible context — not rendered in the chat UI.
   *
   * Call this whenever the user navigates or the displayed data changes.
   * Pass null to clear context.
   */
  setContext(t) {
    var e;
    (e = o == null ? void 0 : o.contentWindow) == null || e.postMessage(
      { type: "nebo:set-context", context: t },
      "*"
    );
  },
  newThread() {
    var t;
    (t = o == null ? void 0 : o.contentWindow) == null || t.postMessage(
      { type: "nebo:new-thread" },
      "*"
    );
  }
};
class z {
  constructor() {
    this.fetch = C, this.WebSocket = I, this.storage = U, this.agents = P, this.janus = W, this.decide = R, this.share = F, this.files = M, this.surfaces = _, this.a2ui = O, this.identity = H, this.chat = B, _._a2uiHandler = (e) => O._handleMessage(e), O._setSendFn((e) => _._rawSend(e));
  }
  /**
   * Manually configure the SDK (optional — auto-detection works in most cases).
   */
  configure(e) {
    e.appId && k(e.appId), e.baseUrl && x(e.baseUrl);
  }
}
const K = new z();
export {
  L as NeboA2UI,
  z as NeboSDK,
  A as NeboSurfaces,
  I as NeboWebSocket,
  O as a2ui,
  P as agents,
  B as chat,
  R as decide,
  M as files,
  i as getAppId,
  d as getBaseUrl,
  H as identity,
  W as janus,
  K as nebo,
  C as neboFetch,
  k as setAppId,
  x as setBaseUrl,
  F as share,
  U as storage,
  _ as surfaces
};
