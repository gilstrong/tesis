/*
 * Liquid Glass numeric wheel, isolated in Shadow DOM.
 * Usage: mountLiquidNumberWheels('input.sg-quantity-input, #bn, #color');
 * The native input remains in the DOM and receives bubbling input/change events.
 */
(function registerLiquidNumberWheel(global) {
  'use strict';

  if (global.customElements?.get('lg-number-wheel')) return;

  class LiquidNumberWheel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._frame = 0;
      this._settleTimer = 0;
      this._rowHeight = 48;
      this._windowSize = 25;
      this._value = 0;
      this._min = 0;
      this._max = 9999;
      this._step = 1;
      this._lastEmitted = null;
      this._render();
    }

    connectedCallback() {
      this._readAttributes();
      this._setWindow(this._value, false);
      this._syncSelected(false);
    }

    static get observedAttributes() { return ['value', 'min', 'max', 'step', 'label', 'disabled']; }

    attributeChangedCallback() {
      if (!this.isConnected) return;
      this._readAttributes();
      this._setWindow(this._value, false);
    }

    get value() { return this._value; }
    set value(next) {
      this._value = this._normalize(next);
      if (this.isConnected) this._setWindow(this._value, false);
    }
    get onChange() { return this._onChange || null; }
    set onChange(callback) { this._onChange = typeof callback === 'function' ? callback : null; }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            --lg-wheel-row: 48px;
            --lg-wheel-radius: 25px;
            display: block;
            width: 100%;
            color: #172033;
            font: 600 1rem/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            -webkit-tap-highlight-color: transparent;
            contain: content;
          }
          *, *::before, *::after { box-sizing: border-box; }
          .lg-wheel-shell {
            position: relative;
            height: calc(var(--lg-wheel-row) * 5);
            overflow: hidden;
            isolation: isolate;
            border: 1px solid rgba(255,255,255,.78);
            border-radius: var(--lg-wheel-radius);
            background:
              radial-gradient(130% 80% at 8% -15%, rgba(255,255,255,.94), transparent 58%),
              linear-gradient(145deg, rgba(255,255,255,.76), rgba(230,239,255,.42) 48%, rgba(255,255,255,.54));
            box-shadow: 0 16px 36px rgba(41,58,91,.15), 0 2px 6px rgba(41,58,91,.08),
              inset 0 1px 0 rgba(255,255,255,.96), inset 0 -1px 0 rgba(255,255,255,.5);
            backdrop-filter: blur(24px) saturate(1.7);
            -webkit-backdrop-filter: blur(24px) saturate(1.7);
          }
          .lg-wheel-scroll {
            position: absolute;
            inset: 0;
            overflow-y: auto;
            overflow-x: hidden;
            perspective: 560px;
            scroll-snap-type: y mandatory;
            scroll-padding-block: calc(var(--lg-wheel-row) * 2);
            scrollbar-width: none;
            overscroll-behavior-y: contain;
            touch-action: pan-y;
            -webkit-overflow-scrolling: touch;
            mask-image: linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 22%, #000 78%, transparent 100%);
          }
          .lg-wheel-scroll::-webkit-scrollbar { display: none; }
          .lg-wheel-list { padding-block: calc(var(--lg-wheel-row) * 2); }
          .lg-wheel-option {
            display: grid;
            width: 100%;
            height: var(--lg-wheel-row);
            place-items: center;
            border: 0;
            padding: 0;
            color: rgba(31,43,64,.55);
            background: transparent;
            font: inherit;
            font-size: 1.08rem;
            font-variant-numeric: tabular-nums;
            cursor: pointer;
            scroll-snap-align: center;
            scroll-snap-stop: always;
            transform-origin: center;
            will-change: transform, opacity;
            transition: color 120ms ease;
          }
          .lg-wheel-option[aria-selected="true"] { color: #101827; font-weight: 750; }
          .lg-wheel-option:focus-visible { outline: 2px solid rgba(60,111,255,.85); outline-offset: -7px; border-radius: 12px; }
          .lg-wheel-lens {
            position: absolute;
            z-index: 2;
            inset: calc(var(--lg-wheel-row) * 2) 9px auto;
            height: var(--lg-wheel-row);
            pointer-events: none;
            border: 1px solid rgba(255,255,255,.94);
            border-radius: 15px;
            background:
              linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,.12) 28%, rgba(255,255,255,.16) 70%, rgba(255,255,255,.42)),
              linear-gradient(105deg, rgba(255,255,255,.22), rgba(225,237,255,.10) 44%, rgba(255,255,255,.32));
            box-shadow: 0 5px 16px rgba(43,63,102,.08),
              inset 0 1.5px 0 rgba(255,255,255,.98), inset 0 -1px 0 rgba(255,255,255,.78),
              inset 1px 0 0 rgba(255,255,255,.62), inset -1px 0 0 rgba(255,255,255,.62);
            backdrop-filter: blur(10px) saturate(1.8);
            -webkit-backdrop-filter: blur(10px) saturate(1.8);
          }
          .lg-wheel-lens::before, .lg-wheel-lens::after {
            content: "";
            position: absolute;
            left: 15%; right: 15%; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.98), transparent);
          }
          .lg-wheel-lens::before { top: 1px; }
          .lg-wheel-lens::after { bottom: 1px; opacity: .7; }
          .lg-wheel-label {
            display: block;
            margin: 0 0 7px 4px;
            color: rgba(38,51,72,.68);
            font-size: .78rem;
            font-weight: 650;
            letter-spacing: .025em;
          }
          :host([disabled]) { opacity: .48; }
          :host([disabled]) .lg-wheel-scroll { pointer-events: none; }
          @media (prefers-reduced-motion: reduce) {
            .lg-wheel-option { transition: none; }
          }
        </style>
        <span class="lg-wheel-label" id="label"></span>
        <div class="lg-wheel-shell">
          <div class="lg-wheel-scroll" role="listbox" tabindex="0" aria-labelledby="label">
            <div class="lg-wheel-list"></div>
          </div>
          <div class="lg-wheel-lens" aria-hidden="true"></div>
        </div>`;
      this._scroller = this.shadowRoot.querySelector('.lg-wheel-scroll');
      this._list = this.shadowRoot.querySelector('.lg-wheel-list');
      this._label = this.shadowRoot.querySelector('.lg-wheel-label');
      this._scroller.addEventListener('scroll', () => this._onScroll(), { passive: true });
      this._scroller.addEventListener('click', event => {
        const option = event.target.closest('.lg-wheel-option');
        if (option) this._scrollToValue(Number(option.dataset.value));
      });
      this._scroller.addEventListener('keydown', event => this._onKeyDown(event));
    }

    _readAttributes() {
      this._min = this.hasAttribute('min') ? Number(this.getAttribute('min')) : 0;
      this._max = this.hasAttribute('max') ? Number(this.getAttribute('max')) : Math.max(this._min + 1000, this._value + 1000);
      this._step = Math.max(Number(this.getAttribute('step')) || 1, Number.EPSILON);
      this._value = this._normalize(this.getAttribute('value') ?? this._value);
      this._label.textContent = this.getAttribute('label') || 'Cantidad';
      this._scroller.setAttribute('aria-label', this.getAttribute('label') || 'Seleccionar cantidad');
    }

    _normalize(value) {
      let number = Number(value);
      if (!Number.isFinite(number)) number = this._min || 0;
      number = Math.min(this._max ?? 9999, Math.max(this._min ?? 0, number));
      const steps = Math.round((number - (this._min || 0)) / (this._step || 1));
      const normalized = (this._min || 0) + steps * (this._step || 1);
      return Number(normalized.toFixed(6));
    }

    _valuesAround(center) {
      const currentIndex = Math.round((center - this._min) / this._step);
      const radius = Math.floor(this._windowSize / 2);
      const maxIndex = Math.floor((this._max - this._min) / this._step);
      let start = Math.max(0, Math.min(currentIndex - radius, maxIndex - this._windowSize + 1));
      start = Math.max(0, start);
      const end = Math.min(maxIndex, start + this._windowSize - 1);
      return Array.from({ length: end - start + 1 }, (_, index) => this._min + (start + index) * this._step);
    }

    _setWindow(center, animate) {
      const values = this._valuesAround(center);
      this._list.innerHTML = values.map(value => `<button class="lg-wheel-option" type="button" role="option" data-value="${value}" aria-selected="false">${value}</button>`).join('');
      this._scroller.setAttribute('aria-activedescendant', '');
      this._updateTransforms();
      const target = Array.from(this._list.children).find(option => Number(option.dataset.value) === this._normalize(center));
      if (target) {
        const y = target.offsetTop + target.offsetHeight / 2 - this._scroller.clientHeight / 2;
        this._scroller.scrollTo({ top: y, behavior: animate ? this._scrollBehavior() : 'auto' });
        this._syncSelected(false);
      }
    }

    _onScroll() {
      if (!this._frame) this._frame = requestAnimationFrame(() => {
        this._frame = 0;
        this._updateTransforms();
      });
      clearTimeout(this._settleTimer);
      this._settleTimer = setTimeout(() => this._commitNearest(), 110);
    }

    _updateTransforms() {
      const center = this._scroller.scrollTop + this._scroller.clientHeight / 2;
      for (const option of this._list.children) {
        const distance = (option.offsetTop + option.offsetHeight / 2 - center) / this._rowHeight;
        const bounded = Math.max(-2.5, Math.min(2.5, distance));
        const rotate = bounded * -21;
        const scale = 1 - Math.min(Math.abs(distance), 3) * .115;
        const opacity = Math.max(.22, 1 - Math.abs(distance) * .25);
        option.style.transform = `perspective(560px) rotateX(${rotate}deg) scale(${scale})`;
        option.style.opacity = String(opacity);
      }
    }

    _nearestOption() {
      const center = this._scroller.scrollTop + this._scroller.clientHeight / 2;
      let nearest = null;
      let minDistance = Infinity;
      for (const option of this._list.children) {
        const distance = Math.abs(option.offsetTop + option.offsetHeight / 2 - center);
        if (distance < minDistance) { nearest = option; minDistance = distance; }
      }
      return nearest;
    }

    _commitNearest() {
      const nearest = this._nearestOption();
      if (!nearest) return;
      const next = Number(nearest.dataset.value);
      const edge = this._list.children.length - 3;
      const atEdge = nearest === this._list.firstElementChild || nearest === this._list.lastElementChild ||
        Array.from(this._list.children).indexOf(nearest) < 2 || Array.from(this._list.children).indexOf(nearest) > edge;
      this._value = this._normalize(next);
      this._syncSelected(true);
      if (atEdge && this._value > this._min && this._value < this._max) this._setWindow(this._value, false);
    }

    _syncSelected(emit) {
      for (const option of this._list.children) {
        const selected = Number(option.dataset.value) === this._value;
        option.setAttribute('aria-selected', String(selected));
        if (selected) option.id = 'lg-wheel-selected';
        else option.removeAttribute('id');
      }
      this._scroller.setAttribute('aria-activedescendant', 'lg-wheel-selected');
      if (emit && this._lastEmitted !== this._value) {
        this._lastEmitted = this._value;
        const detail = { value: this._value };
        this.dispatchEvent(new CustomEvent('lg-wheel-change', { bubbles: true, composed: true, detail }));
        this._onChange?.(this._value);
      }
    }

    _scrollToValue(value) {
      this._value = this._normalize(value);
      const option = Array.from(this._list.children).find(item => Number(item.dataset.value) === this._value);
      if (!option) { this._setWindow(this._value, false); return; }
      const y = option.offsetTop + option.offsetHeight / 2 - this._scroller.clientHeight / 2;
      this._scroller.scrollTo({ top: y, behavior: this._scrollBehavior() });
    }

    _scrollBehavior() {
      return global.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    }

    _onKeyDown(event) {
      let next = this._value;
      if (event.key === 'ArrowDown') next += this._step;
      else if (event.key === 'ArrowUp') next -= this._step;
      else if (event.key === 'PageDown') next += this._step * 5;
      else if (event.key === 'PageUp') next -= this._step * 5;
      else if (event.key === 'Home') next = this._min;
      else if (event.key === 'End') next = this._max;
      else return;
      event.preventDefault();
      this._scrollToValue(next);
    }

    syncFromInput(value) {
      this._value = this._normalize(value);
      this._lastEmitted = this._value;
      this._setWindow(this._value, false);
    }
  }

  global.customElements.define('lg-number-wheel', LiquidNumberWheel);

  const mounts = new WeakMap();
  function mountLiquidNumberWheel(input, options = {}) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'number') throw new TypeError('El selector necesita un input[type="number"].');
    if (mounts.has(input)) return mounts.get(input).wheel;

    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'display:block;position:relative;width:100%;min-width:0;';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const original = {
      style: input.getAttribute('style'),
      tabIndex: input.getAttribute('tabindex'),
      ariaHidden: input.getAttribute('aria-hidden')
    };
    input.style.cssText += ';position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;opacity:0!important;pointer-events:none!important;';
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');

    const wheel = document.createElement('lg-number-wheel');
    const inputMin = input.min !== '' ? Number(input.min) : 0;
    const inputMax = input.max !== '' ? Number(input.max) : Math.max(Number(input.value || 0) + 1000, inputMin + 1000);
    wheel.setAttribute('min', options.min ?? inputMin);
    wheel.setAttribute('max', options.max ?? inputMax);
    wheel.setAttribute('step', options.step ?? (input.step !== '' ? input.step : 1));
    wheel.setAttribute('value', input.value || input.min || 0);
    wheel.setAttribute('label', options.label || input.labels?.[0]?.textContent?.trim() || input.getAttribute('aria-label') || 'Cantidad');
    if (input.disabled) wheel.setAttribute('disabled', '');
    wrapper.appendChild(wheel);

    let syncing = false;
    const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() { return valueDescriptor.get.call(this); },
      set(value) {
        valueDescriptor.set.call(this, value);
        if (!syncing) wheel.syncFromInput(this.value);
      }
    });
    wheel.addEventListener('lg-wheel-change', event => {
      syncing = true;
      input.value = String(event.detail.value);
      syncing = false;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const form = input.form;
    const handleReset = () => setTimeout(() => wheel.syncFromInput(input.value), 0);
    form?.addEventListener('reset', handleReset);

    mounts.set(input, { wheel, wrapper, original, valueDescriptor, handleReset });
    return wheel;
  }

  function mountLiquidNumberWheels(selector, root = document) {
    return Array.from(root.querySelectorAll(selector)).map(input => mountLiquidNumberWheel(input));
  }

  function unmountLiquidNumberWheel(input) {
    const mount = mounts.get(input);
    if (!mount) return;
    Object.defineProperty(input, 'value', mount.valueDescriptor);
    if (mount.original.style === null) input.removeAttribute('style'); else input.setAttribute('style', mount.original.style);
    if (mount.original.tabIndex === null) input.removeAttribute('tabindex'); else input.setAttribute('tabindex', mount.original.tabIndex);
    if (mount.original.ariaHidden === null) input.removeAttribute('aria-hidden'); else input.setAttribute('aria-hidden', mount.original.ariaHidden);
    mount.wrapper.parentNode.insertBefore(input, mount.wrapper);
    mount.wrapper.remove();
    input.form?.removeEventListener('reset', mount.handleReset);
    mounts.delete(input);
  }

  global.mountLiquidNumberWheel = mountLiquidNumberWheel;
  global.mountLiquidNumberWheels = mountLiquidNumberWheels;
  global.unmountLiquidNumberWheel = unmountLiquidNumberWheel;

  const quantitySelector = 'input.sg-quantity-input, #bn, #color, #paginas, #tomos, #cantidadCd';
  const mountQuantities = () => mountLiquidNumberWheels(quantitySelector);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountQuantities, { once: true });
  else mountQuantities();
  if (global.MutationObserver && document.body) {
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(quantitySelector)) mountLiquidNumberWheel(node);
        node.querySelectorAll?.(quantitySelector).forEach(input => mountLiquidNumberWheel(input));
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
})(window);
