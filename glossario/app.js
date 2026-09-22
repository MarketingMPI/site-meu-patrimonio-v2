/* Meu Patrimônio — Glossário Financeiro */
(() => {
  'use strict';

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Header sólido e navegação mobile */
  const header = qs('[data-header]');
  const menuToggle = qs('[data-menu-toggle]');
  const mobileMenu = qs('[data-mobile-menu]');

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const closeMenu = () => {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    mobileMenu?.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  });

  qsa('a[href]', mobileMenu || document.createElement('nav')).forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  /* Acordeões dos 187 termos */
  const animations = new WeakMap();

  const setItemOpen = (item, open, animate = true) => {
    const button = qs('.glo-q', item);
    const panel = qs('.glo-a', item);
    if (!button || !panel) return;

    animations.get(panel)?.cancel();
    panel.getAnimations?.().forEach(animation => animation.cancel());
    panel.style.height = '';
    panel.style.opacity = '';

    button.setAttribute('aria-expanded', String(open));
    item.classList.toggle('is-open', open);

    const shouldAnimate = animate && !reduceMotion.matches && typeof panel.animate === 'function';

    if (open) {
      panel.hidden = false;
      if (!shouldAnimate) return;

      const targetHeight = panel.scrollHeight;
      const animation = panel.animate(
        [
          { height: '0px', opacity: 0 },
          { height: `${targetHeight}px`, opacity: 1 }
        ],
        { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' }
      );
      animations.set(panel, animation);
      animation.onfinish = () => {
        panel.style.height = '';
        panel.style.opacity = '';
        animations.delete(panel);
      };
    } else {
      if (!shouldAnimate) {
        panel.hidden = true;
        return;
      }

      const startHeight = panel.scrollHeight;
      const animation = panel.animate(
        [
          { height: `${startHeight}px`, opacity: 1 },
          { height: '0px', opacity: 0 }
        ],
        { duration: 210, easing: 'cubic-bezier(.4,0,.2,1)' }
      );
      animations.set(panel, animation);
      animation.onfinish = () => {
        panel.hidden = true;
        panel.style.height = '';
        panel.style.opacity = '';
        animations.delete(panel);
      };
    }
  };

  qsa('.glo-q').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.glo-item');
      if (!item) return;
      const open = button.getAttribute('aria-expanded') !== 'true';
      setItemOpen(item, open);
    });
  });

  /* Links diretos para um termo abrem a definição correspondente. */
  const openHashTarget = () => {
    const rawHash = window.location.hash.slice(1);
    if (!rawHash) return;
    let id;
    try {
      id = decodeURIComponent(rawHash);
    } catch {
      id = rawHash;
    }
    const target = document.getElementById(id);
    if (target?.classList.contains('glo-item')) setItemOpen(target, true, false);
  };

  openHashTarget();
  window.addEventListener('hashchange', openHashTarget);
})();
