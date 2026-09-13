/* ============================================================
   Meu Patrimônio — HOME redesign (interações)
   ============================================================ */
const qs  = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Header: sólido ao rolar + esconde ao descer / aparece ao subir ---------- */
const header = qs('[data-header]');
let lastY = 0, ticking = false;
const frame = () => {
  ticking = false;
  const y = window.scrollY;
  // sólido ao sair do topo
  header.classList.toggle('is-scrolled', y > 24);
  // esconde ao descer (passando de 300px), reaparece ao subir
  const down = y > lastY && y > 300;
  header.classList.toggle('is-hidden', down);
  lastY = y;
};
const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
frame();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- Menu mobile ---------- */
const toggle = qs('[data-menu-toggle]');
const menu   = qs('[data-mobile-menu]');
const closeMenu = () => {
  toggle.setAttribute('aria-expanded', 'false');
  menu.classList.remove('is-open');
  document.body.classList.remove('menu-open');
};
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
});
qsa('a[href]', menu).forEach(a => a.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMenu(); });

/* ---------- Reveal on scroll ---------- */
const reveals = qsa('.reveal');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px' });
  reveals.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 3, 2) * 80}ms`;
    io.observe(el);
  });
} else {
  reveals.forEach(el => el.classList.add('is-visible'));
}

/* ---------- Contadores animados ---------- */
const counters = qsa('[data-count]');
const formatBR = n => n.toLocaleString('pt-BR');
const animateCount = (el) => {
  const target = Number(el.dataset.count);
  if (!target) { return; }
  const dur = 1400;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = formatBR(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = formatBR(target);
  };
  requestAnimationFrame(tick);
};
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const co = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCount(entry.target);
      co.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  counters.forEach(el => co.observe(el));
}

/* ---------- Abas de produto (Ecossistema) ---------- */
const productTabs = qsa('[data-product]');
const productPanels = qsa('[data-panel]');
const activateProduct = (name, scope) => {
  const tabs = scope ? qsa('[data-product]', scope) : productTabs;
  const panels = scope ? qsa('[data-panel]', scope) : productPanels;
  tabs.forEach(tab => {
    const active = tab.dataset.product === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach(panel => {
    panel.hidden = panel.dataset.panel !== name;
    panel.classList.toggle('is-active', panel.dataset.panel === name);
  });
};
qsa('[role="tablist"]').forEach(list => {
  const scope = list.closest('section');
  const tabs = qsa('[data-product]', scope || document);
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activateProduct(tab.dataset.product, scope));
    tab.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
      const next = (i + dir + tabs.length) % tabs.length;
      activateProduct(tabs[next].dataset.product, scope);
      tabs[next].focus();
    });
  });
});

/* ---------- Player de vídeo (poster -> iframe YouTube) ---------- */
qsa('.video-poster').forEach(btn => {
  btn.addEventListener('click', () => {
    const src = btn.dataset.videoSrc;
    const title = btn.dataset.videoTitle || 'Vídeo';
    if (!src) return;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    const frame = btn.closest('.video-frame');
    if (frame) { frame.innerHTML = ''; frame.appendChild(iframe); }
  });
});

/* ---------- Mapa "Onde estamos" (Brasil interativo) ---------- */
(() => {
  const host = qs('[data-br-map]');
  if (!host) return;

  // Centroides (viewBox 0 0 1000 912) — computados dos paths
  const CENT = {
    RS:[473,770],RR:[291,96],PA:[511,176],AC:[109,343],AP:[480,119],MS:[420,563],
    PR:[518,670],SC:[518,719],AM:[235,208],RO:[258,363],MT:[419,423],MA:[628,231],
    PI:[671,298],CE:[739,257],RN:[801,267],PB:[791,295],PE:[772,313],AL:[798,339],
    SE:[781,365],BA:[699,403],ES:[717,550],RJ:[663,610],SP:[577,620],GO:[549,468],
    DF:[574,470],MG:[637,531],TO:[566,350]
  };
  const NAME = {
    RS:'Rio Grande do Sul',RR:'Roraima',PA:'Pará',AC:'Acre',AP:'Amapá',MS:'Mato Grosso do Sul',
    PR:'Paraná',SC:'Santa Catarina',AM:'Amazonas',RO:'Rondônia',MT:'Mato Grosso',MA:'Maranhão',
    PI:'Piauí',CE:'Ceará',RN:'Rio Grande do Norte',PB:'Paraíba',PE:'Pernambuco',AL:'Alagoas',
    SE:'Sergipe',BA:'Bahia',ES:'Espírito Santo',RJ:'Rio de Janeiro',SP:'São Paulo',GO:'Goiás',
    DF:'Distrito Federal',MG:'Minas Gerais',TO:'Tocantins'
  };

  // DADOS OFICIAIS — escritórios parceiros (SEDE + 6 parceiros)
  // Coordenadas em cidade real (viewBox 0 0 1000 912)
  const SEDE = { label: 'MEU PATRIMÔNIO · Vitória, ES', uf: 'ES', xy: [727.7, 571.7] };
  const ESCRITORIOS = [
    { label: 'MEU PATRIMÔNIO · Santos, SP', uf: 'SP', xy: [608.6, 648.9] },
    { label: 'HC Educação Financeira · Curitiba, PR', uf: 'PR', xy: [550.0, 680.0] },
    { label: 'Rating A Consultoria · Belo Horizonte, MG', uf: 'MG', xy: [655.2, 562.4] },
    { label: 'Ellevate Assessoria · Vila Velha, ES', uf: 'ES', xy: [732.8, 578.0] },
    { label: 'Trivero Consultoria · Chapecó, SC', uf: 'SC', xy: [483.2, 715.3] },
    { label: 'Maldi Advisors · São Paulo, SP', uf: 'SP', xy: [598.0, 634.0] }
  ];
  // Consultores independentes plugados à Rede (cidade real)
  const CONSULTORES = [
    { label: 'Consultor · Vitória, ES', uf: 'ES', xy: [727.7, 571.7] },
    { label: 'Consultor · Serra, ES', uf: 'ES', xy: [728.3, 567.6] },
    { label: 'Consultor · Curitiba, PR', uf: 'PR', xy: [550.0, 680.0] },
    { label: 'Consultor · Macapá, AP', uf: 'AP', xy: [504.4, 131.4] },
    { label: 'Consultor · Almirante Tamandaré, PR', uf: 'PR', xy: [549.1, 677.6] },
    { label: 'Consultor · Manaus, AM', uf: 'AM', xy: [325.5, 197.5] },
    { label: 'Consultor · Belo Horizonte, MG', uf: 'MG', xy: [655.2, 562.4] },
    { label: 'Consultor · Goiânia, GO', uf: 'GO', xy: [547.0, 491.8] },
    { label: 'Consultor · Campo Grande, MS', uf: 'MS', xy: [440.5, 572.1] },
    { label: 'Consultor · Vila Velha, ES', uf: 'ES', xy: [728.8, 571.9] },
    { label: 'Consultor · São Paulo, SP', uf: 'SP', xy: [602.4, 640.0] },
    { label: 'Consultor · Chapecó, SC', uf: 'SC', xy: [483.2, 715.3] },
    { label: 'Consultor · Porto Velho, RO', uf: 'RO', xy: [249.5, 318.2] },
    { label: 'Consultor · Farroupilha, RS', uf: 'RS', xy: [509.5, 761.2] },
    { label: 'Consultor · Brasília, DF', uf: 'DF', xy: [574.4, 472.7] },
    { label: 'Consultor · Rio de Janeiro, RJ', uf: 'RJ', xy: [671.8, 626.9] },
    { label: 'Consultor · Santa Maria, RS', uf: 'RS', xy: [460.2, 770.6] },
    { label: 'Consultor · Santos, SP', uf: 'SP', xy: [608.6, 648.9] },
    { label: 'Consultor · Vitória da Conquista, BA', uf: 'BA', xy: [715.7, 453.8] }
  ];
  const ATIVOS = new Set([SEDE.uf, ...ESCRITORIOS.map(e => e.uf), ...CONSULTORES.map(c => c.uf)]);

  fetch('assets/br-map.svg').then(r => r.text()).then(txt => {
    host.innerHTML = txt;
    const svg = host.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('.uf').forEach(p => {
      const uf = p.dataset.uf;
      if (ATIVOS.has(uf)) p.classList.add('on');
    });

    // camada de marcadores (mesmo viewBox)
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'reach-markers');
    const tip = qs('[data-map-tip]');

    // CONSULTORES: bolinhas pequenas (cidade real) — camada de baixo
    CONSULTORES.forEach(o => {
      const m = document.createElementNS(NS, 'circle');
      m.setAttribute('cx', o.xy[0]); m.setAttribute('cy', o.xy[1]);
      m.setAttribute('r', 4);
      m.setAttribute('class', 'mk mk-con');
      m.dataset.label = o.label;
      g.appendChild(m);
    });

    // ESCRITÓRIOS: triângulos pequenos
    ESCRITORIOS.forEach(o => {
      const [x, y] = o.xy, s = 9; // lado
      const tri = document.createElementNS(NS, 'polygon');
      tri.setAttribute('points', `${x},${y - s * 0.62} ${x - s * 0.55},${y + s * 0.38} ${x + s * 0.55},${y + s * 0.38}`);
      tri.setAttribute('class', 'mk mk-esc');
      tri.dataset.label = o.label;
      g.appendChild(tri);
    });

    // SEDE: círculo com pulso — camada de cima
    const sede = document.createElementNS(NS, 'circle');
    sede.setAttribute('cx', SEDE.xy[0]); sede.setAttribute('cy', SEDE.xy[1]);
    sede.setAttribute('r', 8);
    sede.setAttribute('class', 'mk mk-sede');
    sede.dataset.label = SEDE.label;
    g.appendChild(sede);
    svg.appendChild(g);

    // tooltip: estados + marcadores
    const showTip = (e, text) => {
      if (!tip) return;
      tip.textContent = text; tip.hidden = false;
      const r = host.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left) + 'px';
      tip.style.top  = (e.clientY - r.top)  + 'px';
    };
    const hideTip = () => { if (tip) tip.hidden = true; };

    svg.querySelectorAll('.uf.on').forEach(p => {
      p.addEventListener('mousemove', e => showTip(e, NAME[p.dataset.uf]));
      p.addEventListener('mouseleave', hideTip);
    });
    g.querySelectorAll('.mk').forEach(m => {
      m.addEventListener('mousemove', e => { e.stopPropagation(); showTip(e, m.dataset.label); });
      m.addEventListener('mouseleave', hideTip);
    });
  }).catch(() => { host.innerHTML = '<p style="text-align:center;color:var(--slate)">Mapa indisponível.</p>'; });
})();

/* ---------- Depoimento em vídeo (poster -> iframe YouTube Short) ---------- */
qsa('.tv-player').forEach(player => {
  const btn = player.querySelector('.tv-play');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const id = player.dataset.video;
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = 'Depoimento em vídeo';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    player.innerHTML = '';
    player.appendChild(iframe);
  });
});

/* ---------- FAQ accordion ---------- */
qsa('.faq-q').forEach(btn => {
  const answer = btn.nextElementSibling;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    qsa('.faq-q').forEach(other => {
      if (other !== btn) {
        other.setAttribute('aria-expanded', 'false');
        other.nextElementSibling.style.maxHeight = null;
      }
    });
    btn.setAttribute('aria-expanded', String(!open));
    answer.style.maxHeight = open ? null : answer.scrollHeight + 'px';
  });
});


/* ---------- Carrosséis (auto-scroll contínuo + setas + arrasto) ----------
   A faixa rola sozinha o tempo todo. O usuário pode, a qualquer momento:
   - clicar nas setas para avançar/voltar uma "página" de cards
   - arrastar com o mouse ou o dedo
   - rolar com o trackpad
   Depois de interagir, o movimento automático volta sozinho em 2,5s.

   Detalhes que importam:
   - scrollLeft arredonda para inteiro, então o avanço é acumulado num
     float (`pos`) e só depois aplicado; sem isso 0.4px/frame vira zero.
   - o CSS usa scroll-behavior:auto (smooth cancelaria o passo a cada frame);
     a rolagem suave das setas é feita pontualmente via scrollTo.
   - o conteúdo está duplicado no HTML, então o loop é feito voltando meia
     largura quando passa da metade (e vice-versa), sem salto visível. */
qsa('[data-carousel]').forEach(viewport => {
  const track = viewport.firstElementChild;
  if (!track) return;

  const name   = viewport.getAttribute('data-carousel');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED  = 0.35;   // px por frame (~21px/s a 60fps)
  const RESUME = 2500;   // ms até o automático voltar

  let paused = reduce;
  let pos    = 0;        // posição em float, espelha o scrollLeft
  let idleTimer = null;
  let smoothing = false; // true enquanto uma seta anima

  const half = () => track.scrollWidth / 2;

  // mantém a posição dentro da primeira cópia (loop infinito)
  function wrap() {
    const h = half();
    if (h <= 0) return;
    if (pos >= h)      { pos -= h; viewport.scrollLeft = pos; }
    else if (pos < 0)  { pos += h; viewport.scrollLeft = pos; }
  }

  function tick() {
    if (!paused && !smoothing) {
      pos += SPEED;
      wrap();
      viewport.scrollLeft = pos;
    }
    requestAnimationFrame(tick);
  }

  function hold(resume = true) {
    paused = true;
    clearTimeout(idleTimer);
    if (resume && !reduce) idleTimer = setTimeout(() => { paused = false; }, RESUME);
  }

  // ---- setas: uma "página" por clique, com rolagem suave ----
  const step = () => Math.max(240, viewport.clientWidth * 0.8);

  function go(dir) {
    hold();
    const h = half();
    let target = pos + dir * step();

    // reposiciona ANTES de animar, para nunca travar nas pontas
    if (target < 0)      { pos += h; viewport.scrollLeft = pos; target += h; }
    else if (target > h) { pos -= h; viewport.scrollLeft = pos; target -= h; }

    smoothing = true;
    viewport.scrollTo({ left: target, behavior: 'smooth' });

    // devolve o controle ao loop quando a animação termina
    clearTimeout(go._t);
    go._t = setTimeout(() => {
      pos = viewport.scrollLeft;
      smoothing = false;
    }, 420);
  }

  const prev = qs(`[data-carousel-prev="${name}"]`);
  const next = qs(`[data-carousel-next="${name}"]`);
  if (prev) prev.addEventListener('click', () => go(-1));
  if (next) next.addEventListener('click', () => go(1));

  // ---- pausa ao passar o mouse / navegar por teclado ----
  viewport.addEventListener('mouseenter', () => hold(false));
  viewport.addEventListener('mouseleave', () => { if (!reduce) paused = false; });
  viewport.addEventListener('focusin',    () => hold(false));
  viewport.addEventListener('focusout',   () => { if (!reduce) paused = false; });

  // ---- rolagem manual (trackpad, touch) ----
  viewport.addEventListener('wheel', () => { pos = viewport.scrollLeft; hold(); }, { passive: true });
  viewport.addEventListener('touchstart', () => hold(), { passive: true });
  viewport.addEventListener('touchmove',  () => { pos = viewport.scrollLeft; }, { passive: true });

  // ---- arrastar com o mouse ----
  let dragging = false, startX = 0, startLeft = 0, moved = 0;

  viewport.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; moved = 0;
    startX = e.clientX; startLeft = viewport.scrollLeft;
    smoothing = false;
    hold(false);
  });

  viewport.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.abs(dx);
    if (moved > 4 && viewport.setPointerCapture) {
      try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    }
    pos = startLeft - dx;
    wrap();
    viewport.scrollLeft = pos;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    pos = viewport.scrollLeft;
    hold();
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  // um arrasto não deve abrir o link do card
  track.addEventListener('click', e => {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    moved = 0;
  }, true);

  // arranca o loop
  requestAnimationFrame(() => {
    pos = viewport.scrollLeft = 1;
    tick();   // roda sempre; `paused` decide se avança (respeita reduced-motion)
  });
});
