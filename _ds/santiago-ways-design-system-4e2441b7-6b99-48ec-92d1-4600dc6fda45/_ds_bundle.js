/* @ds-bundle: {"format":3,"namespace":"SantiagoWaysDesignSystem_4e2441","components":[],"sourceHashes":{"decks/deck-stage.js":"0c125b8b1e23","route-detail/FAQAccordion.jsx":"28a837150591","route-detail/QuoteForm.jsx":"62fb31903e4b","route-detail/ReviewsWall.jsx":"1e7f2241f31e","route-detail/RouteHero.jsx":"512e34b8f223","route-detail/RouteTabs.jsx":"e9dd7e8841f0","route-detail/SiteFooter.jsx":"d401d8954e2d","route-detail/SiteHeader.jsx":"46c555a6059d","route-detail/StatsBar.jsx":"8bf29206370b","ui_kits/web/Footer.jsx":"3bfc37466677","ui_kits/web/Header.jsx":"d8ed62a37206","ui_kits/web/Hero.jsx":"9a12ff33f054","ui_kits/web/IncludesSection.jsx":"bfd0adbe8194","ui_kits/web/RouteGrid.jsx":"39ce0ed765cd","ui_kits/web/Tarificador.jsx":"70b0db0b5e8f","ui_kits/web/Testimonials.jsx":"c3efd0ef11a6"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SantiagoWaysDesignSystem_4e2441 = window.SantiagoWaysDesignSystem_4e2441 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// decks/deck-stage.js
try { (() => {
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *      On touch devices, tapping the left/right half of the stage goes
 *      prev/next — taps on links, buttons and other interactive slide
 *      content are left alone.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *  (g) thumbnail rail — resizable left-hand column of per-slide thumbnails
 *      (static clones). Click to navigate; ↑/↓ with a thumbnail focused to
 *      step between slides; drag to reorder; right-click for
 *      Skip / Move up / Move down / Delete (opens a Cancel/Delete confirm
 *      dialog). Drag the rail's right edge to resize; width persists to
 *      localStorage. Skipped slides carry `data-deck-skip`, are dimmed in
 *      the rail, omitted from prev/next navigation, and hidden at print.
 *      The rail is suppressed in presenting mode, in the host's Preview
 *      mode (ViewerMode='none'), on `noscale`, on narrow viewports
 *      (≤640px), and via the `no-rail` attribute. Rail mutations dispatch
 *      a `deckchange`
 *      CustomEvent on the element: detail = {action, from, to, slide}.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <style>deck-stage:not(:defined){visibility:hidden}</style>
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *   <script src="deck-stage.js"></script>
 *
 * The :not(:defined) rule prevents a flash of the first slide at its
 * authored styles before this script runs and attaches the shadow root.
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const FINE_POINTER_MQ = matchMedia('(hover: hover) and (pointer: fine)');
  const NARROW_MQ = matchMedia('(max-width: 640px)');
  // Slide-authored controls that should keep a tap instead of it navigating.
  const INTERACTIVE_SEL = 'a[href], button, input, select, textarea, summary, label, video[controls], audio[controls], [role="button"], [onclick], [tabindex]:not([tabindex^="-"]), [contenteditable]:not([contenteditable="false" i])';
  const pad2 = n => String(n).padStart(2, '0');

  // Label precedence: data-label → data-screen-label (number stripped) → first heading → "Slide".
  const getSlideLabel = el => {
    const explicit = el.getAttribute('data-label');
    if (explicit) return explicit;
    const existing = el.getAttribute('data-screen-label');
    if (existing) return existing.replace(/^\s*\d+\s*/, '').trim() || existing;
    const h = el.querySelector('h1, h2, h3, [data-title]');
    const t = h && (h.textContent || '').trim().slice(0, 40);
    if (t) return t;
    return 'Slide';
  };
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    /* connectedCallback holds this until document.fonts.ready (capped 2s) so
     * the first visible paint has the deck's real typography + final rail
     * layout. opacity (not visibility) so the active slide can't un-hide
     * itself via the ::slotted([data-deck-active]) visibility:visible rule.
     * Only the stage/rail hide — the black :host background stays, so the
     * iframe doesn't flash the page's default white. */
    :host([data-fonts-pending]) .stage,
    :host([data-fonts-pending]) .rail { opacity: 0; pointer-events: none; }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Thumbnail rail ──────────────────────────────────────────────────
       Fixed column on the left; each thumbnail is a static deep-clone of
       the light-DOM slide scaled into a 16:9 (or design-aspect) frame. The
       stage re-fits around it (see _fit); hidden during present / noscale
       / print so capture geometry and fullscreen output are unchanged. */
    .rail {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--deck-rail-w, 188px);
      background: #141414;
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2147482500;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.18) transparent;
    }
    .rail::-webkit-scrollbar { width: 8px; }
    .rail::-webkit-scrollbar-track { background: transparent; margin: 2px; }
    .rail::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.18);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .rail::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.28);
      border: 2px solid transparent;
      background-clip: content-box;
    }
    :host([no-rail]) .rail,
    :host([noscale]) .rail { display: none; }
    .rail[data-presenting] { display: none; }
    @media (max-width: 640px) {
      .rail, .rail-resize { display: none; }
    }
    /* User-driven show/hide (the TweaksPanel toggle) slides instead of
       popping. Transitions are gated on :host([data-rail-anim]) — set only
       for the 200ms around the toggle — so window-resize and rail-width
       drag (which also call _fit) don't lag behind the cursor. */
    .rail[data-user-hidden] { transform: translateX(-100%); }
    :host([data-rail-anim]) .rail { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .stage { transition: left 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .canvas { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    /* transition shorthand replaces rather than merges — repeat the base
       .overlay opacity/transform/filter transitions so visibility changes
       during the 200ms toggle window still fade instead of popping. */
    :host([data-rail-anim]) .overlay {
      transition: margin-left 200ms cubic-bezier(.3,.7,.4,1),
                  opacity 260ms ease,
                  transform 260ms cubic-bezier(.2,.8,.2,1),
                  filter 260ms ease;
    }

    .thumb {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .thumb .num {
      width: 16px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 500;
      text-align: right;
      color: rgba(255,255,255,0.55);
      padding-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .thumb .frame {
      position: relative;
      flex: 1;
      min-width: 0;
      aspect-ratio: var(--deck-aspect);
      background: #fff;
      border-radius: 4px;
      outline: 2px solid transparent;
      outline-offset: 0;
      overflow: hidden;
      transition: outline-color 120ms ease;
    }
    .thumb:hover .frame { outline-color: rgba(255,255,255,0.25); }
    .thumb { outline: none; }
    .thumb:focus-visible .frame { outline-color: rgba(255,255,255,0.5); }
    .thumb[data-current] .num { color: #fff; }
    .thumb[data-current] .frame { outline-color: #D97757; }
    .thumb[data-dragging] { opacity: 0.35; }
    .thumb::before {
      content: '';
      position: absolute;
      left: 24px;
      right: 0;
      height: 3px;
      border-radius: 2px;
      background: #D97757;
      opacity: 0;
      pointer-events: none;
    }
    .thumb[data-drop="before"]::before { top: -8px; opacity: 1; }
    .thumb[data-drop="after"]::before { bottom: -8px; opacity: 1; }
    .thumb[data-skip] .frame { opacity: 0.35; }
    .thumb[data-skip] .frame::after {
      content: 'Skipped';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      color: #fff;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    .ctxmenu {
      position: fixed;
      min-width: 150px;
      padding: 4px;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 7px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      z-index: 2147483100;
      display: none;
      font-size: 12px;
    }
    .ctxmenu[data-open] { display: block; }
    .ctxmenu button {
      display: block;
      width: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: #e8e8e8;
      font: inherit;
      text-align: left;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .ctxmenu button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    .ctxmenu button:disabled { opacity: 0.35; cursor: default; }
    .ctxmenu hr {
      border: 0;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin: 4px 2px;
    }

    .rail-resize {
      position: fixed;
      left: calc(var(--deck-rail-w, 188px) - 3px);
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 2147482600;
      touch-action: none;
    }
    .rail-resize:hover,
    .rail-resize[data-dragging] { background: rgba(255,255,255,0.12); }
    :host([no-rail]) .rail-resize,
    :host([noscale]) .rail-resize,
    .rail[data-presenting] + .rail-resize,
    .rail[data-user-hidden] + .rail-resize { display: none; }

    /* Delete-confirm popup — matches the SPA's ConfirmDialog layout
       (title + message body, depressed footer with Cancel / Delete). */
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483200;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .confirm-backdrop[data-open] { display: flex; }
    .confirm {
      width: 320px;
      max-width: calc(100vw - 32px);
      background: #2a2a2a;
      color: #e8e8e8;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      overflow: hidden;
      font-family: inherit;
      animation: deck-confirm-in 0.18s ease;
    }
    @keyframes deck-confirm-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .confirm .body { padding: 20px 20px 16px; }
    .confirm .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .confirm .msg { font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.65); }
    .confirm .footer {
      padding: 14px 20px;
      background: #1f1f1f;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .confirm button {
      appearance: none;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
    .confirm .cancel {
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.8);
    }
    .confirm .cancel:hover { background: rgba(255,255,255,0.08); }
    .confirm .danger {
      background: #c96442;
      border: 1px solid rgba(0,0,0,0.15);
      color: #fff;
      box-shadow: 0 1px 3px rgba(166,50,68,0.3), 0 2px 6px rgba(166,50,68,0.18);
    }
    .confirm .danger:hover { background: #b5563a; }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      /* :last-child alone isn't enough once data-deck-skip hides the
         trailing slide(s) — the last *visible* slide still carries
         break-after:page and prints a blank sheet. _markLastVisible()
         maintains data-deck-last-visible on the last non-skipped slide. */
      ::slotted(*:last-child),
      ::slotted([data-deck-last-visible]) {
        break-after: auto;
        page-break-after: auto;
      }
      ::slotted([data-deck-skip]) { display: none !important; }
      .overlay, .rail, .rail-resize, .ctxmenu, .confirm-backdrop { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale', 'no-rail'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._menuIndex = -1;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTap = this._onTap.bind(this);
      this._onMessage = this._onMessage.bind(this);
      // Capture-phase close so a click anywhere dismisses the menu, but
      // ignore clicks that land inside the menu itself — otherwise the
      // capture handler runs before the menu's own (bubble) handler and
      // clears _menuIndex out from under it.
      this._onDocClick = e => {
        if (this._menu && e.composedPath && e.composedPath().includes(this._menu)) return;
        this._closeMenu();
      };
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      // Presenter-view popup loads deckUrl?_snthumb=...#N for its prev/cur/
      // next thumbnails — the rail has no business rendering inside those
      // (wrong scale, and it offsets the stage so the thumb shows a gutter).
      if (/[?&]_snthumb=/.test(location.search)) this.setAttribute('no-rail', '');
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      window.addEventListener('message', this._onMessage);
      window.addEventListener('click', this._onDocClick, true);
      this.addEventListener('click', this._onTap);
      // Initial collection + layout happens via slotchange, which fires on mount.
      this._enableRail();
      // Hold the stage hidden until webfonts are ready so the first visible
      // paint has the deck's real typography — the :not(:defined) guard in
      // the page HTML only covers custom-element upgrade, not font load.
      // Capped so a 404'd font URL can't blank the deck indefinitely.
      this.setAttribute('data-fonts-pending', '');
      const reveal = () => this.removeAttribute('data-fonts-pending');
      // rAF first: fonts.ready is a pre-resolved promise until layout has
      // resolved the slotted text's font-family and pushed a FontFace into
      // 'loading'. Reading it here in connectedCallback (parse-time) would
      // settle the race in a microtask before any font fetch starts.
      requestAnimationFrame(() => {
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2000))]).then(reveal, reveal);
      });
    }
    _enableRail() {
      // Idempotent — older host builds still post __omelette_rail_enabled.
      // no-rail guard keeps the observers/stylesheet walk off the cheap path
      // for presenter-popup thumbnail iframes (up to 9 per view).
      if (this._railEnabled || this.hasAttribute('no-rail')) return;
      this._railEnabled = true;
      // Per-viewer preference — restored alongside rail width. Default on;
      // only a stored '0' (from the TweaksPanel toggle) hides it.
      this._railVisible = true;
      try {
        if (localStorage.getItem('deck-stage.railVisible') === '0') this._railVisible = false;
      } catch (e) {}
      // Live thumbnail updates: watch the light-DOM slides for content
      // edits and re-clone just the affected thumb(s), debounced. Ignore
      // the data-deck-* / data-screen-label / data-om-validate attributes
      // this component itself writes so nav and skip don't trigger
      // spurious refreshes.
      const OWN_ATTRS = /^data-(deck-|screen-label$|om-validate$)/;
      this._liveDirty = new Set();
      this._liveObserver = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'attributes' && OWN_ATTRS.test(r.attributeName || '')) continue;
          let n = r.target;
          while (n && n.parentElement !== this) n = n.parentElement;
          if (n && this._slideSet && this._slideSet.has(n)) this._liveDirty.add(n);
        }
        if (this._liveDirty.size && !this._liveTimer) {
          this._liveTimer = setTimeout(() => {
            this._liveTimer = null;
            this._liveDirty.forEach(s => this._refreshThumb(s));
            this._liveDirty.clear();
          }, 200);
        }
      });
      this._liveObserver.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      // Lazy thumbnail materialization — clone the slide only when its
      // frame scrolls into (or near) the rail viewport. rootMargin gives
      // ~4 thumbs of pre-load so fast scrolling doesn't flash blanks.
      this._railObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.target.__deckThumb) {
            this._materialize(e.target.__deckThumb);
          }
        });
      }, {
        root: this._rail,
        rootMargin: '400px 0px'
      });
      // Tweaks typically change CSS vars / attrs OUTSIDE <deck-stage>
      // (on <html>, <body>, a wrapper div, or a <style> tag), which
      // _liveObserver can't see. Re-snapshot author CSS (constructable
      // sheet is shared by reference, so one replaceSync updates every
      // thumb shadow root) and re-sync each thumb host's attrs + custom
      // properties. In-slide DOM mutations are _liveObserver's job.
      // Debounced so slider drags don't thrash.
      this._onTweakChange = () => {
        clearTimeout(this._tweakTimer);
        this._tweakTimer = setTimeout(() => {
          this._snapshotAuthorCss();
          // One getComputedStyle for the whole batch — each
          // getPropertyValue read below reuses the same computed style
          // as long as nothing invalidates layout between thumbs.
          const cs = getComputedStyle(this);
          (this._thumbs || []).forEach(t => {
            if (t.host) this._syncThumbHostAttrs(t.host, cs);
          });
        }, 120);
      };
      window.addEventListener('tweakchange', this._onTweakChange);
      this._snapshotAuthorCss();
      // Build the rail now that it's enabled — slotchange already fired,
      // so _renderRail's early-return skipped the initial build.
      this._syncRailHidden();
      this._renderRail();
      this._fit();
    }

    /** Snapshot document stylesheets into a constructable sheet that each
     *  thumbnail's nested shadow root adopts — so author CSS styles the
     *  cloned slide content without touching this component's chrome.
     *  Cross-origin sheets throw on .cssRules — skip them. Re-callable:
     *  the existing constructable sheet is reused via replaceSync so every
     *  already-adopted shadow root picks up the fresh CSS without re-adopt. */
    _snapshotAuthorCss() {
      // :root in an adopted sheet inside a shadow root matches nothing
      // (only the document root qualifies), so author rules like
      // `:root[data-voice="modern"] .serif` never reach the clones.
      // Rewrite :root → :host and mirror <html>'s data-*/class/lang onto
      // each thumb host (see _syncThumbHostAttrs) so the same selectors
      // match inside the thumbnail's shadow tree.
      const authorCss = Array.from(document.styleSheets).map(sh => {
        try {
          return Array.from(sh.cssRules).map(r => r.cssText).join('\n');
        } catch (e) {
          return '';
        }
      }).join('\n')
      // The shadow host is featureless outside the functional :host(...)
      // form, so any compound on :root — [attr], .class, #id, :pseudo —
      // must become :host(<compound>) not :host<compound>. Same for the
      // html type selector (Tailwind class-strategy dark mode emits
      // html.dark; Pico uses html[data-theme]), which has nothing to
      // match inside the thumb's shadow tree.
      .replace(/:root((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)/g, ':host($1)').replace(/:root\b/g, ':host').replace(/(^|[\s,>~+(}])html((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)(?![-\w])/g, '$1:host($2)').replace(/(^|[\s,>~+(}])html(?![-\w])/g, '$1:host');
      // Every custom property the author references. _syncThumbHostAttrs
      // mirrors each one's *computed* value at <deck-stage> onto the
      // thumb host so the live value wins over the :host default above
      // regardless of which ancestor the tweak wrote to (<html>, <body>,
      // a wrapper div, or the deck-stage element itself all inherit
      // down to getComputedStyle(this)).
      this._authorVars = new Set(authorCss.match(/--[\w-]+/g) || []);
      try {
        if (!this._adoptedSheet) this._adoptedSheet = new CSSStyleSheet();
        this._adoptedSheet.replaceSync(authorCss);
      } catch (e) {
        this._adoptedSheet = null;
        this._authorCss = authorCss;
      }
    }
    _syncThumbHostAttrs(host, cs) {
      const de = document.documentElement;
      // setAttribute overwrites but can't delete — an attr removed from
      // <html> (toggleAttribute off, classList emptied) would linger on
      // the host and :host([data-*]) / :host(.foo) rules would keep
      // matching. Remove stale mirrored attrs first; iterate backward
      // because removeAttribute mutates the live NamedNodeMap.
      for (let i = host.attributes.length - 1; i >= 0; i--) {
        const n = host.attributes[i].name;
        if ((n.startsWith('data-') || n === 'class' || n === 'lang') && !de.hasAttribute(n)) {
          host.removeAttribute(n);
        }
      }
      for (const a of de.attributes) {
        if (a.name.startsWith('data-') || a.name === 'class' || a.name === 'lang') {
          host.setAttribute(a.name, a.value);
        }
      }
      // The :root→:host rewrite in _snapshotAuthorCss pins each custom
      // property to its stylesheet default on the thumb host, shadowing
      // the live value that would otherwise inherit. Tweaks can write the
      // live value on any ancestor — <html>, <body>, a wrapper div, the
      // deck-stage element — so read it as the *computed* value at
      // <deck-stage> (which sees the whole inheritance chain) rather than
      // trying to guess which element the author wrote to. Inline on the
      // host beats the :host{} rule. remove-stale covers vars dropped
      // from the stylesheet between snapshots.
      const vars = this._authorVars || new Set();
      for (let i = host.style.length - 1; i >= 0; i--) {
        const p = host.style[i];
        if (p.startsWith('--') && !vars.has(p)) host.style.removeProperty(p);
      }
      const live = cs || getComputedStyle(this);
      vars.forEach(p => {
        const v = live.getPropertyValue(p);
        if (v) host.style.setProperty(p, v.trim());else host.style.removeProperty(p);
      });
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('message', this._onMessage);
      window.removeEventListener('click', this._onDocClick, true);
      this.removeEventListener('click', this._onTap);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
      if (this._liveTimer) clearTimeout(this._liveTimer);
      if (this._tweakTimer) clearTimeout(this._tweakTimer);
      if (this._railAnimTimer) clearTimeout(this._railAnimTimer);
      if (this._scaleRaf) cancelAnimationFrame(this._scaleRaf);
      if (this._liveObserver) this._liveObserver.disconnect();
      if (this._railObserver) this._railObserver.disconnect();
      if (this._onTweakChange) window.removeEventListener('tweakchange', this._onTweakChange);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        if (this._rail) {
          this._rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
        }
        this._fit();
        this._scaleThumbs();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-omelette-chrome', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._advance(-1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._advance(1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));

      // Thumbnail rail + context menu. Thumbnails are populated in
      // _renderRail() after _collectSlides().
      const rail = document.createElement('div');
      rail.className = 'rail export-hidden';
      rail.setAttribute('data-omelette-chrome', '');
      rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
      // Edge auto-scroll while dragging a thumb near the rail's top/bottom
      // so off-screen drop targets are reachable. Native dragover fires
      // continuously while the pointer is stationary, so a per-event nudge
      // (ramped by edge proximity) is enough — no rAF loop needed.
      rail.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        const r = rail.getBoundingClientRect();
        const EDGE = 40;
        const dt = e.clientY - r.top;
        const db = r.bottom - e.clientY;
        if (dt < EDGE) rail.scrollTop -= Math.ceil((EDGE - dt) / 3);else if (db < EDGE) rail.scrollTop += Math.ceil((EDGE - db) / 3);
      });
      const menu = document.createElement('div');
      menu.className = 'ctxmenu export-hidden';
      menu.setAttribute('data-omelette-chrome', '');
      menu.innerHTML = `
        <button type="button" data-act="skip">Skip slide</button>
        <button type="button" data-act="up">Move up</button>
        <button type="button" data-act="down">Move down</button>
        <hr>
        <button type="button" data-act="delete">Delete slide</button>
      `;
      menu.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        const i = this._menuIndex;
        this._closeMenu();
        if (act === 'skip') this._toggleSkip(i);else if (act === 'up') this._moveSlide(i, i - 1);else if (act === 'down') this._moveSlide(i, i + 1);else if (act === 'delete') this._openConfirm(i);
      });
      menu.addEventListener('contextmenu', e => e.preventDefault());

      // Rail resize handle — drag to set --deck-rail-w, persisted to
      // localStorage so the width survives reloads.
      const resize = document.createElement('div');
      resize.className = 'rail-resize export-hidden';
      resize.setAttribute('data-omelette-chrome', '');
      resize.addEventListener('pointerdown', e => {
        e.preventDefault();
        resize.setPointerCapture(e.pointerId);
        resize.setAttribute('data-dragging', '');
        const move = ev => this._setRailWidth(ev.clientX);
        const up = () => {
          resize.removeEventListener('pointermove', move);
          resize.removeEventListener('pointerup', up);
          resize.removeEventListener('pointercancel', up);
          resize.removeAttribute('data-dragging');
          try {
            localStorage.setItem('deck-stage.railWidth', String(this._railPx));
          } catch (err) {}
        };
        resize.addEventListener('pointermove', move);
        resize.addEventListener('pointerup', up);
        resize.addEventListener('pointercancel', up);
      });

      // Delete-confirm dialog — mirrors the SPA's ConfirmDialog layout.
      const confirm = document.createElement('div');
      confirm.className = 'confirm-backdrop export-hidden';
      confirm.setAttribute('data-omelette-chrome', '');
      confirm.innerHTML = `
        <div class="confirm" role="dialog" aria-modal="true">
          <div class="body">
            <div class="title">Delete slide?</div>
            <div class="msg">This slide will be removed from the deck.</div>
          </div>
          <div class="footer">
            <button type="button" class="cancel">Cancel</button>
            <button type="button" class="danger">Delete</button>
          </div>
        </div>
      `;
      confirm.addEventListener('click', e => {
        if (e.target === confirm) this._closeConfirm();
      });
      confirm.querySelector('.cancel').addEventListener('click', () => this._closeConfirm());
      confirm.querySelector('.danger').addEventListener('click', () => {
        const i = this._confirmIndex;
        this._closeConfirm();
        this._deleteSlide(i);
      });
      this._root.append(style, rail, resize, stage, overlay, menu, confirm);
      this._canvas = canvas;
      this._stage = stage;
      this._slot = slot;
      this._overlay = overlay;
      this._rail = rail;
      this._resize = resize;
      this._menu = menu;
      this._confirm = confirm;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');

      // Restore persisted rail width.
      let rw = 188;
      try {
        const s = localStorage.getItem('deck-stage.railWidth');
        if (s) rw = parseInt(s, 10) || rw;
      } catch (err) {}
      this._setRailWidth(rw);
      this._syncRailHidden();
    }
    _setRailWidth(px) {
      const w = Math.max(120, Math.min(360, Math.round(px)));
      this._railPx = w;
      this.style.setProperty('--deck-rail-w', w + 'px');
      this._fit();
      // _scaleThumbs forces a sync layout (frame.offsetWidth) then writes
      // N transforms. During a resize drag this runs per-pointermove;
      // coalesce to one per frame.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }
    _onSlotChange() {
      // Rail mutations (delete/move) already reconcile synchronously and
      // emit slidechange with reason 'api'; skip the async slotchange that
      // would otherwise re-broadcast with reason 'init'.
      if (this._squelchSlotChange) {
        this._squelchSlotChange = false;
        return;
      }
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slideSet = new Set(this._slides);
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        slide.setAttribute('data-screen-label', `${pad2(n)} ${getSlideLabel(slide)}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
      this._markLastVisible();
      this._renderRail();
    }

    /** Tag the last non-skipped slide so print CSS can drop its
     *  break-after (see the @media print comment above — :last-child
     *  alone matches a hidden skipped slide). */
    _markLastVisible() {
      let last = null;
      this._slides.forEach(s => {
        s.removeAttribute('data-deck-last-visible');
        if (!s.hasAttribute('data-deck-skip')) last = s;
      });
      if (last) last.setAttribute('data-deck-last-visible', '');
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      // Follow-scroll on every navigation (init deep-link, keyboard, click,
      // tap, external goTo) — the only time we *don't* want the rail to
      // track current is after a rail-internal mutation, where _renderRail
      // has already restored the user's scroll position and yanking back to
      // current would undo it.
      this._syncRail(reason !== 'mutation');
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr,
            deckTotal: this._slides.length,
            deckSkipped: this._skippedIndices()
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      // Host posts __omelette_presenting while in fullscreen/tab presentation
      // mode — suppress the nav footer entirely (both hover and slide-change
      // flash) so the audience sees clean slides.
      if (!this._overlay || this._presenting) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _railWidth() {
      // State-based, no offsetWidth: the first _fit() can run before the
      // rail has had layout on some load paths, and a 0 there paints the
      // slide full-width for one frame before the post-slotchange _fit()
      // corrects it.
      if (!this._railEnabled || !this._railVisible || this.hasAttribute('no-rail') || this.hasAttribute('noscale') || this._presenting || this._previewMode || NARROW_MQ.matches) return 0;
      return this._railPx || 0;
    }
    _fit() {
      if (!this._canvas) return;
      const stage = this._canvas.parentElement;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        if (stage) stage.style.left = '0';
        if (this._overlay) this._overlay.style.marginLeft = '0';
        return;
      }
      const rw = this._railWidth();
      if (stage) stage.style.left = rw + 'px';
      // Overlay is centred on the viewport via left:50% + translate(-50%);
      // marginLeft shifts the centre by rw/2 so it lands in the middle of
      // the [rw, innerWidth] stage region.
      if (this._overlay) this._overlay.style.marginLeft = rw / 2 + 'px';
      const vw = window.innerWidth - rw;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
      // Crossing the narrow-viewport breakpoint reveals the rail — rerun the
      // thumbnail scale the same way _setRailWidth does.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onMessage(e) {
      const d = e.data;
      if (d && typeof d.__omelette_presenting === 'boolean') {
        this._presenting = d.__omelette_presenting;
        if (this._presenting && this._overlay) {
          this._overlay.removeAttribute('data-visible');
          if (this._hideTimer) clearTimeout(this._hideTimer);
        }
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Host's Preview segment (ViewerMode='none'): the rail's drag-reorder /
      // right-click skip-delete affordances are editing chrome, so hide it
      // while the user is just looking at the deck. Same hard-hide path as
      // presenting; independent of the user's _railVisible preference so
      // returning to Edit restores whatever they had.
      if (d && typeof d.__omelette_preview_mode === 'boolean') {
        if (d.__omelette_preview_mode === this._previewMode) return;
        this._previewMode = d.__omelette_preview_mode;
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Per-viewer show/hide, driven by the TweaksPanel's auto-injected
      // "Thumbnail rail" toggle (or any author script). Independent of
      // whether the Tweaks panel itself is open — closing the panel
      // doesn't change rail visibility. Persists alongside rail width.
      if (d && d.type === '__deck_rail_visible' && typeof d.on === 'boolean') {
        if (d.on === this._railVisible) return;
        this._railVisible = d.on;
        try {
          localStorage.setItem('deck-stage.railVisible', d.on ? '1' : '0');
        } catch (e) {}
        // Arm the transition, commit it, then flip state — otherwise the
        // browser coalesces both writes and nothing animates on show.
        this.setAttribute('data-rail-anim', '');
        void (this._rail && this._rail.offsetHeight);
        this._syncRailHidden();
        this._fit();
        this._scaleThumbs();
        clearTimeout(this._railAnimTimer);
        this._railAnimTimer = setTimeout(() => this.removeAttribute('data-rail-anim'), 220);
      }
      if (d && d.type === '__omelette_rail_enabled') this._enableRail();
    }
    _syncRailHidden() {
      if (!this._rail) return;
      // data-presenting is the hard hide (display:none) for flag-off,
      // presentation mode, and the host's Preview segment — instant, no
      // transition. data-user-hidden is the soft hide (translateX(-100%))
      // for the viewer's rail toggle, so show/hide slides under
      // :host([data-rail-anim]).
      const hard = !this._railEnabled || this._presenting || this._previewMode;
      if (hard) this._rail.setAttribute('data-presenting', '');else this._rail.removeAttribute('data-presenting');
      if (!this._railVisible) this._rail.setAttribute('data-user-hidden', '');else this._rail.removeAttribute('data-user-hidden');
      // translateX hide leaves thumbs (tabIndex=0) in the tab order —
      // inert keeps them unfocusable while the rail is off-screen.
      this._rail.inert = hard || !this._railVisible;
    }
    _onTap(e) {
      // Touch-only — keyboard + the overlay toolbar cover nav on desktop.
      if (FINE_POINTER_MQ.matches) return;
      // Only taps that land on the stage (slide content or letterbox); the
      // overlay / rail / menus are siblings with their own click handlers.
      const path = e.composedPath();
      if (!this._stage || !path.includes(this._stage)) return;
      // Let interactive slide content keep the tap. composedPath (not
      // e.target.closest) so we see through open shadow roots — a <button>
      // inside a slide-authored custom element retargets e.target to the
      // host but still appears in the composed path.
      if (e.defaultPrevented) return;
      for (const n of path) {
        if (n === this._stage) break;
        if (n.matches && n.matches(INTERACTIVE_SEL)) return;
      }
      e.preventDefault();
      const rw = this._railWidth();
      const mid = rw + (window.innerWidth - rw) / 2;
      this._advance(e.clientX < mid ? -1 : 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Confirm dialog swallows nav keys while open; Escape cancels. Enter
      // is left to the focused button's native activation so Tab→Cancel
      // →Enter activates Cancel, not the window-level confirm path.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        if (e.key === 'Escape') {
          this._closeConfirm();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape' && this._menu && this._menu.hasAttribute('data-open')) {
        this._closeMenu();
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._advance(-1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    /** Step forward/back skipping any slide marked data-deck-skip. Falls
     *  back to _go's clamp-at-ends behaviour (flash overlay) when there's
     *  nothing further in that direction. */
    _advance(dir, reason) {
      if (!this._slides.length) return;
      let i = this._index + dir;
      while (i >= 0 && i < this._slides.length && this._slides[i].hasAttribute('data-deck-skip')) {
        i += dir;
      }
      if (i < 0 || i >= this._slides.length) {
        this._flashOverlay();
        return;
      }
      this._go(i, reason);
    }

    // ── Thumbnail rail ────────────────────────────────────────────────────
    //
    // Thumbs are keyed by slide element and reused across _renderRail()
    // calls, so a reorder/delete is an O(changed) DOM shuffle instead of an
    // O(N) teardown-and-re-clone. Each thumb starts as a lightweight shell
    // (num + empty frame); the clone is materialized lazily by an
    // IntersectionObserver when the frame scrolls into (or near) view, so
    // only visible-ish slides pay the clone + image-decode cost.

    _renderRail() {
      if (!this._rail || !this._railEnabled) {
        this._thumbs = [];
        return;
      }
      // FLIP: record each *materialized* thumb's top before the reconcile.
      // Off-screen (non-materialized) thumbs don't need the animation and
      // skipping their getBoundingClientRect saves a forced layout per
      // off-screen thumb on large decks.
      const prevTops = new Map();
      (this._thumbs || []).forEach(({
        thumb,
        slide,
        host
      }) => {
        if (host) prevTops.set(slide, thumb.getBoundingClientRect().top);
      });
      const st = this._rail.scrollTop;

      // Reconcile: reuse thumbs that already exist for a slide, create
      // shells for new slides, drop thumbs for removed slides.
      const bySlide = new Map();
      (this._thumbs || []).forEach(t => bySlide.set(t.slide, t));
      const next = [];
      this._slides.forEach(slide => {
        let t = bySlide.get(slide);
        if (t) bySlide.delete(slide);else t = this._makeThumb(slide);
        next.push(t);
      });
      // Orphans — slides removed since last render.
      bySlide.forEach(t => {
        if (this._railObserver) this._railObserver.unobserve(t.frame);
        t.thumb.remove();
      });
      // Put thumbs into document order to match _slides. insertBefore on
      // an already-correctly-placed node is a no-op, so this is cheap
      // when nothing moved.
      next.forEach((t, i) => {
        const want = t.thumb;
        const at = this._rail.children[i];
        if (at !== want) this._rail.insertBefore(want, at || null);
        t.i = i;
        t.num.textContent = String(i + 1);
        if (t.slide.hasAttribute('data-deck-skip')) t.thumb.setAttribute('data-skip', '');else t.thumb.removeAttribute('data-skip');
      });
      this._thumbs = next;
      this._rail.scrollTop = st;
      if (prevTops.size) {
        const moved = [];
        this._thumbs.forEach(({
          thumb,
          slide
        }) => {
          const old = prevTops.get(slide);
          if (old == null) return;
          const dy = old - thumb.getBoundingClientRect().top;
          if (Math.abs(dy) < 1) return;
          thumb.style.transition = 'none';
          thumb.style.transform = `translateY(${dy}px)`;
          moved.push(thumb);
        });
        if (moved.length) {
          // Commit the inverted positions before flipping the transition
          // on — otherwise the browser coalesces both style writes and
          // nothing animates.
          void this._rail.offsetHeight;
          moved.forEach(t => {
            t.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)';
            t.style.transform = '';
          });
          setTimeout(() => moved.forEach(t => {
            t.style.transition = '';
          }), 220);
        }
      }
      requestAnimationFrame(() => this._scaleThumbs());
      this._syncRail(false);
    }

    /** Create a lightweight thumb shell for one slide. The clone is
     *  materialized later by the IntersectionObserver. Event handlers
     *  look up the thumb's *current* index (via _thumbs.indexOf) so the
     *  same element can be reused across reorders. */
    _makeThumb(slide) {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.tabIndex = 0;
      const num = document.createElement('div');
      num.className = 'num';
      const frame = document.createElement('div');
      frame.className = 'frame';
      thumb.append(num, frame);
      const entry = {
        thumb,
        num,
        frame,
        slide,
        clone: null,
        host: null,
        i: -1
      };
      // entry.i is refreshed on every _renderRail reconcile pass, so
      // handlers read the thumb's current position without an O(N) scan.
      const idx = () => entry.i;
      thumb.addEventListener('click', () => this._go(idx(), 'click'));
      // ↑/↓ step through the rail when a thumb has focus. _go clamps at the
      // ends and _applyIndex→_syncRail scrolls the new current thumb into
      // view; we move focus to it (preventScroll — _syncRail already
      // scrolled) so a held key walks the whole list. stopPropagation keeps
      // this out of the window-level _onKey nav handler.
      thumb.addEventListener('keydown', e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        this._go(idx() + (e.key === 'ArrowDown' ? 1 : -1), 'keyboard');
        const cur = this._thumbs && this._thumbs[this._index];
        if (cur) cur.thumb.focus({
          preventScroll: true
        });
      });
      thumb.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._openMenu(idx(), e.clientX, e.clientY);
      });
      thumb.draggable = true;
      thumb.addEventListener('dragstart', e => {
        this._dragFrom = idx();
        thumb.setAttribute('data-dragging', '');
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', String(this._dragFrom));
        } catch (err) {}
      });
      thumb.addEventListener('dragend', () => {
        thumb.removeAttribute('data-dragging');
        this._clearDrop();
        this._dragFrom = null;
      });
      thumb.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const r = thumb.getBoundingClientRect();
        this._setDrop(idx(), e.clientY < r.top + r.height / 2 ? 'before' : 'after');
      });
      thumb.addEventListener('drop', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        const i = idx();
        const r = thumb.getBoundingClientRect();
        let to = e.clientY >= r.top + r.height / 2 ? i + 1 : i;
        if (this._dragFrom < to) to--;
        const from = this._dragFrom;
        this._clearDrop();
        this._dragFrom = null;
        if (to !== from) this._moveSlide(from, to);
      });
      if (this._railObserver) this._railObserver.observe(frame);
      frame.__deckThumb = entry;
      return entry;
    }

    /** Lazily build the clone for a thumb that has scrolled into view. */
    _materialize(entry) {
      if (entry.host) return;
      const dw = this.designWidth,
        dh = this.designHeight;
      let clone = entry.slide.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-deck-active');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      // Neuter heavy media; replace <video> with its poster so the box
      // keeps a visual. <iframe>/<audio> become empty placeholders.
      clone.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      clone.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      // Images: defer decode and let the browser pick the smallest
      // srcset candidate for the ~140px thumb. Same-URL clones reuse the
      // slide's decoded bitmap (URL-keyed cache), so the remaining cost
      // is paint/composite — lazy+async keeps that off the main thread.
      clone.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Custom elements inside the slide would have their
      // connectedCallback fire when the clone is appended. Replace them
      // with inert boxes so a component-heavy deck doesn't run N copies
      // of each component's mount logic in the rail. Children are
      // preserved so layout-wrapper elements (<my-column><h2>…</h2>)
      // still show their authored content; the querySelectorAll NodeList
      // is static, so nested custom elements in the moved subtree are
      // still visited on later iterations.
      const neuter = el => {
        const box = document.createElement('div');
        box.style.cssText = (el.getAttribute('style') || '') + ';background:rgba(0,0,0,0.06);border:1px dashed rgba(0,0,0,0.15);';
        box.className = el.className;
        // Preserve theming/i18n hooks so [data-*] / :lang() / [dir]
        // descendant selectors still match the neutered root.
        for (const a of el.attributes) {
          const n = a.name;
          if (n.startsWith('data-') || n.startsWith('aria-') || n === 'lang' || n === 'dir' || n === 'role' || n === 'title') {
            box.setAttribute(n, a.value);
          }
        }
        while (el.firstChild) box.appendChild(el.firstChild);
        return box;
      };
      // querySelectorAll('*') returns descendants only — a custom-element
      // slide root (<my-slide>…</my-slide>) would slip through and upgrade
      // on append. Swap the root first.
      if (clone.tagName.includes('-')) clone = neuter(clone);
      clone.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(neuter(el));
      });
      clone.style.cssText += ';position:absolute;top:0;left:0;transform-origin:0 0;' + 'pointer-events:none;width:' + dw + 'px;height:' + dh + 'px;' + 'box-sizing:border-box;overflow:hidden;visibility:visible;opacity:1;';
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;';
      this._syncThumbHostAttrs(host);
      const sr = host.attachShadow({
        mode: 'open'
      });
      if (this._adoptedSheet) sr.adoptedStyleSheets = [this._adoptedSheet];else {
        const st = document.createElement('style');
        st.textContent = this._authorCss || '';
        sr.appendChild(st);
      }
      sr.appendChild(clone);
      entry.frame.appendChild(host);
      entry.host = host;
      entry.clone = clone;
      if (this._thumbScale) clone.style.transform = 'scale(' + this._thumbScale + ')';
      // Once materialized the IO callback is a no-op early-return —
      // unobserve so scroll doesn't keep firing it.
      if (this._railObserver) this._railObserver.unobserve(entry.frame);
    }

    /** Re-clone a single thumb (live-update path). No-op if the thumb
     *  hasn't been materialized yet — it'll pick up current content when
     *  it scrolls into view. */
    _refreshThumb(slide) {
      const entry = (this._thumbs || []).find(t => t.slide === slide);
      if (!entry || !entry.host) return;
      entry.host.remove();
      entry.host = entry.clone = null;
      this._materialize(entry);
    }
    _scaleThumbs() {
      if (!this._thumbs || !this._thumbs.length) return;
      // Every frame is the same width; if it reads 0 the rail is
      // display:none (noscale / no-rail / presenting / print) — leave the
      // clones as-is and re-run when the rail is revealed.
      const fw = this._thumbs[0].frame.offsetWidth;
      if (!fw) return;
      this._thumbScale = fw / this.designWidth;
      this._thumbs.forEach(({
        clone
      }) => {
        if (clone) clone.style.transform = 'scale(' + this._thumbScale + ')';
      });
    }
    _setDrop(i, where) {
      // dragover fires at pointer-event rate; touch only the previous
      // and new target rather than sweeping all N thumbs.
      const t = this._thumbs && this._thumbs[i];
      if (this._dropOn && this._dropOn !== t) {
        this._dropOn.thumb.removeAttribute('data-drop');
      }
      if (t) t.thumb.setAttribute('data-drop', where);
      this._dropOn = t || null;
    }
    _clearDrop() {
      if (this._dropOn) this._dropOn.thumb.removeAttribute('data-drop');
      this._dropOn = null;
    }
    _syncRail(follow) {
      if (!this._thumbs) return;
      this._thumbs.forEach(({
        thumb
      }, i) => {
        if (i === this._index) {
          thumb.setAttribute('data-current', '');
          if (follow && typeof thumb.scrollIntoView === 'function') {
            thumb.scrollIntoView({
              block: 'nearest'
            });
          }
        } else {
          thumb.removeAttribute('data-current');
        }
      });
    }
    _openMenu(i, x, y) {
      if (!this._menu) return;
      this._menuIndex = i;
      const slide = this._slides[i];
      const skip = slide && slide.hasAttribute('data-deck-skip');
      this._menu.querySelector('[data-act="skip"]').textContent = skip ? 'Unskip slide' : 'Skip slide';
      this._menu.querySelector('[data-act="up"]').disabled = i <= 0;
      this._menu.querySelector('[data-act="down"]').disabled = i >= this._slides.length - 1;
      this._menu.querySelector('[data-act="delete"]').disabled = this._slides.length <= 1;
      // Place, then clamp to viewport after it's measurable.
      this._menu.style.left = x + 'px';
      this._menu.style.top = y + 'px';
      this._menu.setAttribute('data-open', '');
      const r = this._menu.getBoundingClientRect();
      const nx = Math.min(x, window.innerWidth - r.width - 4);
      const ny = Math.min(y, window.innerHeight - r.height - 4);
      this._menu.style.left = Math.max(4, nx) + 'px';
      this._menu.style.top = Math.max(4, ny) + 'px';
    }
    _closeMenu() {
      if (this._menu) this._menu.removeAttribute('data-open');
      this._menuIndex = -1;
    }
    _openConfirm(i) {
      if (!this._confirm) return;
      this._confirmIndex = i;
      this._confirm.querySelector('.title').textContent = 'Delete slide ' + (i + 1) + '?';
      this._confirm.setAttribute('data-open', '');
      const btn = this._confirm.querySelector('.danger');
      if (btn && btn.focus) btn.focus();
    }
    _closeConfirm() {
      if (this._confirm) this._confirm.removeAttribute('data-open');
      this._confirmIndex = -1;
    }
    _emitDeckChange(detail) {
      this.dispatchEvent(new CustomEvent('deckchange', {
        detail,
        bubbles: true,
        composed: true
      }));
    }
    _deleteSlide(i) {
      const slide = this._slides[i];
      if (!slide || this._slides.length <= 1) return;
      const wasCurrent = i === this._index;
      if (i < this._index || wasCurrent && i === this._slides.length - 1) this._index--;
      this._squelchSlotChange = true;
      slide.remove();
      this._emitDeckChange({
        action: 'delete',
        from: i,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _toggleSkip(i) {
      const slide = this._slides[i];
      if (!slide) return;
      const on = !slide.hasAttribute('data-deck-skip');
      if (on) slide.setAttribute('data-deck-skip', '');else slide.removeAttribute('data-deck-skip');
      if (this._thumbs && this._thumbs[i]) {
        if (on) this._thumbs[i].thumb.setAttribute('data-skip', '');else this._thumbs[i].thumb.removeAttribute('data-skip');
      }
      this._markLastVisible();
      this._emitDeckChange({
        action: on ? 'skip' : 'unskip',
        from: i,
        slide
      });
      // Re-broadcast so the presenter popup's prev/next thumbnails re-pick
      // the nearest non-skipped slide without waiting for a nav event.
      try {
        window.postMessage({
          slideIndexChanged: this._index,
          deckTotal: this._slides.length,
          deckSkipped: this._skippedIndices()
        }, '*');
      } catch (e) {}
    }
    _skippedIndices() {
      const out = [];
      for (let i = 0; i < this._slides.length; i++) {
        if (this._slides[i].hasAttribute('data-deck-skip')) out.push(i);
      }
      return out;
    }
    _moveSlide(i, j) {
      if (j < 0 || j >= this._slides.length || j === i) return;
      const slide = this._slides[i];
      const ref = j < i ? this._slides[j] : this._slides[j].nextSibling;
      // Track the active slide across the reorder so the same content
      // stays on screen.
      const cur = this._index;
      if (cur === i) this._index = j;else if (i < cur && j >= cur) this._index = cur - 1;else if (i > cur && j <= cur) this._index = cur + 1;
      this._squelchSlotChange = true;
      this.insertBefore(slide, ref);
      this._emitDeckChange({
        action: 'move',
        from: i,
        to: j,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'mutation'
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._advance(1, 'api');
    }
    prev() {
      this._advance(-1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "decks/deck-stage.js", error: String((e && e.message) || e) }); }

// route-detail/FAQAccordion.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
/* ============================================================
   FAQAccordion — clean accordion. Two-column intro + accordion.
   ============================================================ */
const {
  useState: useFaqState
} = React;
function FAQAccordion() {
  const items = [{
    q: "¿Tengo que reservar con mucha antelación?",
    a: "Recomendamos al menos 2 meses antes de la fecha de salida, especialmente en mayo, junio y septiembre — los hoteles del Camino se llenan pronto. Para fechas en temporada baja (noviembre a marzo) podemos preparar tu Camino con 3 semanas."
  }, {
    q: "¿Qué pasa si me lesiono en mitad del Camino?",
    a: "Nuestra asistencia 24h te atiende en español y, si lo necesitas, enviamos el coche de emergencia para llevarte al alojamiento o al centro médico más cercano. No pagas extra por ello."
  }, {
    q: "¿Cómo funciona el transporte de equipaje?",
    a: "Cada mañana dejas tu maleta en recepción antes de las 8:00. Antes de tu llegada al siguiente alojamiento, tu equipaje ya está allí. Cabe una maleta de hasta 20 kg por persona."
  }, {
    q: "¿Puedo cambiar fechas una vez reservado?",
    a: "Sí. Hasta 30 días antes de la salida los cambios de fecha son gratuitos, sujeto a disponibilidad. A partir de ahí depende del tipo de alojamiento — te lo dejamos por escrito en el presupuesto."
  }, {
    q: "¿Hay opción de habitación individual sin suplemento de pareja?",
    a: "Sí. La individual tiene un suplemento medio de 25-40€ por noche según hotel. Lo verás desglosado en el presupuesto antes de pagar nada."
  }, {
    q: "¿Está incluida la Compostela?",
    a: "La Compostela la entrega gratuitamente la Oficina del Peregrino en Santiago. Nosotros te entregamos la credencial al inicio y te explicamos dónde sellarla cada noche."
  }, {
    q: "¿Puedo hacer el Camino con perro?",
    a: "Sí — varias rutas son pet-friendly y reservamos alojamientos que aceptan perros. Llámanos o pídelo en el formulario, te preparamos una propuesta específica."
  }, {
    q: "¿Aceptan grupos grandes o empresas?",
    a: "Sí, organizamos grupos de hasta 60 personas para empresas, asociaciones y centros educativos. Tenemos un equipo dedicado a viajes corporativos — escríbenos a grupos@santiagoways.com."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: faqStyles.section,
    id: "faq"
  }, /*#__PURE__*/React.createElement("div", {
    style: faqStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: faqStyles.head
  }, /*#__PURE__*/React.createElement("div", {
    style: faqStyles.kicker
  }, "PREGUNTAS FRECUENTES"), /*#__PURE__*/React.createElement("h2", {
    style: faqStyles.h2
  }, "Todo lo que dudaste antes", /*#__PURE__*/React.createElement("br", null), "de preguntar."), /*#__PURE__*/React.createElement("p", {
    style: faqStyles.lead
  }, "Si tu pregunta no est\xE1 aqu\xED, escr\xEDbenos a", " ", /*#__PURE__*/React.createElement("a", {
    href: "mailto:hola@santiagoways.com",
    style: faqStyles.link
  }, "hola@santiagoways.com"), " ", "o ll\xE1manos al ", /*#__PURE__*/React.createElement("b", null, "900 000 000"), ". Atendemos personas, no bots.")), /*#__PURE__*/React.createElement("div", {
    style: faqStyles.list
  }, items.map((it, i) => /*#__PURE__*/React.createElement(FAQRow, _extends({
    key: i,
    idx: i
  }, it))))));
}
function FAQRow({
  q,
  a,
  idx
}) {
  const [open, setOpen] = useFaqState(idx === 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...faqStyles.row,
      ...(open ? faqStyles.rowOpen : {})
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: faqStyles.qBtn,
    onClick: () => setOpen(!open),
    "aria-expanded": open
  }, /*#__PURE__*/React.createElement("span", {
    style: faqStyles.qText
  }, q), /*#__PURE__*/React.createElement("span", {
    style: {
      ...faqStyles.toggle,
      transform: open ? "rotate(45deg)" : "rotate(0)"
    }
  }, "+")), open && /*#__PURE__*/React.createElement("div", {
    style: faqStyles.aText
  }, a));
}
const faqStyles = {
  section: {
    background: "white",
    padding: "96px 0",
    borderTop: "1px solid #E5E5DF"
  },
  inner: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "0 32px"
  },
  head: {
    textAlign: "center",
    maxWidth: 640,
    margin: "0 auto 48px"
  },
  kicker: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#7AA606",
    marginBottom: 12
  },
  h2: {
    fontSize: 44,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
    margin: "0 0 16px",
    color: "#1A1A1A",
    textWrap: "balance"
  },
  lead: {
    fontSize: 16,
    color: "#525249",
    lineHeight: 1.55,
    margin: 0
  },
  link: {
    color: "#7AA606",
    fontWeight: 700,
    textDecoration: "underline"
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  row: {
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 14,
    overflow: "hidden",
    transition: "border-color 120ms, box-shadow 120ms"
  },
  rowOpen: {
    borderColor: "#7AA606",
    boxShadow: "0 4px 14px rgba(122,166,6,0.10)"
  },
  qBtn: {
    width: "100%",
    background: "transparent",
    border: "none",
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left"
  },
  qText: {
    flex: 1,
    fontSize: 16.5,
    fontWeight: 700,
    color: "#1A1A1A"
  },
  toggle: {
    width: 30,
    height: 30,
    borderRadius: 999,
    background: "#F4F8E6",
    color: "#4F6B0F",
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    fontWeight: 600,
    transition: "transform 220ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    flexShrink: 0
  },
  aText: {
    padding: "0 24px 22px",
    fontSize: 15,
    lineHeight: 1.6,
    color: "#36362F",
    maxWidth: 760
  }
};
window.FAQAccordion = FAQAccordion;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/FAQAccordion.jsx", error: String((e && e.message) || e) }); }

// route-detail/QuoteForm.jsx
try { (() => {
/* global React */
/* ============================================================
   QuoteForm — sticky right column. Compact version: labels are
   placed INSIDE the inputs as floating placeholders, dramatically
   reducing vertical scroll vs label-above-input layout.
   ============================================================ */
const {
  useState: useQFState
} = React;
function QuoteForm() {
  const [data, setData] = useQFState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    startDate: "",
    people: "2",
    room: "Doble",
    caminoOption: "7 días / 6 noches hasta Santiago",
    regimen: "Desayuno y cena",
    observations: "",
    accept: false
  });
  const [submitted, setSub] = useQFState(false);
  const upd = (k, v) => setData({
    ...data,
    [k]: v
  });
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      style: qfStyles.card,
      id: "presupuesto"
    }, /*#__PURE__*/React.createElement("div", {
      style: qfStyles.successWrap
    }, /*#__PURE__*/React.createElement("div", {
      style: qfStyles.successIcon
    }, "\uD83D\uDC1A"), /*#__PURE__*/React.createElement("div", {
      style: qfStyles.successTitle
    }, "\xA1Gracias, ", data.firstName || "peregrino", "!"), /*#__PURE__*/React.createElement("div", {
      style: qfStyles.successBody
    }, "Te llega el presupuesto al email en las pr\xF3ximas ", /*#__PURE__*/React.createElement("b", null, "24 horas"), ". Si quieres adelantar, ll\xE1manos al ", /*#__PURE__*/React.createElement("b", null, "+34 928 970 605"), "."), /*#__PURE__*/React.createElement("button", {
      style: qfStyles.ghostBtn,
      onClick: () => setSub(false)
    }, "\u2190 Editar solicitud")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: qfStyles.card,
    id: "presupuesto"
  }, /*#__PURE__*/React.createElement("div", {
    style: qfStyles.head
  }, /*#__PURE__*/React.createElement("div", {
    style: qfStyles.kicker
  }, "PRESUPUESTO GRATUITO \xB7 SIN COMPROMISO"), /*#__PURE__*/React.createElement("div", {
    style: qfStyles.title
  }, "Conseguir presupuesto"), /*#__PURE__*/React.createElement("div", {
    style: qfStyles.sub
  }, "Respondemos en menos de ", /*#__PURE__*/React.createElement("b", null, "24h"), ". Sin spam, sin letra peque\xF1a.")), /*#__PURE__*/React.createElement("form", {
    style: qfStyles.body,
    onSubmit: e => {
      e.preventDefault();
      setSub(true);
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: qfStyles.grid2
  }, /*#__PURE__*/React.createElement(FloatInput, {
    placeholder: "Nombre",
    required: true,
    value: data.firstName,
    onChange: v => upd("firstName", v)
  }), /*#__PURE__*/React.createElement(FloatInput, {
    placeholder: "Apellidos",
    required: true,
    value: data.lastName,
    onChange: v => upd("lastName", v)
  })), /*#__PURE__*/React.createElement(FloatInput, {
    placeholder: "Email",
    type: "email",
    required: true,
    value: data.email,
    onChange: v => upd("email", v)
  }), /*#__PURE__*/React.createElement("div", {
    style: qfStyles.phoneRow
  }, /*#__PURE__*/React.createElement("div", {
    style: qfStyles.flag
  }, "\uD83C\uDDEA\uD83C\uDDF8 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      marginLeft: 4,
      color: "#76766D"
    }
  }, "+34")), /*#__PURE__*/React.createElement(FloatInput, {
    placeholder: "Tel\xE9fono",
    type: "tel",
    noBorderLeft: true,
    value: data.phone,
    onChange: v => upd("phone", v)
  })), /*#__PURE__*/React.createElement("div", {
    style: qfStyles.grid2
  }, /*#__PURE__*/React.createElement(FloatInput, {
    placeholder: "Primera noche",
    type: "text",
    value: data.startDate,
    onChange: v => upd("startDate", v)
  }), /*#__PURE__*/React.createElement(FloatSelect, {
    placeholder: "Personas",
    value: data.people,
    onChange: v => upd("people", v),
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "+8"]
  })), /*#__PURE__*/React.createElement(FloatSelect, {
    placeholder: "Opciones de Camino",
    value: data.caminoOption,
    onChange: v => upd("caminoOption", v),
    options: ["7 días / 6 noches hasta Santiago", "8 días / 7 noches hasta Santiago", "6 días / 5 noches hasta Santiago", "Itinerario a medida"]
  }), /*#__PURE__*/React.createElement(FloatSelect, {
    placeholder: "R\xE9gimen alimenticio",
    value: data.regimen,
    onChange: v => upd("regimen", v),
    options: ["Desayuno y cena", "Solo desayuno", "Media pensión", "Sin régimen"]
  }), /*#__PURE__*/React.createElement("div", {
    style: qfStyles.segRow
  }, ["Individual", "Doble", "Triple"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    type: "button",
    onClick: () => upd("room", t),
    style: {
      ...qfStyles.segBtn,
      ...(data.room === t ? qfStyles.segBtnActive : {})
    }
  }, t))), /*#__PURE__*/React.createElement(FloatTextarea, {
    placeholder: "Observaciones (traslados, noches extra, viajamos con perro\u2026)",
    value: data.observations,
    onChange: v => upd("observations", v)
  }), /*#__PURE__*/React.createElement("label", {
    style: qfStyles.acceptRow
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    style: qfStyles.acceptBox,
    checked: data.accept,
    onChange: e => upd("accept", e.target.checked),
    required: true
  }), /*#__PURE__*/React.createElement("span", {
    style: qfStyles.acceptText
  }, "Acepto la ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: qfStyles.legalLink
  }, "pol\xEDtica de privacidad"), ".")), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: qfStyles.submit
  }, "Conseguir presupuesto \u2192")), /*#__PURE__*/React.createElement("div", {
    style: qfStyles.trust
  }, /*#__PURE__*/React.createElement("div", {
    style: qfStyles.trustItem
  }, /*#__PURE__*/React.createElement("span", {
    style: qfStyles.trustIcon
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "+12.000"), " peregrinos guiados")), /*#__PURE__*/React.createElement("div", {
    style: qfStyles.trustItem
  }, /*#__PURE__*/React.createElement("span", {
    style: qfStyles.trustIcon
  }, "\u2605"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "4,7/5"), " \xB7 2.672 rese\xF1as en Google"))));
}

/* ===== Floating-label primitives =========================== */

function FloatInput({
  placeholder,
  value,
  onChange,
  type = "text",
  required,
  noBorderLeft
}) {
  const [focused, setFocused] = useQFState(false);
  const filled = value && value.length > 0;
  const float = focused || filled;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...qfStyles.floatWrap,
      ...(noBorderLeft ? qfStyles.floatNoBorderLeft : {})
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: type,
    value: value,
    required: required,
    onChange: e => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      ...qfStyles.floatInput,
      ...(noBorderLeft ? qfStyles.floatInputNoBorderLeft : {}),
      ...(float ? qfStyles.floatInputElevated : {}),
      ...(focused ? qfStyles.floatInputFocus : {})
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...qfStyles.floatLabel,
      ...(float ? qfStyles.floatLabelUp : {}),
      ...(focused ? qfStyles.floatLabelActive : {})
    }
  }, placeholder, required && /*#__PURE__*/React.createElement("span", {
    style: qfStyles.req
  }, " *")));
}
function FloatSelect({
  placeholder,
  value,
  onChange,
  options
}) {
  const [focused, setFocused] = useQFState(false);
  const filled = value && value.length > 0;
  const float = true; // selects always have a value, label stays up
  return /*#__PURE__*/React.createElement("div", {
    style: qfStyles.floatWrap
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: e => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      ...qfStyles.floatInput,
      ...qfStyles.floatInputElevated,
      ...(focused ? qfStyles.floatInputFocus : {}),
      appearance: "none",
      paddingRight: 36,
      backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%2376766D' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 14px center",
      cursor: "pointer"
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o))), /*#__PURE__*/React.createElement("span", {
    style: {
      ...qfStyles.floatLabel,
      ...qfStyles.floatLabelUp,
      ...(focused ? qfStyles.floatLabelActive : {})
    }
  }, placeholder));
}
function FloatTextarea({
  placeholder,
  value,
  onChange
}) {
  const [focused, setFocused] = useQFState(false);
  const filled = value && value.length > 0;
  const float = focused || filled;
  return /*#__PURE__*/React.createElement("div", {
    style: qfStyles.floatWrap
  }, /*#__PURE__*/React.createElement("textarea", {
    value: value,
    rows: 3,
    onChange: e => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      ...qfStyles.floatInput,
      paddingTop: 18,
      paddingBottom: 12,
      minHeight: 70,
      resize: "vertical",
      fontFamily: "inherit",
      ...(float ? qfStyles.floatInputElevated : {}),
      ...(focused ? qfStyles.floatInputFocus : {})
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...qfStyles.floatLabel,
      ...(float ? qfStyles.floatLabelUp : {
        top: 16
      }),
      ...(focused ? qfStyles.floatLabelActive : {})
    }
  }, placeholder));
}

/* ===== Styles ============================================== */

const qfStyles = {
  card: {
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 22px 48px rgba(26,26,26,0.10), 0 4px 12px rgba(26,26,26,0.05)"
  },
  head: {
    padding: "20px 22px 16px",
    background: "linear-gradient(180deg, #7AA606 0%, #668814 100%)",
    color: "white"
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 8
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.01em",
    lineHeight: 1.15
  },
  sub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.92)",
    marginTop: 4
  },
  body: {
    padding: "16px 18px 4px",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8
  },
  /* float-label primitives */
  floatWrap: {
    position: "relative",
    width: "100%"
  },
  floatInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "20px 12px 8px",
    fontSize: 14,
    fontFamily: "inherit",
    borderRadius: 9,
    border: "1px solid #CFCFC6",
    background: "white",
    color: "#1A1A1A",
    outline: "none",
    transition: "border-color 120ms, box-shadow 120ms",
    minHeight: 50
  },
  floatInputElevated: {},
  floatInputFocus: {
    borderColor: "#7AA606",
    boxShadow: "0 0 0 3px rgba(122,166,6,0.18)"
  },
  floatInputNoBorderLeft: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeft: 0
  },
  floatNoBorderLeft: {
    flex: 1
  },
  floatLabel: {
    position: "absolute",
    left: 13,
    top: 16,
    fontSize: 14,
    color: "#76766D",
    fontWeight: 500,
    pointerEvents: "none",
    transition: "top 160ms cubic-bezier(0.22,0.61,0.36,1), font-size 160ms, color 160ms",
    background: "transparent"
  },
  floatLabelUp: {
    top: 7,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.02em",
    color: "#525249"
  },
  floatLabelActive: {
    color: "#4F6B0F"
  },
  req: {
    color: "#C2410C"
  },
  phoneRow: {
    display: "flex",
    alignItems: "stretch"
  },
  flag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0 10px",
    border: "1px solid #CFCFC6",
    borderRight: 0,
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
    background: "#FAFAF7",
    fontSize: 16
  },
  segRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6
  },
  segBtn: {
    padding: "11px 8px",
    background: "white",
    border: "1px solid #CFCFC6",
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 600,
    color: "#36362F",
    cursor: "pointer",
    transition: "all 120ms"
  },
  segBtnActive: {
    background: "#F4F8E6",
    borderColor: "#7AA606",
    color: "#4F6B0F",
    fontWeight: 800,
    boxShadow: "inset 0 0 0 1px #7AA606"
  },
  acceptRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 2
  },
  acceptBox: {
    width: 16,
    height: 16,
    accentColor: "#7AA606",
    marginTop: 2,
    flexShrink: 0
  },
  acceptText: {
    fontSize: 12,
    color: "#36362F",
    lineHeight: 1.5
  },
  legalLink: {
    color: "#7AA606",
    textDecoration: "underline"
  },
  submit: {
    background: "#7AA606",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "15px 18px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 4,
    marginBottom: 8,
    boxShadow: "0 8px 22px rgba(122,166,6,0.32)",
    letterSpacing: "-0.005em"
  },
  trust: {
    borderTop: "1px solid #F2F2EE",
    background: "#FAFAF7",
    padding: "12px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12.5,
    color: "#36362F"
  },
  trustIcon: {
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "#7AA606",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 800,
    flexShrink: 0
  },
  successWrap: {
    padding: "44px 28px 36px",
    textAlign: "center"
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 14
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1A1A1A",
    marginBottom: 10
  },
  successBody: {
    fontSize: 14.5,
    color: "#525249",
    lineHeight: 1.55,
    marginBottom: 22
  },
  ghostBtn: {
    background: "transparent",
    border: "none",
    color: "#7AA606",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit"
  }
};
window.QuoteForm = QuoteForm;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/QuoteForm.jsx", error: String((e && e.message) || e) }); }

// route-detail/ReviewsWall.jsx
try { (() => {
/* global React */
/* ============================================================
   ReviewsWall — full-width section with Google rating header,
   masonry-ish review cards. Replaces the cramped right column.
   ============================================================ */
function ReviewsWall() {
  const reviews = [{
    name: "Alfonso Taylor",
    date: "ayer",
    rating: 5,
    avatarColor: "#7AA606",
    text: "Excelente servicio, planificación y ubicaciones fantásticas a lo largo del camino."
  }, {
    name: "Daniela Figueroa",
    date: "ayer",
    rating: 5,
    avatarColor: "#94B833",
    text: "Hicimos el trayecto desde Tui hasta Santiago. Excelente experiencia, nos sentimos muy cuidados, los hoteles y servicios muy buenos. ¡Recomendable!"
  }, {
    name: "Rafa",
    date: "hace 2 días",
    rating: 5,
    avatarColor: "#4F6B0F",
    text: "Extraordinaria gestión tanto de alojamientos como de traslados de maletas. En general todos los hoteles limpios y atención de diez."
  }, {
    name: "Lilo I.",
    date: "hace 3 días",
    rating: 5,
    avatarColor: "#668814",
    text: "Hicimos los últimos 100 km del Camino Francés. Todo perfectamente organizado, las maletas siempre en destino antes que nosotros."
  }, {
    name: "Sara M.",
    date: "la semana pasada",
    rating: 5,
    avatarColor: "#B0CC66",
    text: "Como mujer viajando sola me sentí cuidada en todo momento. La asistencia 24h fue clave una noche que llegué tarde."
  }, {
    name: "Marc & Júlia",
    date: "hace 1 semana",
    rating: 5,
    avatarColor: "#36500B",
    text: "Lo recomendamos al 100%. Nos preparon un itinerario a medida porque íbamos con poco tiempo. ¡Volveremos a por la Vía de la Plata!"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: rwStyles.section,
    id: "resenas"
  }, /*#__PURE__*/React.createElement("div", {
    style: rwStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: rwStyles.head
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rwStyles.kicker
  }, "QU\xC9 DICEN DE NOSOTROS"), /*#__PURE__*/React.createElement("h2", {
    style: rwStyles.h2
  }, "+12.000 peregrinos", /*#__PURE__*/React.createElement("br", null), "ya hicieron su Camino.")), /*#__PURE__*/React.createElement("div", {
    style: rwStyles.googleCard
  }, /*#__PURE__*/React.createElement("div", {
    style: rwStyles.googleHeader
  }, /*#__PURE__*/React.createElement("span", {
    style: rwStyles.googleG
  }, "G"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rwStyles.googleLabel
  }, "Excelente"), /*#__PURE__*/React.createElement("div", {
    style: rwStyles.googleSub
  }, "Santiago Ways"))), /*#__PURE__*/React.createElement("div", {
    style: rwStyles.bigRating
  }, /*#__PURE__*/React.createElement("span", {
    style: rwStyles.bigStars
  }, "\u2605\u2605\u2605\u2605\u2605"), /*#__PURE__*/React.createElement("span", {
    style: rwStyles.bigNumber
  }, "4,7")), /*#__PURE__*/React.createElement("div", {
    style: rwStyles.basedOn
  }, "Basado en ", /*#__PURE__*/React.createElement("b", null, "2.675 rese\xF1as"), " en Google"))), /*#__PURE__*/React.createElement("div", {
    style: rwStyles.grid
  }, reviews.map((r, i) => /*#__PURE__*/React.createElement("article", {
    key: i,
    style: rwStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: rwStyles.cardTop
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...rwStyles.avatar,
      background: r.avatarColor
    }
  }, r.name.charAt(0)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: rwStyles.name
  }, r.name), /*#__PURE__*/React.createElement("div", {
    style: rwStyles.date
  }, r.date)), /*#__PURE__*/React.createElement("span", {
    style: rwStyles.googleBadge
  }, "G")), /*#__PURE__*/React.createElement("div", {
    style: rwStyles.stars
  }, "★".repeat(r.rating)), /*#__PURE__*/React.createElement("p", {
    style: rwStyles.text
  }, r.text)))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: rwStyles.allBtn
  }, "Ver todas las rese\xF1as en Google \u2192"))));
}
const rwStyles = {
  section: {
    background: "#FAFAF7",
    padding: "96px 0",
    borderTop: "1px solid #E5E5DF"
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px"
  },
  head: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: 48,
    alignItems: "end",
    marginBottom: 48
  },
  kicker: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#7AA606",
    marginBottom: 12
  },
  h2: {
    fontSize: 48,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.02,
    margin: 0,
    color: "#1A1A1A",
    textWrap: "balance"
  },
  googleCard: {
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 16,
    padding: "20px 22px",
    boxShadow: "0 4px 12px rgba(26,26,26,0.06)"
  },
  googleHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 10
  },
  googleG: {
    width: 36,
    height: 36,
    borderRadius: 999,
    background: "linear-gradient(135deg, #4285F4, #34A853 50%, #FBBC05 75%, #EA4335)",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18
  },
  googleLabel: {
    fontSize: 16,
    fontWeight: 800,
    color: "#1A1A1A"
  },
  googleSub: {
    fontSize: 12,
    color: "#76766D"
  },
  bigRating: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 6
  },
  bigStars: {
    color: "#F4C530",
    letterSpacing: 2,
    fontSize: 22
  },
  bigNumber: {
    fontSize: 26,
    fontWeight: 900,
    color: "#1A1A1A"
  },
  basedOn: {
    fontSize: 13,
    color: "#525249"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 18
  },
  card: {
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 14,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 15
  },
  name: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1A1A1A"
  },
  date: {
    fontSize: 12,
    color: "#76766D"
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "linear-gradient(135deg, #4285F4, #34A853 50%, #FBBC05 75%, #EA4335)",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 11
  },
  stars: {
    color: "#F4C530",
    letterSpacing: 2,
    fontSize: 15
  },
  text: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: "#1A1A1A"
  },
  allBtn: {
    display: "inline-block",
    padding: "12px 22px",
    background: "white",
    border: "1px solid #1A1A1A",
    borderRadius: 999,
    color: "#1A1A1A",
    fontSize: 14,
    fontWeight: 700,
    textDecoration: "none"
  }
};
window.ReviewsWall = ReviewsWall;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/ReviewsWall.jsx", error: String((e && e.message) || e) }); }

// route-detail/RouteHero.jsx
try { (() => {
/* global React */
/* ============================================================
   RouteHero — dark hero v2 with the REAL photo as full-bleed
   background and a strong dark overlay for legibility.
   Left column: breadcrumb, eyebrow pill, big title with
   brushstroke, lead, stats pills, 2 CTAs, rating.
   Right column: price card + Google rating widget stacked.
   ============================================================ */
function RouteHero() {
  return /*#__PURE__*/React.createElement("section", {
    style: rhStyles.wrap
  }, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.bgPhoto
  }), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.bgOverlay
  }), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.inner
  }, /*#__PURE__*/React.createElement("nav", {
    style: rhStyles.crumb
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: rhStyles.crumbLink
  }, "Home"), /*#__PURE__*/React.createElement("span", {
    style: rhStyles.crumbSep
  }, "\u203A"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: rhStyles.crumbLink
  }, "Camino de Santiago"), /*#__PURE__*/React.createElement("span", {
    style: rhStyles.crumbSep
  }, "\u203A"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: rhStyles.crumbLink
  }, "Camino Franc\xE9s"), /*#__PURE__*/React.createElement("span", {
    style: rhStyles.crumbSep
  }, "\u203A"), /*#__PURE__*/React.createElement("span", {
    style: rhStyles.crumbCurrent
  }, "desde Sarria")), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.grid
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.eyebrow
  }, /*#__PURE__*/React.createElement("span", {
    style: rhStyles.eyebrowDot
  }), "LA RUTA M\xC1S POPULAR \xB7 100 KM M\xCDNIMOS"), /*#__PURE__*/React.createElement("h1", {
    style: rhStyles.h1
  }, "Camino Franc\xE9s", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: rhStyles.brushWrap
  }, /*#__PURE__*/React.createElement("span", {
    style: rhStyles.brush
  }), /*#__PURE__*/React.createElement("span", {
    style: rhStyles.brushText
  }, "desde Sarria"))), /*#__PURE__*/React.createElement("p", {
    style: rhStyles.lead
  }, "111 km de bosques, aldeas de piedra y paisaje verde gallego. La secci\xF3n m\xE1s caminada del Camino \u2014 y la mejor manera de captar la esencia sin renunciar a una semana de viaje."), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.stats
  }, /*#__PURE__*/React.createElement(Stat, {
    top: "111",
    big: "km",
    sub: "Sarria \u2192 Santiago"
  }), /*#__PURE__*/React.createElement(Stat, {
    top: "7d",
    big: "/ 6n",
    sub: "ritmo c\xF3modo"
  }), /*#__PURE__*/React.createElement(Stat, {
    top: "F\xE1cil",
    sub: "apto para todos"
  }), /*#__PURE__*/React.createElement(Stat, {
    top: "\u2713",
    sub: "cumple Compostela"
  })), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.actions
  }, /*#__PURE__*/React.createElement("a", {
    href: "#presupuesto",
    style: rhStyles.primary
  }, "\uD83D\uDC1A \xA1Solicita tu presupuesto!"), /*#__PURE__*/React.createElement("a", {
    href: "#itinerario",
    style: rhStyles.ghost
  }, "Ver itinerario d\xEDa a d\xEDa \u2192")), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.rating
  }, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.stars
  }, "\u2605\u2605\u2605\u2605\u2605"), /*#__PURE__*/React.createElement("b", null, "4,7/5"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "rgba(255,255,255,0.7)"
    }
  }, "\xB7 2.672 rese\xF1as en Google"))), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.sideCol
  }, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.priceCard
  }, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.priceFrom
  }, "desde"), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.priceBig
  }, "589", /*#__PURE__*/React.createElement("span", {
    style: rhStyles.priceCur
  }, "\u20AC")), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.pricePer
  }, "por persona \xB7 7 d\xEDas / 6 noches"), /*#__PURE__*/React.createElement("a", {
    href: "#presupuesto",
    style: rhStyles.priceCta
  }, "Pide tu presupuesto \u2192"), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.priceBullets
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: rhStyles.bulletCheck
  }, "\u2713"), " Hotel con ba\xF1o privado"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: rhStyles.bulletCheck
  }, "\u2713"), " Equipaje transportado"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: rhStyles.bulletCheck
  }, "\u2713"), " Asistencia 24h"))), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.googleWidget
  }, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.gwTop
  }, /*#__PURE__*/React.createElement("span", {
    style: rhStyles.gwG
  }, "G"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.gwLabel
  }, "Excelente"), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.gwSub
  }, "Santiago Ways"))), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.gwRating
  }, /*#__PURE__*/React.createElement("span", {
    style: rhStyles.gwStars
  }, "\u2605\u2605\u2605\u2605\u2605"), /*#__PURE__*/React.createElement("b", null, "4,7")), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.gwReviews
  }, "2.672 rese\xF1as"))))));
}
function Stat({
  top,
  big,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: rhStyles.stat
  }, /*#__PURE__*/React.createElement("div", {
    style: rhStyles.statNum
  }, top, big && /*#__PURE__*/React.createElement("span", {
    style: rhStyles.statUnit
  }, big)), /*#__PURE__*/React.createElement("div", {
    style: rhStyles.statSub
  }, sub));
}
const rhStyles = {
  wrap: {
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    color: "white",
    paddingTop: 28,
    paddingBottom: 80,
    minHeight: 620
  },
  bgPhoto: {
    position: "absolute",
    inset: 0,
    zIndex: -2,
    background: "url('assets/hero-sarria.png') center 30% / cover no-repeat"
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: -1,
    background: ["linear-gradient(125deg, rgba(15, 22, 8, 0.92) 0%, rgba(15, 22, 8, 0.65) 45%, rgba(15, 22, 8, 0.35) 100%)", "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)"].join(", ")
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px",
    position: "relative"
  },
  crumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 40,
    flexWrap: "wrap"
  },
  crumbLink: {
    color: "rgba(255,255,255,0.78)",
    textDecoration: "none"
  },
  crumbSep: {
    color: "rgba(255,255,255,0.4)"
  },
  crumbCurrent: {
    color: "white",
    fontWeight: 600
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 320px",
    gap: 56,
    alignItems: "start"
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(122,166,6,0.20)",
    border: "1px solid rgba(148,184,51,0.55)",
    color: "#DCEDA1",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 22,
    backdropFilter: "blur(6px)"
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "#94B833",
    boxShadow: "0 0 0 4px rgba(148,184,51,0.30)"
  },
  h1: {
    fontSize: 76,
    fontWeight: 900,
    lineHeight: 0.98,
    letterSpacing: "-0.025em",
    margin: "0 0 22px",
    textWrap: "balance",
    color: "white",
    textShadow: "0 4px 24px rgba(0,0,0,0.5)"
  },
  brushWrap: {
    display: "inline-block",
    position: "relative",
    isolation: "isolate",
    paddingRight: 12
  },
  brush: {
    position: "absolute",
    inset: "10% -14px 14% -14px",
    background: "#7AA606",
    transform: "rotate(-1.2deg)",
    borderRadius: 6,
    boxShadow: "0 0 0 6px #7AA606",
    clipPath: "polygon(0% 12%, 3% 0%, 97% 5%, 100% 18%, 99% 88%, 96% 100%, 4% 95%, 0% 86%)",
    zIndex: -1
  },
  brushText: {
    color: "white"
  },
  lead: {
    fontSize: 19,
    lineHeight: 1.55,
    color: "rgba(255,255,255,0.92)",
    margin: "0 0 32px",
    maxWidth: 540,
    textWrap: "pretty",
    textShadow: "0 1px 8px rgba(0,0,0,0.4)"
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, auto)",
    gap: 36,
    marginBottom: 32
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  statNum: {
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: "-0.02em",
    lineHeight: 1,
    color: "white"
  },
  statUnit: {
    fontSize: 18,
    fontWeight: 700,
    color: "#94B833",
    marginLeft: 4
  },
  statSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)"
  },
  actions: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 24
  },
  primary: {
    background: "#7AA606",
    color: "white",
    padding: "16px 26px",
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "0 14px 28px rgba(122,166,6,0.40), 0 0 0 1px rgba(255,255,255,0.18) inset",
    display: "inline-flex",
    alignItems: "center",
    gap: 10
  },
  ghost: {
    color: "white",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 600,
    padding: "16px 4px"
  },
  rating: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14
  },
  stars: {
    color: "#F4C530",
    letterSpacing: 2,
    fontSize: 14
  },
  /* Side column */
  sideCol: {
    display: "flex",
    flexDirection: "column",
    gap: 14
  },
  priceCard: {
    background: "white",
    color: "#1A1A1A",
    borderRadius: 18,
    padding: "22px 22px 18px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  priceFrom: {
    fontSize: 12,
    color: "#76766D",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase"
  },
  priceBig: {
    fontSize: 56,
    fontWeight: 900,
    letterSpacing: "-0.03em",
    lineHeight: 1,
    color: "#1A1A1A",
    marginTop: -2
  },
  priceCur: {
    fontSize: 32,
    fontWeight: 700,
    color: "#7AA606",
    marginLeft: 2,
    verticalAlign: "top"
  },
  pricePer: {
    fontSize: 12,
    color: "#525249",
    marginBottom: 14
  },
  priceCta: {
    background: "#7AA606",
    color: "white",
    textAlign: "center",
    padding: "12px 16px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 800,
    boxShadow: "0 6px 16px rgba(122,166,6,0.30)",
    marginBottom: 6
  },
  priceBullets: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 6,
    fontSize: 13,
    color: "#36362F"
  },
  bulletCheck: {
    display: "inline-grid",
    placeItems: "center",
    width: 18,
    height: 18,
    borderRadius: 999,
    background: "#F4F8E6",
    color: "#4F6B0F",
    fontSize: 10,
    fontWeight: 800,
    marginRight: 8
  },
  googleWidget: {
    background: "white",
    color: "#1A1A1A",
    padding: "14px 16px",
    borderRadius: 14,
    boxShadow: "0 12px 28px rgba(0,0,0,0.22)"
  },
  gwTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  gwG: {
    width: 30,
    height: 30,
    borderRadius: 999,
    background: "linear-gradient(135deg, #4285F4, #34A853 50%, #FBBC05 75%, #EA4335)",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 15
  },
  gwLabel: {
    fontSize: 14,
    fontWeight: 800,
    color: "#1A1A1A"
  },
  gwSub: {
    fontSize: 11,
    color: "#76766D"
  },
  gwRating: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 18,
    fontWeight: 800
  },
  gwStars: {
    color: "#F4C530",
    letterSpacing: 1.2,
    fontSize: 16
  },
  gwReviews: {
    fontSize: 11,
    color: "#76766D",
    marginTop: 4
  }
};
window.RouteHero = RouteHero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/RouteHero.jsx", error: String((e && e.message) || e) }); }

// route-detail/RouteTabs.jsx
try { (() => {
/* global React */
/* ============================================================
   RouteTabs — content matches the real Santiago Ways "Camino
   Francés desde Sarria" page.
   Tabs: Información · Itinerario · Mapa · Alojamientos ·
         Servicios · FAQ
   ============================================================ */
const {
  useState: useTabsState
} = React;
function RouteTabs() {
  const [tab, setTab] = useTabsState("info");
  const TABS = [{
    id: "info",
    label: "Información",
    icon: "ℹ️"
  }, {
    id: "iti",
    label: "Itinerario",
    icon: "🗺️"
  }, {
    id: "map",
    label: "Mapa",
    icon: "📍"
  }, {
    id: "hotel",
    label: "Alojamientos",
    icon: "🏨"
  }, {
    id: "svc",
    label: "Servicios",
    icon: "⚙️"
  }, {
    id: "faq",
    label: "FAQ",
    icon: "❓"
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.tabBar,
    role: "tablist"
  }, TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    role: "tab",
    "aria-selected": tab === t.id,
    onClick: () => setTab(t.id),
    style: {
      ...rtStyles.tabBtn,
      ...(tab === t.id ? rtStyles.tabBtnActive : {})
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14
    }
  }, t.icon), t.label))), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.panel
  }, tab === "info" && /*#__PURE__*/React.createElement(PanelInfo, null), tab === "iti" && /*#__PURE__*/React.createElement(PanelItinerary, null), tab === "map" && /*#__PURE__*/React.createElement(PanelMap, null), tab === "hotel" && /*#__PURE__*/React.createElement(PanelHotels, null), tab === "svc" && /*#__PURE__*/React.createElement(PanelServices, null), tab === "faq" && /*#__PURE__*/React.createElement(PanelFAQ, null)));
}

/* ===== Información ============================================ */
function PanelInfo() {
  return /*#__PURE__*/React.createElement("div", {
    style: rtStyles.prose
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.kicker
  }, "POR QU\xC9 HACER ESTA RUTA"), /*#__PURE__*/React.createElement("h2", {
    style: rtStyles.h2
  }, "Por qu\xE9 hacer el Camino", /*#__PURE__*/React.createElement("br", null), "de Santiago desde Sarria."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.lead
  }, "El ", /*#__PURE__*/React.createElement("b", null, "Camino de Santiago desde Sarria"), " es la ", /*#__PURE__*/React.createElement("b", null, "secci\xF3n m\xE1s popular de todas las secciones del Camino de Santiago"), ". Esta secci\xF3n, de Sarria a Santiago, es ideal para aquellos peregrinos que quieran captar la ", /*#__PURE__*/React.createElement("b", null, "esencia del Camino de Santiago"), "."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "A lo largo de esta secci\xF3n tendremos la oportunidad de realizar", " ", /*#__PURE__*/React.createElement("b", null, "caminatas agradables"), " a la vez que disfrutamos de la rica gastronom\xEDa local. Esta ruta es ideal para", " ", /*#__PURE__*/React.createElement("b", null, "conocer a otros peregrinos"), " y disfrutar del", " ", /*#__PURE__*/React.createElement("b", null, "magn\xEDfico ambiente"), " a lo largo de todo el camino."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "Comenzaremos en la localidad gallega de ", /*#__PURE__*/React.createElement("b", null, "Sarria"), ", situada a unos 100 km de ", /*#__PURE__*/React.createElement("b", null, "Santiago"), ". La distancia del Camino Franc\xE9s desde Sarria hasta Santiago es de ", /*#__PURE__*/React.createElement("b", null, "111 km"), " \u2014 esta es la distancia m\xEDnima requerida para solicitar el ", /*#__PURE__*/React.createElement("b", null, "certificado de Compostela"), "."), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.callout
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.calloutIcon
  }, "\uD83D\uDC1A"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontSize: 15
    }
  }, "Sarria es el punto m\xE1gico de los 100 km."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      marginTop: 4,
      color: "#525249",
      lineHeight: 1.55
    }
  }, "Es la distancia m\xEDnima para conseguir la ", /*#__PURE__*/React.createElement("b", null, "Compostela"), " \u2014 el certificado oficial. Por eso es la secci\xF3n m\xE1s popular entre quienes buscan vivir el Camino sin renunciar a una semana de viaje."))), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "A lo largo de esta secci\xF3n caminaremos a trav\xE9s de preciosos bosques, tierras de cultivo y aldeas r\xFAsticas siguiendo pistas y senderos bordeados por ", /*#__PURE__*/React.createElement("b", null, "muros de piedra"), ". Podremos contemplar el bonito paisaje verde de ", /*#__PURE__*/React.createElement("b", null, "Galicia"), ". Finalmente llegaremos a nuestro destino, ", /*#__PURE__*/React.createElement("b", null, "Santiago de Compostela"), "."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "En Santiago de Compostela podremos obtener nuestro certificado \xAB", /*#__PURE__*/React.createElement("i", null, "Compostela"), "\xBB y podremos visitar su bonito casco antiguo, declarado ", /*#__PURE__*/React.createElement("b", null, "Patrimonio de la Humanidad por la Unesco"), "."));
}

/* ===== Itinerario ============================================== */
const STAGES = [{
  id: "sarria",
  title: "Sarria",
  km: 0,
  days: "Día 1 — llegada",
  blurb: "Llegada y noche en Sarria. Cena recomendada en el casco viejo, paseo por la Rúa Maior y el Convento de la Magdalena.",
  detail: "Sarria es la villa donde arranca tu Camino. Llegada libre, check-in en el hotel y briefing con nuestra documentación. Te entregamos la credencial — el pasaporte del peregrino — y te explicamos dónde sellarla cada noche."
}, {
  id: "sarria-portomarin",
  title: "De Sarria a Portomarín",
  km: 22.4,
  days: "Día 2 · 22,4 km · ↑ 470 m",
  blurb: "Bosques de robles centenarios, aldeas de piedra y el cruce del embalse de Belesar al final.",
  detail: "Etapa preciosa entre robledales y muros de piedra. Atravesarás aldeas con encanto como Barbadelo y Morgade. Final emocionante: bajada al embalse y subida por la escalera medieval que entra en Portomarín."
}, {
  id: "portomarin-palas",
  title: "De Portomarín a Palas de Rei",
  km: 25.0,
  days: "Día 3 · 25,0 km · ↑ 700 m",
  blurb: "Subida tranquila, cruces medievales y bares cada pocos kilómetros — la etapa más social.",
  detail: "Sube progresivamente por pistas anchas y cómodas. Pasarás por el Hospital da Cruz y Ligonde. Mucha gente, ambiente animado, paradas constantes para café."
}, {
  id: "palas-arzua",
  title: "De Palas de Rei a Arzúa",
  km: 28.5,
  days: "Día 4 · 28,5 km · ↑ 670 m",
  blurb: "La etapa más larga. Atravesarás Melide — pulpo obligatorio en el ecuador.",
  detail: "Es la jornada más exigente por distancia. Recompensa: parada en Melide para el mejor pulpo a feira del Camino. Después, paisaje suave hasta Arzúa, capital del queso DOP Arzúa-Ulloa."
}, {
  id: "arzua-arua",
  title: "De Arzúa a A Rúa",
  km: 19.3,
  days: "Día 5 · 19,3 km · ↑ 540 m",
  blurb: "Eucaliptos, riachuelos y la antesala perfecta a Santiago.",
  detail: "Etapa relajada entre bosques de eucaliptos y pequeñas cascadas. Buen ritmo, perfecta para conversar y reflexionar sobre el camino ya recorrido."
}, {
  id: "arua-santiago",
  title: "De A Rúa a Santiago de Compostela",
  km: 19.8,
  days: "Día 6 · 19,8 km · ↑ 360 m",
  blurb: "El gran día. Monte do Gozo, primera vista de la catedral y entrada en la Praza do Obradoiro.",
  detail: "Subida emocional al Monte do Gozo desde donde verás por primera vez las torres de la catedral. Entrada por la Porta do Camiño hasta plantarte en la Praza do Obradoiro. Llegada inolvidable."
}, {
  id: "santiago",
  title: "Santiago de Compostela",
  km: 0,
  days: "Día 7 — fin del Camino",
  blurb: "Misa del peregrino, recogida de la Compostela y casco antiguo declarado Patrimonio de la Humanidad.",
  detail: "Día libre para visitar la catedral, asistir a la misa del peregrino (12:00 h) y recoger tu Compostela en la Oficina del Peregrino. Casco antiguo: Praza da Quintana, Praza das Praterías, mercado de Abastos."
}];
function PanelItinerary() {
  const [open, setOpen] = useTabsState(1);
  return /*#__PURE__*/React.createElement("div", {
    style: rtStyles.prose
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.kicker
  }, "7 ETAPAS \xB7 111 km"), /*#__PURE__*/React.createElement("h2", {
    style: rtStyles.h2
  }, "Etapa a etapa."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.lead
  }, "Este es el itinerario est\xE1ndar de 7 d\xEDas / 6 noches. Lo ajustamos a tu ritmo \u2014 podemos partirlo en m\xE1s jornadas si quieres caminar menos cada d\xEDa."), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.itineraryList
  }, STAGES.map((s, i) => /*#__PURE__*/React.createElement(ItineraryRow, {
    key: s.id,
    stage: s,
    isOpen: open === i,
    onToggle: () => setOpen(open === i ? -1 : i)
  }))));
}
function ItineraryRow({
  stage,
  isOpen,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: rtStyles.itiRow
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...rtStyles.itiHead,
      background: isOpen ? "#668814" : "#7AA606"
    },
    onClick: onToggle,
    "aria-expanded": isOpen
  }, /*#__PURE__*/React.createElement("span", {
    style: rtStyles.itiIcon
  }, "\uD83D\uDCCD"), /*#__PURE__*/React.createElement("span", {
    style: rtStyles.itiTitle
  }, stage.title), stage.km > 0 && /*#__PURE__*/React.createElement("span", {
    style: rtStyles.itiKm
  }, stage.km, " km"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...rtStyles.itiChev,
      transform: isOpen ? "rotate(180deg)" : "rotate(0)"
    }
  }, "\u25BE")), isOpen && /*#__PURE__*/React.createElement("div", {
    style: rtStyles.itiBody
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.itiMeta
  }, stage.days), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.itiBlurb
  }, stage.blurb), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.itiDetail
  }, stage.detail)));
}

/* ===== Mapa ==================================================== */
function PanelMap() {
  return /*#__PURE__*/React.createElement("div", {
    style: rtStyles.prose
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.kicker
  }, "MAPA DE LA RUTA"), /*#__PURE__*/React.createElement("h2", {
    style: rtStyles.h2
  }, "Visual\xEDzalo entero."), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.mapWrap
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.mapBg
  }), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 800 400",
    style: rtStyles.mapSvg,
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 80 290 C 180 200, 280 320, 360 240 S 520 180, 600 160 S 720 130, 740 105",
    fill: "none",
    stroke: "#F4C530",
    strokeWidth: "5",
    strokeDasharray: "2 12",
    strokeLinecap: "round"
  }), [{
    x: 80,
    y: 290,
    label: "Sarria",
    sub: "Día 1"
  }, {
    x: 220,
    y: 240,
    label: "Portomarín",
    sub: "Día 2"
  }, {
    x: 360,
    y: 240,
    label: "Palas de Rei",
    sub: "Día 3"
  }, {
    x: 500,
    y: 190,
    label: "Arzúa",
    sub: "Día 4"
  }, {
    x: 620,
    y: 155,
    label: "A Rúa",
    sub: "Día 5"
  }, {
    x: 740,
    y: 105,
    label: "Santiago",
    sub: "★ Meta"
  }].map((p, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("circle", {
    cx: p.x,
    cy: p.y,
    r: i === 5 ? 12 : 8,
    fill: i === 5 ? "#F4C530" : "white",
    stroke: "#1A1A1A",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("text", {
    x: p.x,
    y: p.y - 18,
    fontSize: "13",
    fontWeight: "700",
    textAnchor: "middle",
    fill: "white",
    style: {
      paintOrder: "stroke",
      stroke: "rgba(0,0,0,0.6)",
      strokeWidth: 3
    }
  }, p.label), /*#__PURE__*/React.createElement("text", {
    x: p.x,
    y: p.y + 26,
    fontSize: "10",
    fontWeight: "600",
    textAnchor: "middle",
    fill: "rgba(255,255,255,0.8)"
  }, p.sub)))), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.mapLegend
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...rtStyles.legendDot,
      background: "#F4C530"
    }
  }), "Ruta oficial \xB7 111 km", /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 20,
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: "white",
      border: "2px solid #1A1A1A"
    }
  }), "Etapa"))), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.muted
  }, "Mapa esquem\xE1tico. La app de Santiago Ways incluye la traza GPS completa con mapas offline."));
}

/* ===== Alojamientos =========================================== */
function PanelHotels() {
  return /*#__PURE__*/React.createElement("div", {
    style: rtStyles.prose
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.kicker
  }, "D\xD3NDE DUERMES"), /*#__PURE__*/React.createElement("h2", {
    style: rtStyles.h2
  }, "Hotel con ba\xF1o privado. Siempre."), /*#__PURE__*/React.createElement("h3", {
    style: rtStyles.h3Sub
  }, "Informaci\xF3n general"), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "Todas las habitaciones que reserves con Santiago Ways para realizar el Camino de Santiago cuentan con ", /*#__PURE__*/React.createElement("b", null, "ba\xF1o privado"), " y con todos los ", /*#__PURE__*/React.createElement("b", null, "servicios necesarios para garantizar un buen confort"), "."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "Nuestro equipo comprueba ", /*#__PURE__*/React.createElement("i", null, "in situ"), " la calidad de todos los alojamientos ofrecidos, con el fin de que los peregrinos vivan una experiencia inolvidable en el Camino acompa\xF1ada de noches de descanso absoluto."), /*#__PURE__*/React.createElement("h3", {
    style: rtStyles.h3Sub
  }, "Disponibilidad"), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "Al trabajar con ", /*#__PURE__*/React.createElement("b", null, "alojamientos de calidad y con capacidad limitada"), ", el nombre exacto de los mismos se proporcionar\xE1 ", /*#__PURE__*/React.createElement("b", null, "30 d\xEDas antes del inicio del Camino"), "."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "Todos los alojamientos para el Camino de Santiago est\xE1n sujetos a disponibilidad. En caso de no poder ofrecer alguno de ellos por capacidad, te alojaremos en uno de ", /*#__PURE__*/React.createElement("b", null, "igual o mejor calidad"), "."), /*#__PURE__*/React.createElement("h3", {
    style: rtStyles.h3Sub
  }, "Habitaciones individuales"), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "Contamos con habitaciones individuales disponibles sujetas a disponibilidad. Se deben reservar con antelaci\xF3n y conllevan un coste adicional."), /*#__PURE__*/React.createElement("h3", {
    style: rtStyles.h3Sub
  }, "D\xF3nde me voy a alojar"), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.p
  }, "Todos nuestros alojamientos han sido seleccionados para asegurar la", " ", /*#__PURE__*/React.createElement("b", null, "tranquilidad, el descanso y el disfrute"), " a lo largo de tu Camino de Santiago. Encontrar\xE1s ", /*#__PURE__*/React.createElement("b", null, "hoteles \u2605\u2605\u2605, casas rurales, pazos hist\xF3ricos y pensiones boutique"), " distribuidos en cada etapa."), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.hotelGrid
  }, [{
    name: "Hotel Alfonso IX",
    town: "Sarria",
    type: "Hotel ★★★",
    icon: "🏨"
  }, {
    name: "Pousada de Portomarín",
    town: "Portomarín",
    type: "Hotel boutique",
    icon: "🏛️"
  }, {
    name: "Casa Benilde",
    town: "Palas de Rei",
    type: "Casa rural",
    icon: "🏡"
  }, {
    name: "Pazo de Brandeso",
    town: "Arzúa",
    type: "Pazo histórico",
    icon: "🏰"
  }].map(h => /*#__PURE__*/React.createElement("div", {
    key: h.name,
    style: rtStyles.hotelCard
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.hotelImg
  }, /*#__PURE__*/React.createElement("span", {
    style: rtStyles.hotelIcon
  }, h.icon)), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.hotelBody
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.hotelTown
  }, h.town), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.hotelName
  }, h.name), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.hotelType
  }, h.type))))));
}

/* ===== Servicios ============================================== */
const INCLUDED = ["Alojamiento en Hoteles y Casas Rurales.", "Habitaciones con baño privado.", "Régimen alimenticio elegido.", "Transporte de equipaje entre etapas.", "Asistencia telefónica en ruta 24 horas.", "Aplicación móvil de navegación personalizada.", "Itinerario completo de la ruta.", "Vehículo de asistencia en caso de urgencia.", "Dossier Informativo del Camino.", "IVA."];
const OPTIONAL = ["Suplemento Habitación individual.", "Suplemento 5 picnics (bocadillo, bebida y postre).", "Noche extra en Santiago (desayuno incluido).", "Traslado Santiago (incluye aeropuerto) – Sarria.", "Seguro de asistencia en viaje.", "Seguro de cancelación."];
function PanelServices() {
  return /*#__PURE__*/React.createElement("div", {
    style: rtStyles.prose
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.kicker
  }, "QU\xC9 INCLUYE TU CAMINO"), /*#__PURE__*/React.createElement("h2", {
    style: rtStyles.h2
  }, "T\xFA caminas. Nosotros, lo dem\xE1s."), /*#__PURE__*/React.createElement("div", {
    style: rtStyles.svcCols
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.svcCol
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.svcHead
  }, /*#__PURE__*/React.createElement("span", {
    style: rtStyles.svcHeadIcon
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("h3", {
    style: rtStyles.svcHeadTitle
  }, "Servicios incluidos")), /*#__PURE__*/React.createElement("ul", {
    style: rtStyles.svcList
  }, INCLUDED.map(s => /*#__PURE__*/React.createElement("li", {
    key: s,
    style: rtStyles.svcLi
  }, /*#__PURE__*/React.createElement("span", {
    style: rtStyles.svcCheck
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...rtStyles.svcCol,
      background: "#FAFAF7"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.svcHead
  }, /*#__PURE__*/React.createElement("span", {
    style: rtStyles.svcHeadIcon
  }, "\uD83D\uDECF\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    style: rtStyles.svcHeadTitle
  }, "Servicios opcionales")), /*#__PURE__*/React.createElement("ul", {
    style: rtStyles.svcList
  }, OPTIONAL.map(s => /*#__PURE__*/React.createElement("li", {
    key: s,
    style: rtStyles.svcLi
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...rtStyles.svcCheck,
      background: "white",
      border: "1.5px solid #CFCFC6",
      color: "#76766D"
    }
  }, "+"), /*#__PURE__*/React.createElement("span", null, s)))))));
}

/* ===== FAQ tab ================================================ */
function PanelFAQ() {
  const qs = ["¿Tengo que reservar con mucha antelación?", "¿Qué pasa si me lesiono en mitad del Camino?", "¿Cómo funciona el transporte de equipaje?", "¿Puedo cambiar fechas una vez reservado?", "¿La Compostela está incluida?", "¿Hay opción de individual sin suplemento de pareja?"];
  return /*#__PURE__*/React.createElement("div", {
    style: rtStyles.prose
  }, /*#__PURE__*/React.createElement("div", {
    style: rtStyles.kicker
  }, "PREGUNTAS R\xC1PIDAS"), /*#__PURE__*/React.createElement("h2", {
    style: rtStyles.h2
  }, "Lo m\xE1s consultado."), /*#__PURE__*/React.createElement("p", {
    style: rtStyles.lead
  }, "Las respuestas completas las tienes en la secci\xF3n FAQ m\xE1s abajo, o preg\xFAntanos directamente al ", /*#__PURE__*/React.createElement("b", null, "+34 928 970 605"), "."), /*#__PURE__*/React.createElement("ul", {
    style: rtStyles.faqQuickList
  }, qs.map(q => /*#__PURE__*/React.createElement("li", {
    key: q,
    style: rtStyles.faqQuickItem
  }, /*#__PURE__*/React.createElement("span", {
    style: rtStyles.faqQuickQ
  }, "\u2753"), q))));
}

/* ===== Styles ================================================= */
const rtStyles = {
  tabBar: {
    display: "flex",
    gap: 4,
    padding: 4,
    background: "#F2F2EE",
    borderRadius: 14,
    marginTop: 56,
    marginBottom: 32,
    overflowX: "auto"
  },
  tabBtn: {
    flex: "1 1 auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 14px",
    background: "transparent",
    color: "#525249",
    border: "none",
    borderRadius: 10,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 120ms, color 120ms",
    whiteSpace: "nowrap"
  },
  tabBtnActive: {
    background: "#7AA606",
    color: "white",
    boxShadow: "0 4px 12px rgba(122,166,6,0.30)",
    fontWeight: 700
  },
  panel: {
    paddingTop: 8,
    minHeight: 400
  },
  prose: {
    display: "flex",
    flexDirection: "column",
    gap: 0
  },
  kicker: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#7AA606",
    marginBottom: 12
  },
  h2: {
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
    margin: "0 0 16px",
    color: "#1A1A1A",
    textWrap: "balance"
  },
  h3Sub: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.005em",
    margin: "28px 0 10px",
    color: "#4F6B0F"
  },
  lead: {
    fontSize: 17,
    lineHeight: 1.6,
    color: "#36362F",
    margin: "0 0 22px",
    textWrap: "pretty"
  },
  p: {
    fontSize: 15.5,
    lineHeight: 1.65,
    color: "#36362F",
    margin: "0 0 14px",
    textWrap: "pretty"
  },
  muted: {
    fontSize: 12,
    color: "#76766D",
    marginTop: 12
  },
  callout: {
    display: "flex",
    gap: 14,
    padding: "18px 20px",
    background: "#F4F8E6",
    border: "1px solid #CDE199",
    borderRadius: 12,
    color: "#1A1A1A",
    margin: "8px 0 20px"
  },
  calloutIcon: {
    fontSize: 22,
    lineHeight: 1,
    flexShrink: 0
  },
  /* Itinerary accordion */
  itineraryList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 4
  },
  itiRow: {
    background: "white",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
  },
  itiHead: {
    width: "100%",
    background: "#7AA606",
    color: "white",
    border: "none",
    padding: "16px 22px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    transition: "background 120ms"
  },
  itiIcon: {
    width: 24,
    height: 24,
    display: "grid",
    placeItems: "center",
    fontSize: 16,
    flexShrink: 0
  },
  itiTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.005em"
  },
  itiKm: {
    background: "rgba(255,255,255,0.20)",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.35)"
  },
  itiChev: {
    fontSize: 16,
    transition: "transform 220ms cubic-bezier(0.22,0.61,0.36,1)",
    flexShrink: 0
  },
  itiBody: {
    background: "white",
    padding: "18px 22px 22px",
    borderLeft: "3px solid #7AA606",
    borderRight: "1px solid #E5E5DF",
    borderBottom: "1px solid #E5E5DF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12
  },
  itiMeta: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#7AA606",
    marginBottom: 8
  },
  itiBlurb: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1A1A1A",
    lineHeight: 1.5,
    margin: "0 0 10px"
  },
  itiDetail: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#525249",
    margin: 0
  },
  /* Map */
  mapWrap: {
    position: "relative",
    aspectRatio: "2 / 1",
    borderRadius: 16,
    overflow: "hidden",
    isolation: "isolate",
    boxShadow: "0 12px 28px rgba(26,26,26,0.1)",
    marginTop: 16
  },
  mapBg: {
    position: "absolute",
    inset: 0,
    zIndex: -1,
    background: "radial-gradient(ellipse at top right, #4F6B0F 0%, #29371a 60%, #1A1A1A 100%)"
  },
  mapSvg: {
    width: "100%",
    height: "100%",
    display: "block"
  },
  mapLegend: {
    position: "absolute",
    bottom: 14,
    left: 14,
    color: "white",
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: 8
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999
  },
  /* Hotels */
  hotelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 12,
    marginTop: 20
  },
  hotelCard: {
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 12,
    overflow: "hidden"
  },
  hotelImg: {
    background: "linear-gradient(135deg, #B0CC66, #4F6B0F)",
    height: 80,
    display: "grid",
    placeItems: "center"
  },
  hotelIcon: {
    fontSize: 32,
    opacity: 0.85
  },
  hotelBody: {
    padding: "12px 14px"
  },
  hotelTown: {
    fontSize: 11,
    fontWeight: 700,
    color: "#7AA606",
    letterSpacing: "0.06em",
    textTransform: "uppercase"
  },
  hotelName: {
    fontSize: 14.5,
    fontWeight: 700,
    color: "#1A1A1A",
    marginTop: 2
  },
  hotelType: {
    fontSize: 12,
    color: "#76766D",
    marginTop: 2
  },
  /* Servicios two-col layout */
  svcCols: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 16
  },
  svcCol: {
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 14,
    padding: "22px 24px"
  },
  svcHead: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottom: "1px solid #F2F2EE"
  },
  svcHeadIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "#F4F8E6",
    color: "#4F6B0F",
    display: "grid",
    placeItems: "center",
    fontSize: 16
  },
  svcHeadTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: 0,
    color: "#4F6B0F",
    letterSpacing: "-0.01em"
  },
  svcList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  svcLi: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 14.5,
    lineHeight: 1.5,
    color: "#36362F"
  },
  svcCheck: {
    width: 22,
    height: 22,
    borderRadius: 999,
    background: "#7AA606",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
    marginTop: 1
  },
  /* FAQ tab */
  faqQuickList: {
    listStyle: "none",
    padding: 0,
    margin: "8px 0 0",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  faqQuickItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    color: "#1A1A1A"
  },
  faqQuickQ: {
    fontSize: 16
  }
};
window.RouteTabs = RouteTabs;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/RouteTabs.jsx", error: String((e && e.message) || e) }); }

// route-detail/SiteFooter.jsx
try { (() => {
/* global React */
/* ============================================================
   SiteFooter — matches the real santiagoways.es structure:
   brand col (logo + SÍGANOS social) · NUESTROS CAMINOS ·
   CAMINOS MÁS VENDIDOS · POLÍTICAS DE USO · Idioma
   Plus FORMAS DE PAGO badges and copyright strip.
   ============================================================ */
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: sfStyles.footer
  }, /*#__PURE__*/React.createElement("div", {
    style: sfStyles.top
  }, /*#__PURE__*/React.createElement("div", {
    style: sfStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: sfStyles.brandCol
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/logo-horizontal.jpg",
    alt: "Santiago Ways",
    style: sfStyles.logo
  }), /*#__PURE__*/React.createElement("div", {
    style: sfStyles.siganos
  }, "S\xCDGANOS"), /*#__PURE__*/React.createElement("div", {
    style: sfStyles.socials
  }, [{
    label: "Facebook",
    color: "#1877F2",
    initial: "f"
  }, {
    label: "X",
    color: "#000000",
    initial: "𝕏"
  }, {
    label: "LinkedIn",
    color: "#0A66C2",
    initial: "in"
  }, {
    label: "Instagram",
    color: "linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
    initial: "◎"
  }, {
    label: "YouTube",
    color: "#FF0000",
    initial: "▶"
  }, {
    label: "TikTok",
    color: "#000000",
    initial: "♪"
  }].map(s => /*#__PURE__*/React.createElement("a", {
    key: s.label,
    href: "#",
    "aria-label": s.label,
    style: {
      ...sfStyles.socialBtn,
      background: s.color
    }
  }, s.initial)))), /*#__PURE__*/React.createElement(FCol, {
    title: "NUESTROS CAMINOS",
    links: ["Camino Francés", "Camino Portugués", "Camino Portugués por la Costa", "Camino del Norte", "Camino de Finisterre", "Camino Inglés", "Camino Primitivo", "Camino de Santiago en Bicicleta"]
  }), /*#__PURE__*/React.createElement(FCol, {
    title: "CAMINOS M\xC1S VENDIDOS",
    links: ["Camino de Santiago desde Sarria", "Camino de Santiago desde St Jean", "Camino de Santiago desde Tui", "Camino de Santiago desde Baiona", "Camino de Santiago de Finisterre"]
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FCol, {
    title: "POL\xCDTICAS DE USO",
    links: ["Política de Reservas", "Política de Cancelación", "Política de Cookies", "Aviso Legal", "Transparencia", "Reclamaciones"]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...sfStyles.colTitle,
      marginTop: 28
    }
  }, "FORMAS DE PAGO"), /*#__PURE__*/React.createElement("div", {
    style: sfStyles.payments
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...sfStyles.payBadge,
      color: "#1A1F71"
    }
  }, "VISA"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...sfStyles.payBadge,
      color: "#EB001B"
    }
  }, "\u25CF \u25CF"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...sfStyles.payBadge,
      color: "#1A1A1A"
    }
  }, "\uD83C\uDF4E Pay"), /*#__PURE__*/React.createElement("span", {
    style: {
      ...sfStyles.payBadge,
      color: "#1A1A1A"
    }
  }, "G Pay"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: sfStyles.colTitle
  }, "IDIOMA"), /*#__PURE__*/React.createElement("div", {
    style: sfStyles.langSelect
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "\uD83C\uDDEA\uD83C\uDDF8"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, "Espa\xF1ol"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "#A8A89F"
    }
  }, "\u25BE")), /*#__PURE__*/React.createElement("a", {
    href: "#contacto",
    style: sfStyles.contactBtn
  }, "\uD83D\uDCDE +34 928 970 605")))), /*#__PURE__*/React.createElement("div", {
    style: sfStyles.bottom
  }, /*#__PURE__*/React.createElement("div", {
    style: sfStyles.bottomInner
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Santiago Ways. Todos los derechos reservados."), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC1A Buen Camino."))));
}
function FCol({
  title,
  links
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: sfStyles.colTitle
  }, title), /*#__PURE__*/React.createElement("ul", {
    style: sfStyles.linkList
  }, links.map(l => /*#__PURE__*/React.createElement("li", {
    key: l
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: sfStyles.link
  }, l)))));
}
const sfStyles = {
  footer: {
    background: "white",
    borderTop: "1px solid #E5E5DF"
  },
  top: {
    padding: "64px 0 48px"
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px",
    display: "grid",
    gridTemplateColumns: "1.05fr 1.2fr 1.2fr 1.2fr 0.95fr",
    gap: 36
  },
  brandCol: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  logo: {
    height: 34,
    width: "auto",
    marginBottom: 6
  },
  siganos: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#1A1A1A"
  },
  socials: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  socialBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    color: "white",
    display: "grid",
    placeItems: "center",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700
  },
  colTitle: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#1A1A1A",
    marginBottom: 14
  },
  linkList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  link: {
    color: "#525249",
    textDecoration: "none",
    fontSize: 13.5,
    lineHeight: 1.4
  },
  payments: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
  },
  payBadge: {
    background: "white",
    border: "1px solid #E5E5DF",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.04em"
  },
  langSelect: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #CFCFC6",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
    color: "#1A1A1A",
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 16
  },
  contactBtn: {
    display: "block",
    background: "#7AA606",
    color: "white",
    textDecoration: "none",
    padding: "12px 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 800,
    textAlign: "center"
  },
  bottom: {
    background: "#1A1A1A",
    color: "rgba(255,255,255,0.55)"
  },
  bottomInner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "20px 32px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    flexWrap: "wrap",
    gap: 8
  }
};
window.SiteFooter = SiteFooter;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// route-detail/SiteHeader.jsx
try { (() => {
/* global React */
/* ============================================================
   SiteHeader — matches the real santiagoways.es header:
   logo · RESERVAR · CAMINO DE SANTIAGO · CAMINO EN BICICLETA ·
   CONÓCENOS · phone button (+34 928 970 605)
   ============================================================ */
function SiteHeader() {
  const links = [{
    id: "reservar",
    label: "RESERVAR"
  }, {
    id: "camino",
    label: "CAMINO DE SANTIAGO",
    caret: true
  }, {
    id: "bici",
    label: "CAMINO EN BICICLETA"
  }, {
    id: "about",
    label: "CONÓCENOS"
  }];
  return /*#__PURE__*/React.createElement("header", {
    style: shStyles.bar
  }, /*#__PURE__*/React.createElement("div", {
    style: shStyles.inner
  }, /*#__PURE__*/React.createElement("a", {
    href: "/",
    style: shStyles.brand
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/logo-horizontal.jpg",
    alt: "Santiago Ways",
    style: shStyles.logo
  })), /*#__PURE__*/React.createElement("nav", {
    style: shStyles.nav
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.id,
    href: `#${l.id}`,
    style: shStyles.link
  }, l.label, l.caret && /*#__PURE__*/React.createElement("span", {
    style: shStyles.caret
  }, "\u25BE")))), /*#__PURE__*/React.createElement("a", {
    href: "tel:+34928970605",
    style: shStyles.phone
  }, /*#__PURE__*/React.createElement("span", {
    style: shStyles.phoneIcon
  }, "\uD83D\uDCDE"), "+34 928 970 605")));
}
const shStyles = {
  bar: {
    background: "white",
    borderBottom: "1px solid #F2F2EE",
    position: "sticky",
    top: 0,
    zIndex: 50
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    height: 76,
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    gap: 32
  },
  brand: {
    display: "flex",
    alignItems: "center"
  },
  logo: {
    height: 38,
    width: "auto"
  },
  nav: {
    display: "flex",
    gap: 28,
    marginLeft: 24,
    flex: 1
  },
  link: {
    color: "#36362F",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    transition: "color 120ms"
  },
  caret: {
    fontSize: 9,
    marginLeft: 2,
    color: "#7AA606"
  },
  phone: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "white",
    border: "1.5px solid #7AA606",
    color: "#4F6B0F",
    padding: "10px 18px",
    borderRadius: 999,
    fontSize: 13.5,
    fontWeight: 800,
    textDecoration: "none",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    flexShrink: 0
  },
  phoneIcon: {
    fontSize: 14
  }
};
window.SiteHeader = SiteHeader;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/SiteHeader.jsx", error: String((e && e.message) || e) }); }

