// The smallest DOM the application actually uses.
//
// Extracted from smoke-app.mjs so that a second harness could drive the same app
// without a second copy of the stub drifting away from the first. It implements only
// the DOM surface this codebase writes to — if a render function starts using
// something new, this file is where it gets added, once.
//
// It cannot see layout, colour, or whether a control is reachable with a thumb. What it
// can do is run the real render functions and let a test read what they produced.

import { readFileSync } from 'node:fs';

export const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

export class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.dataset = {};
    this.style = {};
    this._text = '';
    this.className = '';
    this.hidden = false;
    this.disabled = false;
    this.classList = {
      add: (c) => { this.className = `${this.className} ${c}`.trim(); },
      remove: (c) => { this.className = this.className.split(/\s+/).filter((x) => x !== c).join(' '); },
      toggle: (c, on) => (on ? this.classList.add(c) : this.classList.remove(c)),
      contains: (c) => this.className.split(/\s+/).includes(c),
    };
  }

  get textContent() {
    return this.children.length ? this.children.map((c) => c.textContent).join('') : this._text;
  }

  set textContent(value) { this._text = String(value); this.children = []; }

  /** The text this node holds itself, ignoring descendants. */
  get ownText() { return this.children.length ? '' : this._text; }

  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  removeChild(child) { this.children = this.children.filter((c) => c !== child); return child; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }

  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
  }
  click() {
    if (this.disabled) return;
    for (const fn of this.listeners.click || []) fn({ preventDefault() {} });
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; }
  hasAttribute(name) { return name in this.attributes; }

  scrollIntoView() {}
  focus() {}

  /** Depth-first, and only the selector forms this codebase actually writes. */
  querySelectorAll(selector) {
    const out = [];
    const match = (node) => {
      if (selector.startsWith('.')) return node.classList.contains(selector.slice(1));
      if (selector.startsWith('[')) {
        const [name, value] = selector.slice(1, -1).split('=');
        const key = name.replace(/^data-/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
        const actual = name.startsWith('data-') ? node.dataset[key] : node.attributes[name];
        if (value === undefined) return actual !== undefined;
        return actual === value.replace(/^["']|["']$/g, '');
      }
      return node.tagName === selector.toUpperCase();
    };
    const walk = (node) => {
      for (const child of node.children) { if (match(child)) out.push(child); walk(child); }
    };
    walk(this);
    return out;
  }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }

  /** Every descendant, so a test can find a control without knowing the tree. */
  all() {
    const out = [];
    const walk = (node) => { for (const c of node.children) { out.push(c); walk(c); } };
    walk(this);
    return out;
  }
}

/**
 * Install the stub as the process globals the app expects, and hand back the handles a
 * harness needs: the elements `index.html` provides, the DOMContentLoaded queue, and
 * the backing map behind localStorage.
 */
export function installStubDom(ids = [
  'stats', 'scene', 'progress', 'situation', 'info', 'decision', 'consequence',
  'pnl', 'trajectory', 'banner', 'lang-banner', 'title', 'reset', 'chapters', 'lang',
  'pnl-toggle', 'pnl-wrap', 'goal', 'foot-privacy',
]) {
  const byId = new Map();
  const boot = [];
  for (const id of ids) byId.set(id, new Node('div'));

  globalThis.document = {
    title: '',
    readyState: 'loading',
    body: new Node('body'),
    documentElement: new Node('html'),
    createElement: (tag) => new Node(tag),
    createElementNS: (_ns, tag) => new Node(tag),
    getElementById: (id) => byId.get(id) || null,
    addEventListener: (type, fn) => { if (type === 'DOMContentLoaded') boot.push(fn); },
    querySelector: () => null,
  };

  const storeData = new Map();
  globalThis.localStorage = {
    getItem: (k) => (storeData.has(k) ? storeData.get(k) : null),
    setItem: (k, v) => storeData.set(k, String(v)),
    removeItem: (k) => storeData.delete(k),
  };

  globalThis.window = { scrollTo() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  // Deferred, not immediate. A synchronous stub turns every animation loop in scene.js
  // into unbounded recursion, which says nothing about the app and blows the stack.
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.performance = { now: () => Date.now() };
  globalThis.URL.createObjectURL = () => 'blob:stub';
  globalThis.URL.revokeObjectURL = () => {};
  globalThis.Blob = class {};

  // The app fetches only its own content files; serve them from disk.
  globalThis.fetch = async (url) => {
    const path = String(url).replace(/^\.\//, 'app/');
    try {
      const body = read(path);
      return { ok: true, status: 200, json: async () => JSON.parse(body) };
    } catch {
      return { ok: false, status: 404, json: async () => ({}) };
    }
  };

  return { byId, boot, storeData };
}

/** Let the microtask queue and the deferred animation frames drain. */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
