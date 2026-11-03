(() => {
  'use strict';

  const page = document.body.dataset.page;
  const state = {
    user: null,
    products: [],
    favorites: [],
    cart: [],
    category: 'Todas',
    search: '',
    sort: 'featured',
    accountMode: 'login'
  };
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const byId = id => document.getElementById(id);
  const productId = product => String(product.id_producto);
  const productPrice = product => Number(product.precio);
  const cartTotal = () => state.cart.reduce((sum, item) => sum + productPrice(item) * Number(item.cantidad_carrito), 0);
  const cartCount = () => state.cart.reduce((sum, item) => sum + Number(item.cantidad_carrito), 0);

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(payload?.error || `La solicitud falló (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function showToast(message) {
    const toast = byId('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function currentReturnPath() {
    return `${window.location.pathname}${window.location.search}`;
  }

  function redirectToAccount(returnPath = currentReturnPath()) {
    const target = new URL('/cuenta.html', window.location.origin);
    target.searchParams.set('return', returnPath);
    window.location.assign(target.href);
  }

  function safeReturnPath() {
    const value = new URLSearchParams(window.location.search).get('return');
    if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return '';
    const allowed = ['/favoritos.html', '/carrito.html', '/checkout.html', '/productos.html', '/producto-detalle.html'];
    return allowed.includes(target.pathname) ? `${target.pathname}${target.search}` : '';
  }

  function setupNavigation() {
    const menuButton = byId('mobile-menu-toggle');
    const menu = byId('primary-menu');
    menuButton?.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('menu-open', open);
    });
    menu?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('menu-open');
        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-label', 'Abrir menú');
      });
    });
    const year = byId('current-year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function updateHeader() {
    const accountLink = byId('account-open');
    if (accountLink) {
      accountLink.textContent = state.user ? `Hola, ${state.user.nombre.split(/\s+/)[0]}` : 'Iniciar sesión';
      accountLink.setAttribute('aria-label', state.user ? `Mi cuenta, sesión de ${state.user.nombre}` : 'Iniciar sesión');
    }
    const badge = byId('cart-count');
    if (badge) badge.textContent = String(cartCount());
  }

  function productKind(product) {
    const category = String(product.categoria_nombre || '').toLocaleLowerCase('es');
    if (category.includes('concentradores')) return 'oxygen';
    if (category.includes('cpap') || category.includes('bipap')) return 'sleep';
    if (category.includes('nebulizadores')) return 'therapy';
    if (category.includes('diagnóstico')) return 'diagnostic';
    if (category.includes('accesorios')) return 'accessory';
    return 'accessory';
  }

  const uploadedPhotoByProductId = {
    1: '/images/products/order-01.png',
    2: '/images/products/order-02.png',
    3: '/images/products/order-03.png',
    4: '/images/products/order-04.png',
    5: '/images/products/order-05.png',
    6: '/images/products/order-06.png',
    7: '/images/products/order-07.png',
    8: '/images/products/order-08.png',
    9: '/images/products/order-09.png',
    10: '/images/products/order-10.png',
    12: '/images/products/order-11.png',
    13: '/images/products/order-12.png',
    14: '/images/products/order-13.png',
    15: '/images/products/order-14.png',
    16: '/images/products/order-15.png',
    17: '/images/products/order-16.png',
    18: '/images/products/order-17.png',
    19: '/images/products/order-18.png',
    20: '/images/products/order-19.png',
    21: '/images/products/order-20.png',
    24: '/images/products/order-21.png',
    29: '/images/products/order-22.png',
    30: '/images/products/order-23.png',
    32: '/images/products/order-24.png',
    39: '/images/products/order-25.png',
    40: '/images/products/order-26.png',
    41: '/images/products/order-27.png',
    43: '/images/products/order-28.png',
    44: '/images/products/order-29.png',
    46: '/images/products/order-30.png',
    47: '/images/products/order-31.png',
    49: '/images/products/order-32.png',
    50: '/images/products/order-33.png',
    22: '/images/products/additional-01.png',
    23: '/images/products/additional-02.png',
    25: '/images/products/additional-03.png',
    26: '/images/products/additional-04.png',
    27: '/images/products/additional-05.png',
    28: '/images/products/additional-06.png',
    31: '/images/products/additional-07.png',
    33: '/images/products/additional-08.png',
    34: '/images/products/additional-09.png',
    35: '/images/products/additional-10.png',
    36: '/images/products/additional-11.png',
    37: '/images/products/additional-12.png',
    38: '/images/products/additional-13.png',
    42: '/images/products/additional-14.png',
    45: '/images/products/additional-15.png',
    48: '/images/products/additional-16.png'
  };

  function makeProductArt(product, className = '') {
    const id = Math.max(1, Number(product.id_producto) || 1);
    const uploadedPhoto = uploadedPhotoByProductId[id];
    if (uploadedPhoto) {
      return `<img class="product-art ${escapeHTML(className)}" src="${uploadedPhoto}" alt="Fotografía de ${escapeHTML(product.nombre || 'equipo médico')}" loading="lazy" decoding="async">`;
    }
    const variant = (id - 1) % 10;
    const kind = productKind(product);
    const name = String(product.nombre || '').toLocaleLowerCase('es');
    const width = 126 - (variant % 5) * 5;
    const height = 130 + (variant % 4) * 7;
    const x = 160 - width / 2;
    const y = 116 - height / 2;
    const radius = 10 + variant % 5;
    const detail = variant % 4;
    const stripeCount = 2 + variant % 5;
    let device = '';

    if (kind === 'oxygen') {
      const portable = /port[aá]til|mini|compacto|bater[ií]a/.test(name);
      const vents = Array.from({ length: stripeCount }, (_, index) =>
        `<path d="M${x + 20} ${y + height - 31 + index * 6}h${20 + ((variant + index) % 4) * 4}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>`
      ).join('');
      device = `${portable ? `<path d="M${x + 38} ${y}v-9c0-11 8-18 18-18h${Math.max(28, width - 74)}c10 0 18 7 18 18v9" fill="none" stroke="#1e3a8a" stroke-width="6" stroke-linecap="round"/>` : `<path d="M${x + 18} ${y}v-10h${width - 36}v10" fill="none" stroke="#1e3a8a" stroke-width="5" stroke-linejoin="round"/>`}
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
        <rect x="${x + 17}" y="${y + 17}" width="${width - 34}" height="${36 + detail * 3}" rx="5" fill="#00b4d8" stroke="#0f172a" stroke-width="2"/>
        <path d="M${x + 26} ${y + 42}h12l7-13 9 23 8-13h12" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${x + width - 21}" cy="${y + 72}" r="${5 + variant % 4}" fill="#06b6d4" stroke="#0f172a" stroke-width="2"/>
        ${vents}<path d="M${x + 17} ${y + height}v8m${width - 34} -8v8" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/>`;
    } else if (kind === 'sleep') {
      const compact = /mini|viaje|port[aá]til/.test(name);
      device = `<path d="M${58 + variant * 2} ${112 + detail * 2}c28-38 61-42 102-34" fill="none" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round"/>
        <rect x="${x}" y="${y + 31}" width="${width}" height="${height - 43}" rx="${compact ? 17 + variant : 10 + detail * 7}" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
        <rect x="${x + 17}" y="${y + 48}" width="${width - 40}" height="${31 + detail * 2}" rx="5" fill="#00b4d8" stroke="#0f172a" stroke-width="2"/>
        <path d="M${x + 25} ${y + 67}h11l7-10 8 18 7-11h13" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${x + width - 15}" cy="${y + 94}" r="${4 + variant % 5}" fill="#06b6d4" stroke="#0f172a" stroke-width="2"/>
        <path d="M${x + 16} ${y + height - 12}v9m${width - 32} -9v9m15-22h${24 + variant * 2}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
        ${/kit completo/.test(name) ? `<path d="M225 127c28-6 39 13 29 32l-11 12h-22l-10-14 3-19z" fill="#06b6d4" stroke="#0f172a" stroke-width="4"/><path d="M224 145h20m-10-12v25" stroke="#0f172a" stroke-width="2.5"/>` : ''}`;
    } else if (kind === 'therapy') {
      if (/inspir[oó]metro/.test(name)) {
        device = `<rect x="${104 - variant}" y="48" width="${112 + variant * 2}" height="${158 - detail * 8}" rx="12" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
          <path d="M128 71h65v20h-65z" fill="#00b4d8" stroke="#0f172a" stroke-width="3"/>
          <path d="M136 91v${38 + variant * 2}m24-38v${56 + detail * 6}m24-56v${70 - detail * 4}" stroke="#0f172a" stroke-width="3"/>
          <circle cx="136" cy="${117 + variant}" r="7" fill="#06b6d4" stroke="#0f172a" stroke-width="2"/><circle cx="160" cy="${137 + detail * 3}" r="7" fill="#00b4d8" stroke="#0f172a" stroke-width="2"/><circle cx="184" cy="${154 - detail * 2}" r="7" fill="#06b6d4" stroke="#0f172a" stroke-width="2"/>
          <path d="M${136 - variant} 191h${48 + variant * 2}m-34 10h${19 + detail * 4}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>`;
      } else if (/aeroc[aá]mara/.test(name)) {
        device = `<path d="M${74 + variant} 109h121" stroke="#1e3a8a" stroke-width="${14 + detail * 2}" stroke-linecap="round"/>
          <path d="M${88 + variant} 88h90v43h-90z" fill="#ffffff" fill-opacity=".92" stroke="#0f172a" stroke-width="4"/>
          <path d="M178 98h37v22h-37z" fill="#00b4d8" stroke="#0f172a" stroke-width="3"/>
          <path d="M${213 + detail} 109c23 4 25 25 8 39" fill="none" stroke="#0f172a" stroke-width="4"/>
          <path d="M207 143c15-13 34-9 40 4l-9 19h-21l-9-13z" fill="#06b6d4" stroke="#0f172a" stroke-width="4"/>`;
      } else if (/resucitador|ambu/.test(name)) {
        device = `<path d="M${123 + variant} 64c-27 4-41 22-34 46l13 51c4 16 21 24 36 18 14-6 20-20 15-35l-13-48c-4-16-7-27-17-32z" fill="#06b6d4" stroke="#0f172a" stroke-width="5"/>
          <path d="M148 81c17-17 42-19 57-3l11 12-19 20-21-9-17 14m20-29 17-17 17 13-15 20" fill="#ffffff" stroke="#1e3a8a" stroke-width="5" stroke-linejoin="round"/>
          <path d="M198 85c25-10 45-3 56 13" fill="none" stroke="#0f172a" stroke-width="${3 + detail}" stroke-linecap="round"/>`;
      } else {
        device = `<rect x="${x + 12}" y="${y + 34}" width="${width - 24}" height="${height - 48}" rx="${17 + variant}" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
          <path d="M${x + 37} ${y + 34}v-16h${width - 74}v16" fill="#00b4d8" stroke="#0f172a" stroke-width="4" stroke-linejoin="round"/>
          <circle cx="160" cy="${y + 76}" r="${17 + detail * 3}" fill="#06b6d4" stroke="#0f172a" stroke-width="3"/><circle cx="160" cy="${y + 76}" r="${6 + variant % 5}" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
          <path d="M${x + 30} ${y + 108}h${20 + variant * 2}m10 10h${18 + detail * 3}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
          <path d="M${x + width - 12} ${y + 63}c24 0 35 14 29 32" fill="none" stroke="#1e3a8a" stroke-width="4"/>`;
      }
    } else if (kind === 'diagnostic') {
      if (/ox[ií]metro/.test(name)) {
        const animal = /animal/.test(name);
        device = `<path d="M${x + 16} ${y + 20}h${width - 32}q${18 + detail * 2} 0 ${18 + detail * 2} 20v${height - 48}q0 17-18 17h-${width - 32}q-18 0-18-17V${y + 40}q0-20 18-20z" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
          ${animal ? `<path d="m${x + 26} ${y + 24} 12-18 13 18m${width - 53} 0 13-18 12 18" fill="#06b6d4" stroke="#0f172a" stroke-width="4" stroke-linejoin="round"/>` : ''}
          <rect x="${x + 27}" y="${y + 39}" width="${width - 54}" height="${35 + detail * 3}" rx="5" fill="#0f172a"/>
          <path d="M${x + 34} ${y + 57}h${8 + variant}l5-8 7 15 6-10h${8 + detail * 3}" fill="none" stroke="#00b4d8" stroke-width="3" stroke-linecap="round"/>
          <circle cx="${x + 45}" cy="${y + 91}" r="${5 + variant % 4}" fill="#06b6d4"/><path d="M${x + 63} ${y + 91}h${width - 92}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>`;
      } else if (/estetoscopio/.test(name)) {
        device = `<path d="M${96 + variant} 49v59c0 26 16 40 39 40s39-14 39-40V49m-78 3H78v24h18m78-24h18v24h-18" fill="none" stroke="#0f172a" stroke-width="${7 + detail}" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M174 146v12c0 19 13 31 33 31h9" fill="none" stroke="#1e3a8a" stroke-width="7" stroke-linecap="round"/><circle cx="232" cy="189" r="${15 + variant % 4}" fill="#06b6d4" stroke="#0f172a" stroke-width="4"/><circle cx="232" cy="189" r="6" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>`;
      } else if (/term[oó]metro/.test(name)) {
        device = `<path d="M${134 + detail} 55v${92 + variant}a29 29 0 1 0 ${44 + variant} 0V55a22 22 0 0 0-${44 + variant} 0Z" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
          <path d="M156 85v${73 + variant}" stroke="#00b4d8" stroke-width="${8 + detail}" stroke-linecap="round"/><circle cx="156" cy="${169 + variant}" r="${12 + detail}" fill="#06b6d4" stroke="#0f172a" stroke-width="3"/>
          <path d="M192 77h${27 + variant * 2}m-27 24h${18 + detail * 4}m-18 24h${29 + variant}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>`;
      } else if (/tensi[oó]metro|monitor de signos/.test(name)) {
        device = `<rect x="${x}" y="${y + 10}" width="${width}" height="${height - 30}" rx="${9 + variant}" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
          <rect x="${x + 17}" y="${y + 28}" width="${width - 34}" height="${49 + detail * 3}" rx="5" fill="#0f172a"/>
          <path d="M${x + 23} ${y + 54}h12l7-15 9 28 8-16h${12 + detail * 5}" fill="none" stroke="#00b4d8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="${x + width / 2}" cy="${y + 98}" r="${9 + variant % 4}" fill="#06b6d4" stroke="#0f172a" stroke-width="3"/>
          <path d="M${x + 13} ${y + height - 11}v9m${width - 26} -9v9m-45-18h${25 + variant * 2}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>`;
      } else {
        device = `<path d="M${x + 15} ${y + 11}h${width - 30}l${detail * 2} ${height - 25}h-${width - 30}z" fill="#ffffff" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
          <rect x="${x + 30}" y="${y + 31}" width="${width - 60}" height="${37 + detail * 3}" rx="5" fill="#00b4d8" stroke="#0f172a" stroke-width="3"/>
          <path d="M${x + 37} ${y + 49}h${11 + variant}l5-9 7 17 6-10h${10 + detail * 3}" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M${x + 29} ${y + 87}h${width - 58}m-17 14h${27 + variant * 2}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
          <path d="M${x + width / 2} ${y + height - 13}v13" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round"/>`;
      }
    } else if (/mascarilla/.test(name)) {
      device = `<path d="M${113 + variant} ${70 + detail}c25-23 64-23 89 0l15 61-28 37h-62l-28-37 14-61Z" fill="#ffffff" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
        <path d="M${126 + detail} 112c19-15 45-15 64 0l10 29-25 18h-35l-23-18 9-29Z" fill="#06b6d4" stroke="#1e3a8a" stroke-width="4"/>
        <path d="M118 79 83 62m132 17 35-17M116 143l-27 33m136-33 27 33" stroke="#0f172a" stroke-width="${4 + variant % 4}" stroke-linecap="round"/>
        ${/frontal/.test(name) ? `<path d="M${155 + detail} 50v35m-20-26h40" stroke="#00b4d8" stroke-width="5" stroke-linecap="round"/>` : ''}`;
    } else if (/vaso humidificador/.test(name)) {
      device = `<path d="M127 58h66v26h-66z" fill="#06b6d4" stroke="#0f172a" stroke-width="4"/>
        <path d="M115 84h90l-9 ${83 + variant}h-72l-9-${83 + variant}Z" fill="#ffffff" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
        <path d="M128 132h64m-59 13h54m-48 13h43" stroke="#00b4d8" stroke-width="${3 + detail}" stroke-linecap="round"/>
        <path d="M147 58V42h26v16m13-3h26" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>`;
    } else if (/c[aá]nula|cat[eé]ter|tubo flexible/.test(name)) {
      device = `<path d="M${73 + variant} ${94 + detail}c35-54 70 51 108-2s44-8 58 22" fill="none" stroke="#06b6d4" stroke-width="${7 + variant % 4}" stroke-linecap="round"/>
        <path d="M${73 + variant} ${94 + detail}l-20-16m20 16-21 17m185 3 15 14" stroke="#0f172a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${75 + variant}" cy="${94 + detail}" r="${8 + detail}" fill="#ffffff" stroke="#0f172a" stroke-width="4"/>
        <path d="M${97 + variant * 2} 167h${46 + detail * 8}m20-12h${40 - variant}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>`;
    } else if (/filtro/.test(name)) {
      device = `<path d="M${105 + detail} 65h${113 - variant}l-12 121h-${88 - detail}l-13-121Z" fill="#ffffff" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
        <path d="M${118 + detail} 82h${79 - variant}m-77 12h${75 - variant}m-74 12h${73 - variant}m-72 12h${71 - variant}m-70 12h${69 - variant}m-68 12h${67 - variant}m-66 12h${65 - variant}" stroke="#00b4d8" stroke-width="${2 + detail}" stroke-linecap="round"/>
        <path d="M${119 + detail} 175h${59 - variant}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>`;
    } else if (/regulador/.test(name)) {
      device = `<circle cx="151" cy="119" r="${52 + variant % 5}" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
        <circle cx="151" cy="119" r="${36 + detail * 2}" fill="#00b4d8" stroke="#0f172a" stroke-width="3"/>
        <path d="m151 119 ${16 + variant} -${24 + detail * 2}" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
        <circle cx="151" cy="119" r="6" fill="#0f172a"/><path d="M198 112h32v16h-32m-91-8H80" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
        <path d="M${113 + variant} 184h${73 - detail * 3}" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round"/>`;
    } else if (/cilindro/.test(name)) {
      device = `<rect x="${119 + detail}" y="40" width="${82 - variant * 2}" height="${154 + variant}" rx="${31 + detail}" fill="#ffffff" stroke="#0f172a" stroke-width="5"/>
        <path d="M${143 + detail} 40V24h${34 - detail * 2}v16m-17-16V13h25" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>
        <path d="M${128 + detail} 84h${63 - variant * 2}v47h-${63 - variant * 2}z" fill="#06b6d4" stroke="#0f172a" stroke-width="3"/>
        <path d="M${138 + detail} 98h${42 - variant}m-${42 - variant} 11h${36 - detail * 2}m-${36 - detail * 2} 11h${39 - variant}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
        <path d="M126 194h68" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/>`;
    } else if (/correa|arn[eé]s/.test(name)) {
      device = `<path d="M${83 + variant} 70c45 0 58 29 77 51 18-22 31-51 77-51v31c-26 0-37 18-53 40 16 22 27 39 53 39v29c-44 0-61-21-77-43-16 22-32 43-77 43v-29c25 0 36-17 52-39-16-22-27-40-52-40V70Z" fill="#06b6d4" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
        <circle cx="${160 + variant - 4}" cy="121" r="${13 + detail}" fill="#ffffff" stroke="#0f172a" stroke-width="4"/>
        <path d="M111 83h${22 + variant * 2}m54 83h${23 + detail * 3}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>`;
    } else {
      device = `<path d="M117 65h86v24h-86z" fill="#06b6d4" stroke="#0f172a" stroke-width="4"/>
        <path d="M${102 + variant} 89h${116 - variant}l-10 93h-${96 - variant}l-10-93Z" fill="#ffffff" stroke="#0f172a" stroke-width="5" stroke-linejoin="round"/>
        <circle cx="160" cy="${130 + detail * 2}" r="${25 + variant % 5}" fill="#00b4d8" stroke="#0f172a" stroke-width="4"/>
        <circle cx="160" cy="${130 + detail * 2}" r="${11 + variant % 3}" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>
        <path d="M${122 + variant} 166h${76 - variant}" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>`;
    }

    const svg = `<svg class="product-art ${className}" viewBox="0 0 320 240" role="img" aria-label="Ilustración del producto ${escapeHTML(product.nombre || 'equipo respiratorio')} aislado sobre fondo blanco" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="240" fill="#ffffff"/>${device}</svg>`;
    return svg;
  }

  function renderCard(product) {
    const id = productId(product);
    const name = product.nombre || 'Equipo médico respiratorio';
    const price = productPrice(product);
    const stock = Math.max(0, Number(product.stock) || 0);
    const isFavorite = state.favorites.some(item => productId(item) === id);
    const detailUrl = `/producto-detalle.html?id=${encodeURIComponent(id)}`;
    return `<article class="product-card">
      <div class="product-image-wrap"><a href="${detailUrl}" aria-label="Ver detalle de ${escapeHTML(name)}" class="product-illustration">${makeProductArt(product)}</a>
        <span class="product-category">${escapeHTML(product.categoria_nombre || 'Equipo respiratorio')}</span>
        <button class="favorite-toggle${isFavorite ? ' is-favorite' : ''}" type="button" data-favorite="${escapeHTML(id)}" aria-pressed="${isFavorite}" aria-label="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}: ${escapeHTML(name)}">♥</button>
      </div>
      <div class="product-content"><a class="product-title" href="${detailUrl}">${escapeHTML(name)}</a>
        <p class="product-description">${escapeHTML(product.descripcion || 'Equipo médico para el cuidado respiratorio.')}</p>
        <div class="product-meta"><div><span class="product-price">${Number.isFinite(price) ? currency.format(price) : 'Precio no disponible'}</span><div class="product-stock${stock > 0 && stock <= 5 ? ' low' : ''}">${stock > 0 ? `Stock disponible: ${stock}` : 'Sin stock'}</div></div>
          <div class="product-actions"><button class="add-button" type="button" data-add="${escapeHTML(id)}" aria-label="Añadir ${escapeHTML(name)} al carrito" ${stock < 1 || !Number.isFinite(price) ? 'disabled' : ''}>+</button></div>
        </div>
      </div>
    </article>`;
  }

  async function loadProducts() {
    const products = await api('/api/productos');
    if (!Array.isArray(products)) throw new Error('El catálogo no tiene el formato esperado.');
    state.products = products.filter(product => product && product.id_producto !== undefined && Number.isFinite(productPrice(product)));
    return state.products;
  }

  function renderProductGrid(grid, products, emptyTitle, emptyText) {
    if (!grid) return;
    grid.innerHTML = products.length
      ? products.map(renderCard).join('')
      : `<div class="empty-state"><strong>${escapeHTML(emptyTitle)}</strong><p>${escapeHTML(emptyText)}</p></div>`;
  }

  function renderCategories() {
    const container = byId('category-list');
    if (!container) return;
    const categories = [...new Set(state.products.map(product => String(product.categoria_nombre || '').trim()).filter(Boolean))];
    container.innerHTML = ['Todas', ...categories].map(category => `
      <button class="category-chip${state.category === category ? ' active' : ''}" type="button" data-category="${escapeHTML(category)}" aria-pressed="${state.category === category}">
        ${escapeHTML(category)}
      </button>`).join('');
  }

  function filteredProducts() {
    const query = state.search.trim().toLocaleLowerCase('es');
    let products = state.products.filter(product => {
      const matchesCategory = state.category === 'Todas' || String(product.categoria_nombre || '') === state.category;
      const searchable = `${product.nombre || ''} ${product.descripcion || ''} ${product.categoria_nombre || ''}`.toLocaleLowerCase('es');
      return matchesCategory && (!query || searchable.includes(query));
    });
    if (state.sort === 'price-low') products = [...products].sort((a, b) => productPrice(a) - productPrice(b));
    if (state.sort === 'price-high') products = [...products].sort((a, b) => productPrice(b) - productPrice(a));
    if (state.sort === 'name') products = [...products].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    return products;
  }

  function setupProductsPage() {
    const grid = byId('product-grid');
    const categories = byId('category-list');
    const results = byId('results-count');
    const search = byId('product-search');
    const sort = byId('product-sort');
    const render = () => {
      const products = filteredProducts();
      if (results) results.textContent = `${products.length} ${products.length === 1 ? 'equipo disponible' : 'equipos disponibles'}`;
      renderProductGrid(grid, products, 'No encontramos equipos', 'Prueba otra categoría o ajusta la búsqueda.');
    };
    categories?.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.category = button.dataset.category;
      renderCategories();
      render();
    });
    search?.addEventListener('input', () => { state.search = search.value; render(); });
    sort?.addEventListener('change', () => { state.sort = sort.value; render(); });
    grid?.addEventListener('click', handleProductAction);
    renderCategories();
    render();
  }

  async function loadCart() {
    state.cart = await api('/api/carrito');
    updateHeader();
    return state.cart;
  }

  async function updateCart(product, quantity) {
    const id = productId(product);
    if (quantity < 1) {
      await api(`/api/carrito/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } else {
      await api(`/api/carrito/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify({ cantidad: quantity })
      });
    }
    await loadCart();
  }

  async function handleProductAction(event) {
    const favoriteButton = event.target.closest('[data-favorite]');
    const addButton = event.target.closest('[data-add]');
    if (favoriteButton) {
      await toggleFavorite(favoriteButton.dataset.favorite);
      return;
    }
    if (addButton) {
      if (!state.user) {
        showToast('Inicia sesión para guardar tu carrito.');
        redirectToAccount(currentReturnPath());
        return;
      }
      const product = state.products.find(item => productId(item) === addButton.dataset.add)
        || state.favorites.find(item => productId(item) === addButton.dataset.add);
      if (!product) return;
      const current = state.cart.find(item => productId(item) === productId(product));
      const quantity = Number(current?.cantidad_carrito || 0) + 1;
      if (quantity > Number(product.stock)) {
        showToast('No hay más unidades disponibles.');
        return;
      }
      addButton.disabled = true;
      try {
        await updateCart(product, quantity);
        showToast('Equipo añadido al carrito.');
      } catch (error) {
        showToast(error.message || 'No pudimos actualizar el carrito.');
      } finally {
        addButton.disabled = false;
      }
    }
  }

  async function toggleFavorite(id) {
    if (!state.user) {
      showToast('Inicia sesión para guardar tus favoritos.');
      redirectToAccount(currentReturnPath());
      return;
    }
    const exists = state.favorites.some(item => productId(item) === id);
    try {
      await api(`/api/favoritos/${encodeURIComponent(id)}`, { method: exists ? 'DELETE' : 'PUT' });
      if (page === 'favoritos') {
        state.favorites = await api('/api/favoritos');
        renderProductGrid(byId('favorites-grid'), state.favorites, 'Aún no tienes favoritos', 'Usa el corazón de un equipo para guardarlo aquí.');
      } else {
        if (exists) state.favorites = state.favorites.filter(item => productId(item) !== id);
        else {
          const product = state.products.find(item => productId(item) === id);
          if (product) state.favorites.unshift(product);
        }
      }
      if (page === 'productos') renderProductGrid(byId('product-grid'), filteredProducts(), 'No encontramos equipos', 'Prueba otra categoría o ajusta la búsqueda.');
      if (page === 'detalle') renderDetail();
      showToast(exists ? 'Equipo eliminado de tus favoritos.' : 'Equipo guardado en tus favoritos.');
    } catch (error) {
      showToast(error.message || 'No pudimos actualizar tus favoritos.');
    }
  }

  async function loadFavorites() {
    state.favorites = await api('/api/favoritos');
    return state.favorites;
  }

  function setupFavoritesPage() {
    const grid = byId('favorites-grid');
    renderProductGrid(grid, state.favorites, 'Aún no tienes favoritos', 'Usa el corazón de un equipo para guardarlo aquí.');
    grid?.addEventListener('click', handleProductAction);
  }

  async function setupDetailPage() {
    const id = new URLSearchParams(window.location.search).get('id');
    const product = state.products.find(item => productId(item) === id);
    const detail = byId('product-detail');
    if (!product) {
      detail.innerHTML = '<div class="empty-state"><strong>No encontramos ese producto</strong><p>Vuelve al catálogo para elegir un equipo disponible.</p><a class="button button-primary" href="/productos.html">Ir al catálogo</a></div>';
      return;
    }
    renderDetail(product);
    detail.addEventListener('click', handleProductAction);
  }

  function renderDetail(selectedProduct) {
    const detail = byId('product-detail');
    if (!detail) return;
    const id = new URLSearchParams(window.location.search).get('id');
    const product = selectedProduct || state.products.find(item => productId(item) === id);
    if (!product) return;
    const favorite = state.favorites.some(item => productId(item) === productId(product));
    const stock = Math.max(0, Number(product.stock) || 0);
    detail.innerHTML = `<div class="detail-art">${makeProductArt(product)}</div>
      <div class="detail-info">
        <span class="detail-category">${escapeHTML(product.categoria_nombre || 'Equipo respiratorio')}</span>
        <h1>${escapeHTML(product.nombre || 'Equipo médico respiratorio')}</h1>
        <p>${escapeHTML(product.descripcion || 'Equipo médico para el cuidado respiratorio.')}</p>
        <strong class="detail-price">${currency.format(productPrice(product))}</strong>
        <p class="detail-stock">${stock > 0 ? `${stock} disponibles` : 'Sin stock'}</p>
        <div class="hero-actions"><button class="button button-primary" type="button" data-add="${escapeHTML(productId(product))}" ${stock < 1 ? 'disabled' : ''}>Añadir al carrito</button><button class="button button-outline favorite-toggle${favorite ? ' is-favorite' : ''}" type="button" data-favorite="${escapeHTML(productId(product))}" aria-pressed="${favorite}">${favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}</button></div>
        <p>Consulta con tu profesional de salud para verificar que el producto sea adecuado para tus necesidades.</p>
      </div>`;
  }

  function renderCartPage() {
    const lines = byId('cart-lines');
    if (!lines) return;
    const subtotal = cartTotal();
    const subtotalElement = byId('cart-subtotal');
    const totalElement = byId('cart-total');
    if (subtotalElement) subtotalElement.textContent = currency.format(subtotal);
    if (totalElement) totalElement.textContent = currency.format(subtotal);
    const checkoutLink = byId('checkout-link');
    if (checkoutLink) checkoutLink.setAttribute('aria-disabled', String(state.cart.length === 0));
    if (!state.cart.length) {
      lines.innerHTML = '<div class="empty-state"><strong>Tu carrito está vacío</strong><p>Explora los equipos disponibles y agrega lo que necesitas.</p><a class="button button-primary" href="/productos.html">Ver productos</a></div>';
      return;
    }
    lines.innerHTML = state.cart.map(item => {
      const id = productId(item);
      const quantity = Number(item.cantidad_carrito);
      const product = state.products.find(candidate => productId(candidate) === id) || item;
      const stock = Math.max(0, Number(item.stock) || 0);
      return `<article class="cart-line">
        <div class="cart-line-art">${makeProductArt(product)}</div>
        <div class="cart-line-main"><a class="cart-line-title" href="/producto-detalle.html?id=${encodeURIComponent(id)}">${escapeHTML(item.nombre)}</a><span class="cart-line-price">${currency.format(productPrice(item))} · Subtotal ${currency.format(productPrice(item) * quantity)}</span>
          <span class="detail-stock">${stock > 0 ? `Stock disponible: ${stock}` : 'Sin stock disponible'}</span>
          <div class="quantity-control" aria-label="Cantidad de ${escapeHTML(item.nombre)}"><button type="button" data-quantity="-1" data-id="${escapeHTML(id)}" aria-label="Reducir cantidad">−</button><span>${quantity}</span><button type="button" data-quantity="1" data-id="${escapeHTML(id)}" aria-label="Aumentar cantidad" ${quantity >= stock ? 'disabled' : ''}>+</button></div>
        </div>
        <button class="remove-item" type="button" data-remove="${escapeHTML(id)}">Quitar del carrito</button>
      </article>`;
    }).join('');
  }

  function setupCartPage() {
    renderCartPage();
    byId('cart-lines')?.addEventListener('click', async event => {
      const removeButton = event.target.closest('[data-remove]');
      const quantityButton = event.target.closest('[data-quantity]');
      if (removeButton) {
        const item = state.cart.find(product => productId(product) === removeButton.dataset.remove);
        if (!item) return;
        try {
          await updateCart(item, 0);
          renderCartPage();
        } catch (error) {
          showToast(error.message || 'No pudimos quitar el producto.');
        }
        return;
      }
      if (!quantityButton) return;
      const item = state.cart.find(product => productId(product) === quantityButton.dataset.id);
      if (!item) return;
      const quantity = Number(item.cantidad_carrito) + Number(quantityButton.dataset.quantity);
      if (quantity > Number(item.stock)) {
        showToast('No hay más unidades disponibles.');
        return;
      }
      try {
        await updateCart(item, quantity);
        renderCartPage();
      } catch (error) {
        showToast(error.message || 'No pudimos actualizar la cantidad.');
      }
    });
  }

  function setupAccountTabs() {
    document.querySelectorAll('.auth-tab').forEach(button => button.addEventListener('click', () => {
      state.accountMode = button.dataset.mode;
      document.querySelectorAll('.auth-tab').forEach(tab => tab.setAttribute('aria-selected', String(tab === button)));
      const nameField = byId('account-name-field');
      const nameInput = byId('account-form')?.elements.namedItem('nombre');
      byId('account-form')?.setAttribute('aria-labelledby', state.accountMode === 'register' ? 'register-tab' : 'login-tab');
      nameField?.classList.toggle('hidden', state.accountMode !== 'register');
      if (nameInput) nameInput.required = state.accountMode === 'register';
      const password = byId('account-form')?.elements.namedItem('password');
      if (password) password.autocomplete = state.accountMode === 'register' ? 'new-password' : 'current-password';
      const submit = byId('account-submit');
      if (submit) submit.textContent = state.accountMode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
      const forgot = byId('forgot-password');
      forgot?.classList.toggle('hidden', state.accountMode !== 'login');
      const status = byId('account-status');
      if (status) status.textContent = '';
    }));
  }

  function setFieldError(form, name, message) {
    const input = form.elements.namedItem(name);
    const error = form.querySelector(`[data-error-for="${name}"]`);
    input?.classList.toggle('invalid', Boolean(message));
    input?.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) error.textContent = message || '';
  }

  async function loadOrderHistory() {
    const list = byId('orders-list');
    if (!list) return;
    list.innerHTML = '<p class="loading-state">Cargando tus pedidos...</p>';
    try {
      const orders = await api('/api/pedidos');
      if (!Array.isArray(orders) || !orders.length) {
        list.innerHTML = '<div class="empty-state"><strong>Aún no tienes pedidos</strong><p>Cuando registres una compra, aparecerá aquí.</p><a class="button button-primary" href="/productos.html">Explorar productos</a></div>';
        return;
      }
      list.innerHTML = orders.map(order => {
        const items = Array.isArray(order.productos) ? order.productos : [];
        return `<article class="order-card"><div class="order-head"><span>Pedido #${escapeHTML(order.id_pedido)}</span><span>${escapeHTML(order.estado || 'Registrado')}</span></div>
          <ul class="order-items">${items.map(item => `<li>${escapeHTML(item.nombre)} · ${escapeHTML(item.cantidad)} × ${currency.format(Number(item.precio_unitario))}</li>`).join('')}</ul>
          <div class="order-total">Total: ${currency.format(Number(order.total))}</div>
        </article>`;
      }).join('');
    } catch (error) {
      list.innerHTML = `<div class="empty-state"><strong>No pudimos cargar tus pedidos</strong><p>${escapeHTML(error.message)}</p><button class="button button-outline" id="retry-orders" type="button">Reintentar</button></div>`;
      list.querySelector('#retry-orders')?.addEventListener('click', loadOrderHistory);
    }
  }

  async function showProfile() {
    byId('auth-panel')?.classList.add('hidden');
    byId('profile-panel')?.classList.remove('hidden');
    const message = byId('profile-message');
    if (message) message.textContent = `Sesión iniciada como ${state.user.nombre} · ${state.user.correo}`;
    await loadOrderHistory();
  }

  function setupRecovery() {
    const accountForm = byId('account-form');
    const recoveryForm = byId('recovery-form');
    byId('forgot-password')?.addEventListener('click', () => {
      const email = accountForm.elements.namedItem('correo').value.trim();
      recoveryForm.elements.namedItem('correo').value = email;
      accountForm.classList.add('hidden');
      document.querySelector('.auth-tabs')?.classList.add('hidden');
      recoveryForm.classList.remove('hidden');
      recoveryForm.elements.namedItem('correo').focus();
    });
    byId('recovery-back')?.addEventListener('click', () => {
      recoveryForm.classList.add('hidden');
      accountForm.classList.remove('hidden');
      document.querySelector('.auth-tabs')?.classList.remove('hidden');
      byId('recovery-status').textContent = '';
      setFieldError(recoveryForm, 'correo', '');
    });
    recoveryForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const emailInput = recoveryForm.elements.namedItem('correo');
      const correo = emailInput.value.trim().toLowerCase();
      const status = byId('recovery-status');
      status.textContent = '';
      setFieldError(recoveryForm, 'correo', '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo) || correo.length > 160) {
        setFieldError(recoveryForm, 'correo', 'Ingresa un correo válido.');
        status.textContent = 'Revisa el correo electrónico.';
        emailInput.focus();
        return;
      }
      const submit = byId('recovery-submit');
      submit.disabled = true;
      status.textContent = 'Procesando solicitud...';
      try {
        const result = await api('/api/auth/recuperar', { method: 'POST', body: JSON.stringify({ correo }) });
        status.textContent = result.mensaje || 'Si existe una cuenta con ese correo, recibirás instrucciones.';
      } catch (error) {
        status.textContent = error.message || 'No pudimos procesar la solicitud.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  function setupAccountPage() {
    setupAccountTabs();
    setupRecovery();
    const form = byId('account-form');
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const nameInput = form.elements.namedItem('nombre');
      const emailInput = form.elements.namedItem('correo');
      const passwordInput = form.elements.namedItem('password');
      const nombre = nameInput.value.trim();
      const correo = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const status = byId('account-status');
      status.textContent = '';
      form.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
      form.querySelectorAll('input').forEach(input => input.classList.remove('invalid'));
      let valid = true;
      if (state.accountMode === 'register' && (nombre.length < 2 || nombre.length > 120)) {
        setFieldError(form, 'nombre', 'Escribe tu nombre completo.');
        valid = false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo) || correo.length > 160) {
        setFieldError(form, 'correo', 'Ingresa un correo válido.');
        valid = false;
      }
      if (password.length < 10 || password.length > 128) {
        setFieldError(form, 'password', 'Usa una contraseña de 10 a 128 caracteres.');
        valid = false;
      }
      if (!valid) {
        status.textContent = 'Revisa los campos marcados.';
        return;
      }
      const endpoint = state.accountMode === 'register' ? '/api/auth/registro' : '/api/auth/login';
      const submit = byId('account-submit');
      submit.disabled = true;
      status.textContent = 'Verificando tu cuenta...';
      try {
        const result = await api(endpoint, {
          method: 'POST',
          body: JSON.stringify({ nombre, correo, password })
        });
        state.user = result.usuario;
        await loadCart();
        updateHeader();
        const returnPath = safeReturnPath();
        if (returnPath) {
          window.location.assign(returnPath);
          return;
        }
        form.reset();
        await showProfile();
      } catch (error) {
        status.textContent = error.message || 'No pudimos verificar tu cuenta.';
      } finally {
        submit.disabled = false;
      }
    });
    byId('logout-button')?.addEventListener('click', async () => {
      const button = byId('logout-button');
      button.disabled = true;
      try {
        await api('/api/auth/logout', { method: 'POST' });
        window.location.assign('/cuenta.html');
      } catch (error) {
        showToast(error.message || 'No pudimos cerrar la sesión.');
      } finally {
        button.disabled = false;
      }
    });
  }

  function digitsOnlyField(form, name, maxLength) {
    const input = form.elements.namedItem(name);
    const allowedKeys = new Set(['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter']);
    input.addEventListener('keydown', event => {
      if (allowedKeys.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length === 1 && !/^\d$/.test(event.key)) event.preventDefault();
    });
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, maxLength);
      setFieldError(form, name, '');
    });
    input.addEventListener('paste', event => {
      event.preventDefault();
      const pasted = event.clipboardData?.getData('text') || '';
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const next = `${input.value.slice(0, start)}${pasted.replace(/\D/g, '')}${input.value.slice(end)}`.slice(0, maxLength);
      input.value = next;
      input.setSelectionRange(next.length, next.length);
      setFieldError(form, name, '');
    });
  }

  function setupExpiryField(form) {
    const input = form.elements.namedItem('f_exp_date');
    const allowedKeys = new Set(['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', '/']);
    input.addEventListener('keydown', event => {
      if (allowedKeys.has(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length === 1 && !/^\d$/.test(event.key)) event.preventDefault();
    });
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').slice(0, 4);
      input.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      setFieldError(form, 'f_exp_date', '');
    });
    input.addEventListener('paste', event => {
      event.preventDefault();
      const digits = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      input.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      setFieldError(form, 'f_exp_date', '');
    });
  }

  function setupHolderField(form) {
    const input = form.elements.namedItem('titular');
    input.addEventListener('keydown', event => {
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length === 1 && !/^[\p{L} .'-]$/u.test(event.key)) event.preventDefault();
    });
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^\p{L} .'-]/gu, '').slice(0, 80);
      setFieldError(form, 'titular', '');
    });
  }

  function validateCheckout(form) {
    const value = name => form.elements.namedItem(name).value.trim();
    const cleanedValue = value('f_doc_num').replace(/\s|-/g, '');
    const isValidCard = /^\d{16}$/.test(cleanedValue);
    const errors = {
      cedula: /^\d{6,15}$/.test(value('cedula')) ? '' : 'Ingresa de 6 a 15 dígitos.',
      telefono: /^\d{7,15}$/.test(value('telefono')) ? '' : 'Ingresa de 7 a 15 dígitos.',
      direccion: value('direccion').length >= 5 && value('direccion').length <= 220 ? '' : 'Ingresa una dirección de entrega válida.',
      titular: value('titular').length >= 2 && value('titular').length <= 80 && /^[\p{L}][\p{L} .'-]*$/u.test(value('titular')) ? '' : 'Ingresa un nombre de titular válido.',
      f_doc_num: isValidCard ? '' : 'Ingresa 16 dígitos.',
      f_exp_date: value('f_exp_date') ? '' : 'Fecha requerida.',
      f_sec_code: /^\d{3,4}$/.test(value('f_sec_code')) ? '' : 'Ingresa un código de 3 o 4 dígitos.'
    };
    let valid = true;
    for (const [name, message] of Object.entries(errors)) {
      setFieldError(form, name, message);
      if (message) valid = false;
    }
    return valid;
  }

  function renderCheckoutSummary() {
    const summary = byId('checkout-summary');
    if (!summary) return;
    if (!state.cart.length) {
      summary.innerHTML = '<div class="empty-state"><strong>Tu carrito está vacío</strong><p>Agrega un producto antes de continuar con el pago.</p><a class="button button-primary" href="/productos.html">Ver productos</a></div>';
      byId('checkout-form').classList.add('checkout-empty');
      return;
    }
    byId('checkout-form').classList.remove('checkout-empty');
    summary.innerHTML = state.cart.map(item =>
      `<div class="checkout-summary-row"><span>${escapeHTML(item.nombre)} × ${Number(item.cantidad_carrito)}</span><strong>${currency.format(productPrice(item) * Number(item.cantidad_carrito))}</strong></div>`
    ).join('');
    const total = currency.format(cartTotal());
    byId('checkout-total').textContent = total;
    byId('pay-button').textContent = `Pagar ${total}`;
  }

  function setupCheckoutPage() {
    const form = byId('checkout-form');
    if (!form) return;
    let paymentCompleted = false;
    form.elements.namedItem('nombre').value = state.user.nombre;
    form.elements.namedItem('correo').value = state.user.correo;
    digitsOnlyField(form, 'cedula', 15);
    digitsOnlyField(form, 'telefono', 15);
    digitsOnlyField(form, 'f_doc_num', 16);
    digitsOnlyField(form, 'f_sec_code', 4);
    setupExpiryField(form);
    setupHolderField(form);
    form.addEventListener('input', event => {
      if (event.target.name) setFieldError(form, event.target.name, '');
      if (!form.querySelector('.invalid')) {
        byId('form-status').textContent = '';
        byId('form-status').classList.remove('form-status-error');
      }
    });
    renderCheckoutSummary();
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (paymentCompleted) return;
      const status = byId('form-status');
      status.textContent = '';
      status.classList.remove('form-status-error');
      if (!state.cart.length) {
        status.textContent = 'Tu carrito está vacío.';
        status.classList.add('form-status-error');
        return;
      }
      if (!validateCheckout(form)) {
        status.textContent = 'Por favor corrige los campos marcados en rojo para continuar';
        status.classList.add('form-status-error');
        form.querySelector('.invalid')?.focus();
        return;
      }
      const submit = byId('pay-button');
      const amountDue = currency.format(cartTotal());
      submit.disabled = true;
      paymentCompleted = true;
      state.cart = [];
      updateHeader();
      const checkoutSuccess = byId('checkout-success');
      checkoutSuccess.textContent = 'Pago realizado con éxito';
      checkoutSuccess.classList.remove('hidden');
      byId('success-message').textContent = 'Tu pedido ha sido registrado y procesado correctamente.';
      byId('success-order').innerHTML = `<strong>${amountDue}</strong>`;
      const success = byId('success-dialog');
      if (success?.showModal) success.showModal();
      submit.textContent = 'Pago registrado';
    });
    byId('success-close')?.addEventListener('click', () => window.location.assign('/cuenta.html'));
    byId('success-dialog')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
  }

  async function initialize() {
    setupNavigation();
    setupAccountPage();
    const privateStatus = byId('private-status');
    if (privateStatus) privateStatus.textContent = 'Comprobando tu sesión...';
    let userResult;
    try {
      userResult = await api('/api/auth/me');
    } catch (error) {
      if (privateStatus) privateStatus.textContent = 'No pudimos comprobar tu sesión. Actualiza la página cuando el servidor esté disponible.';
      console.error('No se pudo comprobar la sesión:', error);
      return;
    }
    state.user = userResult.usuario;
    if (document.body.dataset.private === 'true' && !state.user) {
      redirectToAccount(currentReturnPath());
      return;
    }
    if (privateStatus) privateStatus.classList.add('hidden');

    if (state.user) {
      try {
        state.cart = await api('/api/carrito');
      } catch (error) {
        console.error('No se pudo cargar el carrito:', error);
        showToast(error.message || 'No pudimos cargar el carrito.');
      }
    }
    updateHeader();

    if (page === 'cuenta') {
      if (state.user) await showProfile();
      else {
        byId('account-status').textContent = '';
        const returnPath = safeReturnPath();
        if (returnPath) byId('account-status').textContent = 'Inicia sesión para continuar a la página solicitada.';
      }
    }
    if (page === 'productos' || page === 'detalle') {
      try {
        await loadProducts();
        if (state.user) await loadFavorites();
        if (page === 'productos') setupProductsPage();
        else await setupDetailPage();
      } catch (error) {
        console.error('No se pudo cargar el catálogo:', error);
        const grid = byId('product-grid') || byId('product-detail');
        if (grid) grid.innerHTML = `<div class="empty-state"><strong>No pudimos cargar el catálogo</strong><p>${escapeHTML(error.message)}</p><button class="button button-primary" id="retry-products" type="button">Reintentar</button></div>`;
        byId('retry-products')?.addEventListener('click', () => window.location.reload());
      }
    }
    if (page === 'favoritos') {
      try {
        state.favorites = await loadFavorites();
        setupFavoritesPage();
      } catch (error) {
        console.error('No se pudieron cargar los favoritos:', error);
        renderProductGrid(byId('favorites-grid'), [], 'No pudimos cargar tus favoritos', error.message);
      }
    }
    if (page === 'carrito') {
      try {
        await loadCart();
        setupCartPage();
      } catch (error) {
        console.error('No se pudo cargar el carrito:', error);
        const lines = byId('cart-lines');
        if (lines) lines.innerHTML = `<div class="empty-state"><strong>No pudimos cargar el carrito</strong><p>${escapeHTML(error.message)}</p></div>`;
      }
    }
    if (page === 'checkout') {
      try {
        await loadCart();
        setupCheckoutPage();
      } catch (error) {
        console.error('No se pudo preparar el checkout:', error);
        byId('private-status').textContent = `No pudimos cargar el checkout: ${error.message}`;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