// route-detail/StatsBar.jsx
try { (() => {
/* global React */
/* ============================================================
   StatsBar — the white floating "stats" card that sits between
   hero and content, mirroring the real Santiago Ways layout.
   ============================================================ */
function StatsBar() {
  const stats = [{
    icon: "📍",
    value: "111 Km",
    label: "Distancia"
  }, {
    icon: "⏱️",
    value: "7 días / 6 noches",
    label: "Duración"
  }, {
    icon: "🍽️",
    value: "Desayuno y cena o solo desayuno",
    label: "Comidas"
  }, {
    icon: "🏨",
    value: "Hoteles y Casas Rurales",
    label: "Alojamiento"
  }, {
    icon: "€",
    value: "desde 589€ por persona",
    label: "Precios"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: sbStyles.section
  }, /*#__PURE__*/React.createElement("div", {
    style: sbStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: sbStyles.card
  }, stats.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: s.label
  }, /*#__PURE__*/React.createElement("div", {
    style: sbStyles.item
  }, /*#__PURE__*/React.createElement("div", {
    style: sbStyles.icon
  }, s.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: sbStyles.value
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: sbStyles.label
  }, s.label))), i < stats.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: sbStyles.sep
  })))), /*#__PURE__*/React.createElement("div", {
    style: sbStyles.licencia
  }, "Gracias a nuestra ", /*#__PURE__*/React.createElement("b", null, "Licencia Oficial"), " como Agencia de Viajes Mayorista ", /*#__PURE__*/React.createElement("b", null, "trabajamos sin intermediarios"), ".")));
}
const sbStyles = {
  section: {
    background: "white",
    position: "relative",
    zIndex: 2,
    paddingTop: 32
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px"
  },
  card: {
    background: "white",
    borderRadius: 18,
    boxShadow: "0 18px 40px rgba(26,26,26,0.10), 0 4px 12px rgba(26,26,26,0.06)",
    border: "1px solid #F2F2EE",
    padding: "22px 28px",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flex: "1 1 0",
    minWidth: 160
  },
  icon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 12,
    background: "#F4F8E6",
    color: "#4F6B0F",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    fontWeight: 700
  },
  value: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1A1A1A",
    lineHeight: 1.25
  },
  label: {
    fontSize: 12,
    color: "#76766D",
    marginTop: 2
  },
  sep: {
    width: 1,
    height: 36,
    background: "#E5E5DF",
    flexShrink: 0
  },
  licencia: {
    textAlign: "center",
    fontSize: 13,
    color: "#525249",
    padding: "20px 16px 0"
  }
};
window.StatsBar = StatsBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "route-detail/StatsBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Footer.jsx
try { (() => {
/* global React */
/* ============================================================
   Footer — verde oscuro, links agrupados, copyright + legal.
   ============================================================ */
function SWFooter() {
  const cols = [{
    title: "Rutas",
    links: ["Camino Portugués", "Camino Francés", "Camino del Norte", "Camino Primitivo", "Vía de la Plata", "Camino Inglés"]
  }, {
    title: "Servicios",
    links: ["Transporte de equipaje", "Hoteles seleccionados", "Asistencia 24h", "App con mapas offline", "Coche de emergencia", "Itinerarios a medida"]
  }, {
    title: "Recursos",
    links: ["Blog del Camino", "Guía: qué llevar", "Etapas y dificultad", "Compostela y credencial", "Preguntas frecuentes"]
  }, {
    title: "Empresa",
    links: ["Sobre nosotros", "Trabaja con nosotros", "Prensa", "Contacto", "Aviso legal", "Política de privacidad"]
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: swFooterStyles.footer
  }, /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.top
  }, /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.brandCol
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-white.png",
    alt: "Santiago Ways",
    style: swFooterStyles.logo
  }), /*#__PURE__*/React.createElement("p", {
    style: swFooterStyles.tagline
  }, "La empresa l\xEDder en viajes 100% organizados al Camino de Santiago."), /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.contact
  }, /*#__PURE__*/React.createElement("div", null, "\uD83D\uDCDE ", /*#__PURE__*/React.createElement("b", null, "900 000 000"), " \xB7 L-V 9-20h"), /*#__PURE__*/React.createElement("div", null, "\u2709\uFE0F hola@santiagoways.com"), /*#__PURE__*/React.createElement("div", null, "\uD83D\uDCCD Galicia, Espa\xF1a")), /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.social
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: swFooterStyles.socialBtn
  }, "IG"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: swFooterStyles.socialBtn
  }, "TT"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: swFooterStyles.socialBtn
  }, "YT"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: swFooterStyles.socialBtn
  }, "FB"))), /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.linkCols
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.title
  }, /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.colTitle
  }, c.title), /*#__PURE__*/React.createElement("ul", {
    style: swFooterStyles.linkList
  }, c.links.map(l => /*#__PURE__*/React.createElement("li", {
    key: l
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: swFooterStyles.link
  }, l)))))))), /*#__PURE__*/React.createElement("div", {
    style: swFooterStyles.bottom
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Santiago Ways. Todos los derechos reservados."), /*#__PURE__*/React.createElement("span", null, "\uD83D\uDC1A Buen Camino."))));
}
const swFooterStyles = {
  footer: {
    background: "#184834",
    color: "rgba(255,255,255,0.88)",
    padding: "72px 0 32px"
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px"
  },
  top: {
    display: "grid",
    gridTemplateColumns: "1.1fr 2.6fr",
    gap: 56,
    marginBottom: 48
  },
  brandCol: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  logo: {
    height: 40,
    width: "auto",
    filter: "brightness(0) invert(1)"
  },
  tagline: {
    fontSize: 14,
    lineHeight: 1.55,
    color: "rgba(255,255,255,0.7)",
    margin: 0,
    maxWidth: 320
  },
  contact: {
    fontSize: 13,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.78)"
  },
  social: {
    display: "flex",
    gap: 8,
    marginTop: 8
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    display: "grid",
    placeItems: "center",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: "0.04em"
  },
  linkCols: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 24
  },
  colTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#94B833",
    marginBottom: 14
  },
  linkList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 9
  },
  link: {
    color: "rgba(255,255,255,0.78)",
    textDecoration: "none",
    fontSize: 13.5
  },
  bottom: {
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: 24,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)"
  }
};
window.SWFooter = SWFooter;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Header.jsx
try { (() => {
/* global React */
const {
  useState
} = React;

/* ============================================================
   Header — top nav for santiagoways.com
   Logo izquierda, links centro-derecha, CTA verde.
   ============================================================ */
function SWHeader({
  activeTab = "rutas"
}) {
  const links = [{
    id: "rutas",
    label: "Rutas"
  }, {
    id: "incluido",
    label: "Qué incluye"
  }, {
    id: "blog",
    label: "Blog"
  }, {
    id: "app",
    label: "App"
  }, {
    id: "contacto",
    label: "Contacto"
  }];
  return /*#__PURE__*/React.createElement("header", {
    style: swHeaderStyles.bar
  }, /*#__PURE__*/React.createElement("div", {
    style: swHeaderStyles.inner
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: swHeaderStyles.brand
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal.jpg",
    alt: "Santiago Ways",
    style: swHeaderStyles.logo
  })), /*#__PURE__*/React.createElement("nav", {
    style: swHeaderStyles.nav
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.id,
    href: `#${l.id}`,
    style: {
      ...swHeaderStyles.link,
      ...(activeTab === l.id ? swHeaderStyles.linkActive : {})
    }
  }, l.label))), /*#__PURE__*/React.createElement("div", {
    style: swHeaderStyles.actions
  }, /*#__PURE__*/React.createElement("a", {
    href: "tel:+34900000000",
    style: swHeaderStyles.phone
  }, /*#__PURE__*/React.createElement("span", {
    style: swHeaderStyles.phoneDot
  }), "900 000 000"), /*#__PURE__*/React.createElement("button", {
    style: swHeaderStyles.cta
  }, "Pide tu presupuesto"))));
}
const swHeaderStyles = {
  bar: {
    background: "white",
    borderBottom: "1px solid #E6E2D6",
    position: "sticky",
    top: 0,
    zIndex: 50
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    height: 72,
    padding: "0 32px",
    display: "flex",
    alignItems: "center",
    gap: 32
  },
  brand: {
    display: "flex",
    alignItems: "center"
  },
  logo: {
    height: 36,
    width: "auto"
  },
  nav: {
    display: "flex",
    gap: 28,
    marginLeft: 24
  },
  link: {
    color: "#184834",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    padding: "8px 0",
    borderBottom: "2px solid transparent"
  },
  linkActive: {
    color: "#668814",
    fontWeight: 700,
    borderBottomColor: "#7AA606"
  },
  actions: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 16
  },
  phone: {
    fontSize: 13,
    fontWeight: 600,
    color: "#184834",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8
  },
  phoneDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#7AA606"
  },
  cta: {
    background: "#7AA606",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
    fontFamily: "inherit"
  }
};
window.SWHeader = SWHeader;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Hero.jsx
try { (() => {
/* global React */
/* ============================================================
   Hero — landing hero con headline grande, brushstroke verde
   sobre fotografía simulada (gradiente cálido), CTA primario.
   ============================================================ */
function SWHero({
  onStart
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: swHeroStyles.section
  }, /*#__PURE__*/React.createElement("div", {
    style: swHeroStyles.bg
  }), /*#__PURE__*/React.createElement("div", {
    style: swHeroStyles.overlay
  }), /*#__PURE__*/React.createElement("div", {
    style: swHeroStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: swHeroStyles.kicker
  }, "VIAJES ORGANIZADOS \xB7 CAMINO DE SANTIAGO"), /*#__PURE__*/React.createElement("h1", {
    style: swHeroStyles.h1
  }, "Haz el Camino.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: swHeroStyles.brushWrap
  }, /*#__PURE__*/React.createElement("span", {
    style: swHeroStyles.brush,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    style: swHeroStyles.brushText
  }, "Sin la mochila."))), /*#__PURE__*/React.createElement("p", {
    style: swHeroStyles.lead
  }, "Reservamos tu hotel con ba\xF1o privado, transportamos tu equipaje y te cubrimos 24h. T\xFA solo caminas."), /*#__PURE__*/React.createElement("div", {
    style: swHeroStyles.actions
  }, /*#__PURE__*/React.createElement("button", {
    style: swHeroStyles.primaryBtn,
    onClick: onStart
  }, "Pide tu presupuesto"), /*#__PURE__*/React.createElement("a", {
    href: "#rutas",
    style: swHeroStyles.ghostBtn
  }, "Ver las 5 rutas \u2192")), /*#__PURE__*/React.createElement("div", {
    style: swHeroStyles.proof
  }, /*#__PURE__*/React.createElement("div", {
    style: swHeroStyles.stars
  }, "\u2605\u2605\u2605\u2605\u2605"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "4,9/5"), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.78
    }
  }, "\xB7 +12.000 peregrinos guiados")))));
}
const swHeroStyles = {
  section: {
    position: "relative",
    minHeight: 560,
    color: "white",
    overflow: "hidden",
    isolation: "isolate"
  },
  bg: {
    position: "absolute",
    inset: 0,
    zIndex: -2,
    background: "linear-gradient(135deg, #d3b176 0%, #8b6a35 45%, #4a3a1a 100%)"
  },
  overlay: {
    position: "absolute",
    inset: 0,
    zIndex: -1,
    background: "linear-gradient(180deg, rgba(26,26,26,0.15) 0%, rgba(26,26,26,0.55) 100%)"
  },
  inner: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "120px 32px 96px"
  },
  kicker: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "white",
    opacity: 0.88,
    marginBottom: 24
  },
  h1: {
    fontSize: 80,
    fontWeight: 900,
    lineHeight: 0.97,
    letterSpacing: "-0.02em",
    margin: 0,
    marginBottom: 24,
    textWrap: "balance",
    color: "white"
  },
  brushWrap: {
    display: "inline-block",
    position: "relative"
  },
  brush: {
    position: "absolute",
    left: "-10px",
    right: "-10px",
    top: "12%",
    bottom: "12%",
    background: "#B0F808",
    transform: "rotate(-1.2deg)",
    borderRadius: 6,
    boxShadow: "0 0 0 4px #B0F808",
    clipPath: "polygon(0% 12%, 3% 0%, 97% 5%, 100% 18%, 99% 88%, 96% 100%, 4% 95%, 0% 86%)",
    zIndex: -1
  },
  brushText: {
    position: "relative",
    zIndex: 1,
    color: "#184834"
  },
  lead: {
    fontSize: 20,
    lineHeight: 1.55,
    maxWidth: 540,
    color: "white",
    opacity: 0.93,
    margin: "0 0 36px"
  },
  actions: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 40
  },
  primaryBtn: {
    background: "#7AA606",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "16px 26px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 12px 24px rgba(24, 72, 52, 0.35)"
  },
  ghostBtn: {
    color: "white",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 600,
    padding: "16px 8px"
  },
  proof: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 14
  },
  stars: {
    color: "#F4C530",
    letterSpacing: 2,
    fontSize: 16
  }
};
window.SWHero = SWHero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/IncludesSection.jsx
try { (() => {
/* global React */
/* ============================================================
   IncludesSection — verde sólido, lista de servicios premium.
   El alma comercial de la marca.
   ============================================================ */
function SWIncludes() {
  const items = [{
    icon: "🏨",
    title: "Hotel con baño privado",
    body: "Habitaciones individuales o dobles en hoteles seleccionados. Nada de albergues compartidos."
  }, {
    icon: "🎒",
    title: "Equipaje transportado",
    body: "Tu maleta espera en la siguiente etapa antes de que llegues. Tú solo llevas lo del día."
  }, {
    icon: "📞",
    title: "Asistencia 24h",
    body: "Teléfono propio en español, atendido por personas. Cualquier emergencia, te resolvemos."
  }, {
    icon: "🚐",
    title: "Coche de emergencia",
    body: "¿Cansancio, ampolla seria, mal tiempo? Te recogemos y te llevamos al alojamiento."
  }, {
    icon: "📱",
    title: "App con mapas offline",
    body: "Navegación GPS sin conexión, etapas precargadas, puntos de interés en ruta."
  }, {
    icon: "🗺️",
    title: "Itinerario a medida",
    body: "Tú nos cuentas días y ritmo. Nosotros encajamos paradas y kilómetros."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: swIncludesStyles.section,
    id: "incluido"
  }, /*#__PURE__*/React.createElement("div", {
    style: swIncludesStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: swIncludesStyles.head
  }, /*#__PURE__*/React.createElement("div", {
    style: swIncludesStyles.kicker
  }, "QU\xC9 INCLUYE"), /*#__PURE__*/React.createElement("h2", {
    style: swIncludesStyles.h2
  }, "T\xFA caminas.", /*#__PURE__*/React.createElement("br", null), "Nosotros, lo dem\xE1s.")), /*#__PURE__*/React.createElement("div", {
    style: swIncludesStyles.grid
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: swIncludesStyles.item
  }, /*#__PURE__*/React.createElement("div", {
    style: swIncludesStyles.icon
  }, it.icon), /*#__PURE__*/React.createElement("div", {
    style: swIncludesStyles.title
  }, it.title), /*#__PURE__*/React.createElement("div", {
    style: swIncludesStyles.body
  }, it.body))))));
}
const swIncludesStyles = {
  section: {
    background: "#7AA606",
    color: "white",
    padding: "96px 0"
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px"
  },
  head: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    maxWidth: 720,
    marginBottom: 56
  },
  kicker: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.85)"
  },
  h2: {
    fontSize: 56,
    fontWeight: 900,
    letterSpacing: "-0.02em",
    lineHeight: 0.98,
    margin: 0,
    textTransform: "uppercase",
    color: "white",
    textWrap: "balance"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 28
  },
  item: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: "26px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  icon: {
    fontSize: 28,
    lineHeight: 1,
    marginBottom: 4
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "-0.005em"
  },
  body: {
    fontSize: 14,
    lineHeight: 1.55,
    color: "rgba(255,255,255,0.85)"
  }
};
window.SWIncludes = SWIncludes;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/IncludesSection.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/RouteGrid.jsx
try { (() => {
/* global React */
const {
  useState: useStateRoutes
} = React;

/* ============================================================
   RouteGrid — listado de las 5 rutas con cards.
   ============================================================ */
const ROUTES = [{
  id: "portugues",
  name: "Camino Portugués",
  sub: "desde Tui",
  km: 120,
  days: "6-7 días",
  badge: "Más vendida",
  badgeKind: "solid",
  rating: 4.9,
  price: 845,
  gradient: "linear-gradient(135deg, #94B833, #38500B)",
  blurb: "La que más crece. Paisaje, historia y trato cercano."
}, {
  id: "frances",
  name: "Camino Francés",
  sub: "desde Sarria",
  km: 115,
  days: "5-6 días",
  badge: "Top",
  badgeKind: "punch",
  rating: 4.8,
  price: 795,
  gradient: "linear-gradient(135deg, #d3b176, #6b5530)",
  blurb: "La más popular. Más peregrinos, más comunidad."
}, {
  id: "norte",
  name: "Camino del Norte",
  sub: "costa cantábrica",
  km: 200,
  days: "10 días",
  badge: "Espectacular",
  badgeKind: "wash",
  rating: 4.9,
  price: 1390,
  gradient: "linear-gradient(135deg, #6FA8B8, #2B4F60)",
  blurb: "Acantilados, arena y mar. Exigente pero mágica."
}, {
  id: "primitivo",
  name: "Camino Primitivo",
  sub: "montaña asturiana",
  km: 313,
  days: "13 días",
  badge: "Solo valientes",
  badgeKind: "dark",
  rating: 4.7,
  price: 1690,
  gradient: "linear-gradient(135deg, #8a7e6c, #2f2a23)",
  blurb: "La más antigua. Subidas, niebla y soledad."
}, {
  id: "plata",
  name: "Vía de la Plata",
  sub: "desde Sevilla",
  km: 1000,
  days: "40+ días",
  badge: "Para avanzados",
  badgeKind: "outline",
  rating: 4.8,
  price: 4990,
  gradient: "linear-gradient(135deg, #e7c178, #8c5a1f)",
  blurb: "1.000 km en solitario. Para perfiles avanzados."
}, {
  id: "ingles",
  name: "Camino Inglés",
  sub: "desde Ferrol",
  km: 119,
  days: "5-6 días",
  badge: "Tranquilo",
  badgeKind: "wash",
  rating: 4.7,
  price: 815,
  gradient: "linear-gradient(135deg, #B7C896, #4f6b3f)",
  blurb: "Corto, poco transitado, perfecto para empezar."
}];
const badgePalette = {
  solid: {
    bg: "#7AA606",
    color: "white"
  },
  dark: {
    bg: "#184834",
    color: "white"
  },
  punch: {
    bg: "#B0F808",
    color: "#184834"
  },
  amber: {
    bg: "#F4C530",
    color: "#184834"
  },
  wash: {
    bg: "rgba(255,255,255,0.9)",
    color: "#4F6B0F"
  },
  outline: {
    bg: "rgba(255,255,255,0.9)",
    color: "#184834",
    border: "1px solid #184834"
  }
};
function SWRouteCard({
  route,
  onSelect
}) {
  const [hover, setHover] = useStateRoutes(false);
  const pal = badgePalette[route.badgeKind];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...swRouteStyles.card,
      boxShadow: hover ? swRouteStyles.cardHoverShadow : swRouteStyles.cardShadow,
      transform: hover ? "translateY(-2px)" : "translateY(0)"
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: () => onSelect && onSelect(route)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...swRouteStyles.img,
      backgroundImage: route.gradient
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...swRouteStyles.badge,
      background: pal.bg,
      color: pal.color,
      border: pal.border || "none"
    }
  }, route.badge), /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.imgGradient
  }), /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.kmTag
  }, route.km, " km")), /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.body
  }, /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.eyebrow
  }, route.sub), /*#__PURE__*/React.createElement("h3", {
    style: swRouteStyles.title
  }, route.name), /*#__PURE__*/React.createElement("p", {
    style: swRouteStyles.blurb
  }, route.blurb), /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.meta
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC5 ", route.days), /*#__PURE__*/React.createElement("span", null, "\u2605 ", route.rating)), /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.priceRow
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: swRouteStyles.priceFrom
  }, "desde"), /*#__PURE__*/React.createElement("span", {
    style: swRouteStyles.price
  }, route.price, "\u20AC"), /*#__PURE__*/React.createElement("span", {
    style: swRouteStyles.perPerson
  }, "/persona")), /*#__PURE__*/React.createElement("span", {
    style: swRouteStyles.cta
  }, "Ver itinerario \u2192"))));
}
function SWRouteGrid({
  onSelect
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: swRouteStyles.section,
    id: "rutas"
  }, /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.head
  }, /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.kicker
  }, "NUESTRAS RUTAS"), /*#__PURE__*/React.createElement("h2", {
    style: swRouteStyles.h2
  }, "\xBFCu\xE1l es tu Camino?"), /*#__PURE__*/React.createElement("p", {
    style: swRouteStyles.lead
  }, "Seis rutas, un mismo servicio. Hotel privado, equipaje transportado, asistencia 24h. T\xFA eliges hasta d\xF3nde.")), /*#__PURE__*/React.createElement("div", {
    style: swRouteStyles.grid
  }, ROUTES.map(r => /*#__PURE__*/React.createElement(SWRouteCard, {
    key: r.id,
    route: r,
    onSelect: onSelect
  })))));
}
const swRouteStyles = {
  section: {
    background: "#FAF8F2",
    padding: "96px 0"
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px"
  },
  head: {
    textAlign: "center",
    marginBottom: 48
  },
  kicker: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7AA606",
    marginBottom: 14
  },
  h2: {
    fontSize: 52,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: "0 0 16px",
    color: "#184834",
    textWrap: "balance"
  },
  lead: {
    fontSize: 18,
    lineHeight: 1.5,
    maxWidth: 580,
    margin: "0 auto",
    color: "#525249"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 24
  },
  card: {
    background: "white",
    borderRadius: 14,
    overflow: "hidden",
    cursor: "pointer",
    transition: "transform 220ms cubic-bezier(0.22,0.61,0.36,1), box-shadow 220ms",
    display: "flex",
    flexDirection: "column"
  },
  cardShadow: "0 4px 12px rgba(26,26,26,.08), 0 1px 2px rgba(26,26,26,.04)",
  cardHoverShadow: "0 18px 36px rgba(26,26,26,.14), 0 2px 6px rgba(26,26,26,.06)",
  img: {
    height: 220,
    position: "relative",
    overflow: "hidden",
    backgroundSize: "cover",
    backgroundPosition: "center"
  },
  imgGradient: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 100%)"
  },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    padding: "5px 11px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    zIndex: 2
  },
  kmTag: {
    position: "absolute",
    bottom: 14,
    left: 14,
    color: "white",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    zIndex: 2
  },
  body: {
    padding: "20px 22px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7AA606"
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    margin: 0,
    color: "#184834"
  },
  blurb: {
    fontSize: 14,
    lineHeight: 1.5,
    color: "#525249",
    margin: 0
  },
  meta: {
    display: "flex",
    gap: 16,
    fontSize: 12,
    color: "#76766D",
    marginTop: 4
  },
  priceRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 14,
    borderTop: "1px solid #E6E2D6"
  },
  priceFrom: {
    fontSize: 11,
    color: "#76766D",
    marginRight: 4
  },
  price: {
    fontSize: 22,
    fontWeight: 800,
    color: "#184834"
  },
  perPerson: {
    fontSize: 11,
    color: "#76766D",
    marginLeft: 2
  },
  cta: {
    fontSize: 13,
    fontWeight: 700,
    color: "#7AA606"
  }
};
window.SWRouteGrid = SWRouteGrid;
window.SWRouteCard = SWRouteCard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/RouteGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Tarificador.jsx
try { (() => {
/* global React */
/* ============================================================
   Tarificador — formulario paso-a-paso (3 pasos) para pedir presupuesto.
   Demuestra inputs, selects, progress, CTA, success state.
   ============================================================ */
const {
  useState: useTarState
} = React;
function SWTarificador() {
  const [step, setStep] = useTarState(1);
  const [data, setData] = useTarState({
    route: "portugues",
    days: "7",
    travellers: 2,
    when: "",
    name: "",
    email: "",
    phone: ""
  });
  const update = (k, v) => setData({
    ...data,
    [k]: v
  });
  const routes = [{
    id: "portugues",
    label: "Portugués · Tui",
    km: "120 km"
  }, {
    id: "frances",
    label: "Francés · Sarria",
    km: "115 km"
  }, {
    id: "norte",
    label: "Norte · Cantábrico",
    km: "200 km"
  }, {
    id: "ingles",
    label: "Inglés · Ferrol",
    km: "119 km"
  }, {
    id: "primitivo",
    label: "Primitivo",
    km: "313 km"
  }, {
    id: "plata",
    label: "Vía de la Plata",
    km: "1.000 km"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: swTarStyles.section,
    id: "tarificador"
  }, /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.intro
  }, /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.kicker
  }, "PRESUPUESTO GRATUITO"), /*#__PURE__*/React.createElement("h2", {
    style: swTarStyles.h2
  }, "Cu\xE9ntanos tu Camino."), /*#__PURE__*/React.createElement("p", {
    style: swTarStyles.lead
  }, "En menos de 60 segundos te preparamos un presupuesto a medida. Sin compromiso, sin letra peque\xF1a, sin spam."), /*#__PURE__*/React.createElement("ul", {
    style: swTarStyles.bullets
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    style: swTarStyles.check
  }, "\u2713"), " Itinerario personalizado"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    style: swTarStyles.check
  }, "\u2713"), " Hoteles con ba\xF1o privado"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    style: swTarStyles.check
  }, "\u2713"), " Transporte de equipaje incluido"), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    style: swTarStyles.check
  }, "\u2713"), " Asistencia 24h en espa\xF1ol"))), /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.progress
  }, [1, 2, 3].map(n => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...swTarStyles.stepDot,
      background: n <= step ? "#7AA606" : "#E6E2D6",
      color: n <= step ? "white" : "#76766D"
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      ...swTarStyles.stepLabel,
      color: n === step ? "#184834" : "#76766D",
      fontWeight: n === step ? 700 : 500
    }
  }, n === 1 ? "Tu ruta" : n === 2 ? "Fechas" : "Contacto")))), step === 1 && /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.body
  }, /*#__PURE__*/React.createElement("label", {
    style: swTarStyles.label
  }, "\xBFQu\xE9 ruta te interesa?"), /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.routeGrid
  }, routes.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    onClick: () => update("route", r.id),
    style: {
      ...swTarStyles.routeBtn,
      ...(data.route === r.id ? swTarStyles.routeBtnActive : {})
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13.5
    }
  }, r.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: 0.75,
      marginTop: 2
    }
  }, r.km)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: swTarStyles.label
  }, "\xBFCu\xE1ntos d\xEDas tienes?"), /*#__PURE__*/React.createElement("select", {
    style: swTarStyles.input,
    value: data.days,
    onChange: e => update("days", e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "5"
  }, "5 d\xEDas"), /*#__PURE__*/React.createElement("option", {
    value: "7"
  }, "7 d\xEDas"), /*#__PURE__*/React.createElement("option", {
    value: "10"
  }, "10 d\xEDas"), /*#__PURE__*/React.createElement("option", {
    value: "15"
  }, "15+ d\xEDas"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: swTarStyles.label
  }, "\xBFCu\xE1ntos sois?"), /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.stepper
  }, /*#__PURE__*/React.createElement("button", {
    style: swTarStyles.stepperBtn,
    onClick: () => update("travellers", Math.max(1, data.travellers - 1))
  }, "\u2212"), /*#__PURE__*/React.createElement("span", null, data.travellers, " ", data.travellers === 1 ? "persona" : "personas"), /*#__PURE__*/React.createElement("button", {
    style: swTarStyles.stepperBtn,
    onClick: () => update("travellers", Math.min(20, data.travellers + 1))
  }, "+"))))), step === 2 && /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.body
  }, /*#__PURE__*/React.createElement("label", {
    style: swTarStyles.label
  }, "\xBFCu\xE1ndo te gustar\xEDa salir?"), /*#__PURE__*/React.createElement("input", {
    style: swTarStyles.input,
    placeholder: "Mayo 2026, o fecha exacta",
    value: data.when,
    onChange: e => update("when", e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.help
  }, "Si a\xFAn no lo sabes, escribe el mes aproximado. Ajustamos contigo."), /*#__PURE__*/React.createElement("label", {
    style: {
      ...swTarStyles.label,
      marginTop: 18
    }
  }, "Tipo de habitaci\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.routeGrid
  }, ["Individual", "Doble", "Triple"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    style: {
      ...swTarStyles.routeBtn,
      ...(t === "Doble" ? swTarStyles.routeBtnActive : {})
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 13.5
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: 0.75
    }
  }, "ba\xF1o privado"))))), step === 3 && /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.body
  }, /*#__PURE__*/React.createElement("label", {
    style: swTarStyles.label
  }, "Nombre"), /*#__PURE__*/React.createElement("input", {
    style: swTarStyles.input,
    placeholder: "Laura",
    value: data.name,
    onChange: e => update("name", e.target.value)
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      ...swTarStyles.label,
      marginTop: 14
    }
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    style: swTarStyles.input,
    type: "email",
    placeholder: "laura@email.com",
    value: data.email,
    onChange: e => update("email", e.target.value)
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      ...swTarStyles.label,
      marginTop: 14
    }
  }, "Tel\xE9fono"), /*#__PURE__*/React.createElement("input", {
    style: swTarStyles.input,
    type: "tel",
    placeholder: "+34 ...",
    value: data.phone,
    onChange: e => update("phone", e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.helpSmall
  }, "Te llamamos solo si lo necesitamos para ajustar el presupuesto. Sin spam.")), /*#__PURE__*/React.createElement("div", {
    style: swTarStyles.actions
  }, step > 1 && /*#__PURE__*/React.createElement("button", {
    style: swTarStyles.ghost,
    onClick: () => setStep(step - 1)
  }, "\u2190 Atr\xE1s"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), step < 3 ? /*#__PURE__*/React.createElement("button", {
    style: swTarStyles.primary,
    onClick: () => setStep(step + 1)
  }, "Siguiente \u2192") : /*#__PURE__*/React.createElement("button", {
    style: swTarStyles.primary,
    onClick: () => alert("¡Gracias! Te escribimos en breve 🐚")
  }, "Pedir mi presupuesto")))));
}
const swTarStyles = {
  section: {
    background: "white",
    padding: "96px 0",
    borderTop: "1px solid #E6E2D6"
  },
  inner: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "0 32px",
    display: "grid",
    gridTemplateColumns: "1fr 1.15fr",
    gap: 56,
    alignItems: "start"
  },
  intro: {
    paddingTop: 24
  },
  kicker: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7AA606",
    marginBottom: 14
  },
  h2: {
    fontSize: 48,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: "0 0 16px",
    color: "#184834"
  },
  lead: {
    fontSize: 17,
    lineHeight: 1.55,
    color: "#525249",
    margin: "0 0 28px"
  },
  bullets: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  check: {
    display: "inline-grid",
    placeItems: "center",
    width: 22,
    height: 22,
    marginRight: 12,
    borderRadius: 999,
    background: "#F4F8E6",
    color: "#4F6B0F",
    fontWeight: 700,
    fontSize: 12
  },
  card: {
    background: "white",
    borderRadius: 16,
    border: "1px solid #E6E2D6",
    boxShadow: "0 12px 28px rgba(26,26,26,.08), 0 2px 6px rgba(26,26,26,.04)",
    overflow: "hidden"
  },
  progress: {
    display: "flex",
    padding: "20px 24px",
    background: "#FAF8F2",
    borderBottom: "1px solid #E6E2D6",
    gap: 8
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 700,
    transition: "background 220ms"
  },
  stepLabel: {
    fontSize: 13
  },
  body: {
    padding: "26px 28px"
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#36362F",
    marginBottom: 8,
    letterSpacing: "0.01em"
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    fontSize: 14,
    fontFamily: "inherit",
    borderRadius: 8,
    border: "1px solid #CFCFC6",
    background: "white",
    outline: "none"
  },
  routeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8
  },
  routeBtn: {
    background: "white",
    border: "1px solid #CFCFC6",
    borderRadius: 10,
    padding: "10px 12px",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#184834",
    transition: "all 120ms"
  },
  routeBtnActive: {
    borderColor: "#7AA606",
    background: "#F4F8E6",
    boxShadow: "inset 0 0 0 1px #7AA606"
  },
  stepper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "1px solid #CFCFC6",
    borderRadius: 8,
    padding: "6px 12px",
    fontWeight: 600,
    fontSize: 14
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#F3F0E7",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "inherit",
    color: "#184834"
  },
  help: {
    fontSize: 11,
    color: "#76766D",
    marginTop: 6
  },
  helpSmall: {
    fontSize: 11,
    color: "#76766D",
    marginTop: 16
  },
  actions: {
    display: "flex",
    padding: "16px 28px 24px",
    gap: 10,
    alignItems: "center"
  },
  ghost: {
    background: "transparent",
    border: "none",
    color: "#7AA606",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    padding: "10px 4px",
    fontFamily: "inherit"
  },
  primary: {
    background: "#7AA606",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "12px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 8px 18px rgba(122,166,6,0.30)"
  }
};
window.SWTarificador = SWTarificador;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Tarificador.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Testimonials.jsx
try { (() => {
/* global React */
/* ============================================================
   Testimonials — reseñas de peregrinos reales.
   ============================================================ */
function SWTestimonials() {
  const reviews = [{
    name: "Laura M.",
    route: "Camino Portugués · mayo 2025",
    text: "El servicio de equipaje cambia el viaje por completo. Llegabas al hotel y tu maleta estaba allí. Mágico.",
    rating: 5
  }, {
    name: "Javi & Marta",
    route: "Camino Francés · septiembre 2025",
    text: "La asistencia 24h nos salvó cuando perdimos el albergue en Sarria. En una hora ya teníamos otro alojamiento, sin coste extra.",
    rating: 5
  }, {
    name: "Carmen R.",
    route: "Camino del Norte · julio 2025",
    text: "La app con mapas offline fue brutal. Nunca dudamos del camino, incluso en tramos sin cobertura.",
    rating: 5
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: swTestiStyles.section
  }, /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.inner
  }, /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.head
  }, /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.kicker
  }, "RESE\xD1AS"), /*#__PURE__*/React.createElement("h2", {
    style: swTestiStyles.h2
  }, "+12.000 peregrinos guiados"), /*#__PURE__*/React.createElement("p", {
    style: swTestiStyles.lead
  }, "Nota media ", /*#__PURE__*/React.createElement("b", null, "4,9/5"), " \xB7 Google \xB7 TrustPilot \xB7 Tripadvisor.")), /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.grid
  }, reviews.map((r, i) => /*#__PURE__*/React.createElement("article", {
    key: i,
    style: swTestiStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.stars
  }, "★".repeat(r.rating)), /*#__PURE__*/React.createElement("p", {
    style: swTestiStyles.quote
  }, "\"", r.text, "\""), /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.foot
  }, /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.avatar
  }, r.name.charAt(0)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.name
  }, r.name), /*#__PURE__*/React.createElement("div", {
    style: swTestiStyles.route
  }, r.route))))))));
}
const swTestiStyles = {
  section: {
    background: "#FAF8F2",
    padding: "96px 0",
    borderTop: "1px solid #E6E2D6"
  },
  inner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "0 32px"
  },
  head: {
    textAlign: "center",
    maxWidth: 640,
    margin: "0 auto 48px"
  },
  kicker: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7AA606",
    marginBottom: 14
  },
  h2: {
    fontSize: 44,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    margin: "0 0 14px",
    color: "#184834"
  },
  lead: {
    fontSize: 16,
    color: "#525249",
    margin: 0
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 22
  },
  card: {
    background: "white",
    border: "1px solid #E6E2D6",
    borderRadius: 14,
    padding: "26px 26px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    boxShadow: "0 1px 2px rgba(26,26,26,.04)"
  },
  stars: {
    color: "#F4C530",
    letterSpacing: 3,
    fontSize: 16
  },
  quote: {
    margin: 0,
    fontSize: 15.5,
    lineHeight: 1.55,
    color: "#184834",
    flexGrow: 1
  },
  foot: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    borderTop: "1px solid #F3F0E7"
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    background: "#7AA606",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    fontSize: 15
  },
  name: {
    fontSize: 14,
    fontWeight: 700,
    color: "#184834"
  },
  route: {
    fontSize: 12,
    color: "#76766D"
  }
};
window.SWTestimonials = SWTestimonials;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Testimonials.jsx", error: String((e && e.message) || e) }); }

})();
