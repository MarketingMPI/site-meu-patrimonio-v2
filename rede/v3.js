const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const header = qs('[data-header]');
const menuToggle = qs('[data-menu-toggle]');
const mobileMenu = qs('[data-mobile-menu]');

const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, {passive: true});

const closeMenu = () => {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  mobileMenu.hidden = true;
  header.classList.remove('is-open');
  document.body.classList.remove('menu-open');
};

menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  mobileMenu.hidden = !open;
  header.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
});

qsa('a[href^="#"]', mobileMenu).forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => {
  if (window.innerWidth > 1100) closeMenu();
});

const revealItems = qsa('.reveal');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {threshold: 0.12, rootMargin: '0px 0px -50px'});
  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 3, 2) * 70}ms`;
    observer.observe(item);
  });
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

// O gráfico da CVM desenha as barras quando entra em tela. Mesmo fallback do
// .reveal: sem IntersectionObserver ou com redução de movimento, já nasce pronto.
const cvmChart = qs('[data-cvm-chart]');
if (cvmChart) {
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const chartObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        chartObserver.unobserve(entry.target);
      });
    }, {threshold: 0.25});
    chartObserver.observe(cvmChart);
  } else {
    cvmChart.classList.add('is-drawn');
  }

  // No mobile o plot é mais largo que a tela e o scroller nasce no início — o
  // usuário via só "Até 2017 → 2021", a parte plana da série, e a curva de
  // crescimento (2.288 em 2026), que é o argumento da dobra, ficava escondida
  // atrás de um arraste que quase ninguém faz. Abre no fim, onde está a mensagem;
  // o histórico continua a um arraste de distância, para trás.
  const cvmScroll = qs('.cvm-scroll');
  if (cvmScroll) {
    const abrirNoFim = () => {
      const excedente = cvmScroll.scrollWidth - cvmScroll.clientWidth;
      if (excedente > 8 && cvmScroll.scrollLeft === 0) cvmScroll.scrollLeft = excedente;
    };
    abrirNoFim();
    window.addEventListener('load', abrirNoFim, {once: true});
  }
}

// Um vídeo por vez na página: dar play em qualquer um pausa os outros. Vale também
// para quem abre um filme e depois outro sem trocar de aba.
const todosOsVideos = qsa('video');
todosOsVideos.forEach(video => video.addEventListener('play', () => {
  todosOsVideos.forEach(outro => { if (outro !== video && !outro.paused) outro.pause(); });
}));

qsa('[data-video-id]').forEach(button => button.addEventListener('click', () => {
  const iframe = document.createElement('iframe');
  iframe.src = button.dataset.videoSrc;
  iframe.title = button.dataset.videoTitle;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  button.replaceWith(iframe);
}));

const mpParallax = qs('[data-mp-parallax-logos]');
const mpStage = qs('[data-mp-stage]', mpParallax);
const mpField = qs('[data-mp-field]', mpParallax);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (mpParallax && mpStage && mpField && !reducedMotion.matches) {
  let parallaxFrame = 0;
  const updateParallax = () => {
    parallaxFrame = 0;
    const rect = mpParallax.getBoundingClientRect();
    const viewport = window.innerHeight;
    const centerDistance = Math.abs(rect.top + rect.height / 2 - viewport / 2);
    const range = viewport / 2 + rect.height / 2;
    const progress = Math.max(0, Math.min(1, 1 - centerDistance / range));
    const eased = 1 - Math.pow(1 - progress, 3);
    mpStage.style.setProperty('--p', eased.toFixed(4));
  };
  const requestParallaxUpdate = () => {
    if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
  };

  mpStage.addEventListener('pointermove', event => {
    const rect = mpStage.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const my = ((event.clientY - rect.top) / rect.height - .5) * 2;
    mpField.style.setProperty('--mx', Math.max(-1, Math.min(1, mx)).toFixed(3));
    mpField.style.setProperty('--my', Math.max(-1, Math.min(1, my)).toFixed(3));
  });
  mpStage.addEventListener('pointerleave', () => {
    mpField.style.setProperty('--mx', '0');
    mpField.style.setProperty('--my', '0');
  });
  window.addEventListener('scroll', requestParallaxUpdate, {passive: true});
  window.addEventListener('resize', requestParallaxUpdate);
  updateParallax();
}

const productTabs = qsa('[data-product]');
const productPanels = qsa('[data-panel]');

const activateProduct = product => {
  productTabs.forEach(tab => {
    const active = tab.dataset.product === product;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  productPanels.forEach(panel => {
    const active = panel.dataset.panel === product;
    // ⚠️ `hidden` NÃO pausa vídeo: o painel sai da tela e o áudio continua tocando.
    // Trocar de aba com um filme rodando deixava dois áudios somados.
    if (!active) qsa('video', panel).forEach(video => video.pause());
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });
};

productTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateProduct(tab.dataset.product));
  tab.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    const next = (index + direction + productTabs.length) % productTabs.length;
    activateProduct(productTabs[next].dataset.product);
    productTabs[next].focus();
  });
});

const modelOptions = qsa('[data-model]');
const formModelButtons = qsa('[data-form-model]');
const modelInput = qs('[data-model-input]');
const mobileModel = qs('[data-mobile-model]');
const formEyebrow = qs('[data-form-eyebrow]');
const formTitle = qs('[data-form-title]');
const formCopy = qs('[data-form-copy]');
const officeField = qs('[data-office-field]');
let selectedModel = 'consultor';

const modelContent = {
  // Escritório Parceiro não é candidatura: é uma reunião de alinhamento entre
  // operações. Nenhum texto desse fluxo pode usar a palavra "candidatura".
  consultor: {
    label: 'Consultor',
    eyebrow: 'Candidatura · Consultor',
    title: 'Pra quem deseja seguir carreira em um escritório da Rede Meu Patrimônio.',
    copy: 'A próxima conversa é com o time de expansão.',
    submit: 'Enviar candidatura',
    successTitle: 'Candidatura recebida.',
    successCopy: 'O time de expansão da Rede Meu Patrimônio entrará em contato para os próximos passos.'
  },
  escritorio: {
    label: 'Escritório Parceiro',
    eyebrow: 'Conversa · Escritório Parceiro',
    title: 'Pra quem deseja empreender e abrir um escritório próprio.',
    copy: 'A próxima conversa é com o time de expansão.',
    submit: 'Enviar contato',
    successTitle: 'Contato enviado.',
    successCopy: 'O time de expansão da Rede Meu Patrimônio vai te chamar para agendar uma reunião de alinhamento.'
  }
};

const selectModel = (model, scroll = false) => {
  if (!modelContent[model]) return;
  selectedModel = model;
  modelInput.value = model;

  modelOptions.forEach(option => {
    const active = option.dataset.model === model;
    option.classList.toggle('is-selected', active);
    option.setAttribute('aria-checked', String(active));
    const action = qs('.model-action', option);
    if (action) action.innerHTML = active ? 'Selecionado <i aria-hidden="true">✓</i>' : 'Selecionar <i aria-hidden="true">→</i>';
  });

  formModelButtons.forEach(button => {
    const active = button.dataset.formModel === model;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const content = modelContent[model];
  mobileModel.textContent = content.label;
  formEyebrow.textContent = content.eyebrow;
  formTitle.textContent = content.title;
  formCopy.textContent = content.copy;

  // Consultado na hora para não depender da ordem de declaração no módulo.
  const submitButton = qs('[data-submit]');
  const successTitle = qs('[data-success-title]');
  const successCopy = qs('[data-success-copy]');
  if (submitButton) submitButton.textContent = content.submit;
  if (successTitle) successTitle.textContent = content.successTitle;
  if (successCopy) successCopy.textContent = content.successCopy;

  if (officeField) {
    officeField.hidden = model !== 'escritorio';
    officeField.querySelector('input').required = model === 'escritorio';
  }

  if (scroll) qs('#candidatura')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
};

modelOptions.forEach(option => option.addEventListener('click', () => selectModel(option.dataset.model, true)));
formModelButtons.forEach(button => button.addEventListener('click', () => selectModel(button.dataset.formModel)));
// Atalhos da seção Plug and play: pré-selecionam o modelo antes de rolar até o
// formulário. Atributo próprio porque [data-model] já é consumido pelo radiogroup.
qsa('[data-jump-model]').forEach(button => button.addEventListener('click', () => selectModel(button.dataset.jumpModel, true)));

const form = qs('[data-application-form]');
const steps = qsa('[data-step]', form);
const stepLabel = qs('[data-step-label]', form);
const stepPips = qsa('.form-header i', form);
const success = qs('[data-form-success]', form);
const marketRole = qs('[data-market-role]', form);
const marketRoleSelect = qs('[name="tipo_atuacao"]', form);
const certificationInputs = qsa('[name="certificacoes"]', form);
const submissionId = qs('[data-submission-id]', form);
let currentStep = 1;

// O prefixo "rede-mp-" é obrigatório: a API valida /^rede-mp-[a-z0-9-]+$/i.
// crypto.randomUUID() devolve o UUID puro, então o prefixo tem que ser aplicado
// por fora, senão todo envio volta 400 nos browsers que têm a API nativa.
const randomSuffix = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
if (submissionId) submissionId.value = `rede-mp-${randomSuffix()}`;

const visibleError = () => qs(`[data-step="${currentStep}"] [data-form-error]`, form);
const clearErrors = () => qsa('[data-form-error]', form).forEach(error => {
  error.hidden = true;
  error.textContent = '';
});
const showError = message => {
  const error = visibleError();
  error.textContent = message;
  error.hidden = false;
  error.focus?.();
};

const showStep = step => {
  currentStep = step;
  clearErrors();
  steps.forEach(element => element.hidden = Number(element.dataset.step) !== step);
  const labels = ['Contato', 'Perfil', 'Qualificação'];
  stepLabel.textContent = `Etapa ${step} de 3 · ${labels[step - 1]}`;
  stepPips.forEach((pip, index) => pip.classList.toggle('is-active', index < step));
  qsa('.application-copy li').forEach((item, index) => item.classList.toggle('is-active', index < step));
};

const fieldValue = name => form.elements[name]?.value.trim() ?? '';
const checkedValues = name => qsa(`[name="${name}"]:checked`, form).map(input => input.value);
const validateStepOne = () => {
  if (!fieldValue('nome')) return 'Informe seu nome completo.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fieldValue('email'))) return 'Informe um e-mail válido.';
  if (fieldValue('fone').replace(/\D/g, '').length < 10) return 'Informe um WhatsApp com DDD.';
  return '';
};
const validateStepTwo = () => {
  if (!fieldValue('atua_mercado')) return 'Informe se atua no mercado financeiro.';
  if (fieldValue('atua_mercado') === 'sim' && !fieldValue('tipo_atuacao')) return 'Selecione o seu tipo de atuação.';
  if (selectedModel === 'escritorio' && !fieldValue('escritorio_atual')) return 'Informe o nome do escritório ou escreva “Não tenho”.';
  return '';
};
const validateStepThree = () => {
  const certifications = checkedValues('certificacoes');
  if (!certifications.length) return 'Selecione ao menos uma opção de certificação.';
  if (certifications.includes('Não') && certifications.length > 1) return 'A opção “Não” não pode ser combinada com certificações.';
  if (!fieldValue('carteira_clientes')) return 'Selecione o tamanho da sua carteira de clientes.';
  if (!fieldValue('cidade') || fieldValue('estado').length !== 2) return 'Informe cidade e estado.';
  return '';
};

const stepValidation = {1: validateStepOne, 2: validateStepTwo, 3: validateStepThree};

qsa('[data-next]', form).forEach(button => button.addEventListener('click', () => {
  const error = stepValidation[currentStep]();
  if (error) return showError(error);
  showStep(Math.min(3, currentStep + 1));
  qs(`[data-step="${currentStep}"] input, [data-step="${currentStep}"] select`, form)?.focus();
}));
qsa('[data-back]', form).forEach(button => button.addEventListener('click', () => {
  showStep(Math.max(1, currentStep - 1));
  qs(`[data-step="${currentStep}"] input, [data-step="${currentStep}"] select`, form)?.focus();
}));

qsa('[name="atua_mercado"]', form).forEach(input => input.addEventListener('change', () => {
  const disabled = fieldValue('atua_mercado') === 'nao';
  marketRole?.classList.toggle('is-disabled', disabled);
  marketRoleSelect.disabled = disabled;
  marketRoleSelect.required = !disabled;
  if (disabled) marketRoleSelect.value = '';
  clearErrors();
}));

certificationInputs.forEach(input => input.addEventListener('change', () => {
  if (!input.checked) return clearErrors();
  if (input.value === 'Não') certificationInputs.forEach(other => { if (other !== input) other.checked = false; });
  else certificationInputs.find(other => other.value === 'Não').checked = false;
  clearErrors();
}));

form?.addEventListener('input', clearErrors);
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const error = stepValidation[currentStep]();
  if (error) return showError(error);
  if (currentStep < 3) return showStep(currentStep + 1);

  const submitButton = qs('[data-submit]', form);
  const originalLabel = submitButton.textContent;
  form.classList.add('is-submitting');
  submitButton.disabled = true;
  submitButton.textContent = 'Enviando…';
  try {
    const response = await fetch('/api/application', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(window.redeMpFormPayload())
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Não foi possível enviar agora. Tente novamente.');
    steps.forEach(element => element.hidden = true);
    qs('.model-chips', form).hidden = true;
    qs('.form-header', form).hidden = true;
    success.hidden = false;
    success.focus();
  } catch (submitError) {
    showError(submitError.message || 'Não foi possível enviar agora. Tente novamente.');
  } finally {
    form.classList.remove('is-submitting');
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

window.redeMpFormPayload = () => ({
  submission_id: fieldValue('submission_id'),
  modelo: selectedModel,
  nome: fieldValue('nome'),
  email: fieldValue('email'),
  fone: fieldValue('fone'),
  atua_mercado: fieldValue('atua_mercado'),
  tipo_atuacao: fieldValue('atua_mercado') === 'nao' ? 'Não atuo' : fieldValue('tipo_atuacao'),
  certificacoes: checkedValues('certificacoes'),
  carteira_clientes: fieldValue('carteira_clientes'),
  cidade: fieldValue('cidade'),
  estado: fieldValue('estado'),
  escritorio_atual: selectedModel === 'escritorio' ? fieldValue('escritorio_atual') : '',
  website: fieldValue('website'),
  pagina: location.href,
  referencia: document.referrer
});

selectModel('consultor');

/* ---------- Mapa "Onde estamos" (Brasil interativo) — replicado da home MP ---------- */
(() => {
  const host = qs('[data-br-map]');
  if (!host) return;

  const NAME = {
    RS:'Rio Grande do Sul',RR:'Roraima',PA:'Pará',AC:'Acre',AP:'Amapá',MS:'Mato Grosso do Sul',
    PR:'Paraná',SC:'Santa Catarina',AM:'Amazonas',RO:'Rondônia',MT:'Mato Grosso',MA:'Maranhão',
    PI:'Piauí',CE:'Ceará',RN:'Rio Grande do Norte',PB:'Paraíba',PE:'Pernambuco',AL:'Alagoas',
    SE:'Sergipe',BA:'Bahia',ES:'Espírito Santo',RJ:'Rio de Janeiro',SP:'São Paulo',GO:'Goiás',
    DF:'Distrito Federal',MG:'Minas Gerais',TO:'Tocantins'
  };

  // Sede + escritórios parceiros (coordenadas em cidade real, viewBox 0 0 1000 912)
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

  fetch('assets/reach/br-map.svg').then(r => r.text()).then(txt => {
    host.innerHTML = txt;
    const svg = host.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('.uf').forEach(p => {
      if (ATIVOS.has(p.dataset.uf)) p.classList.add('on');
    });

    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'reach-markers');
    const tip = qs('[data-map-tip]');

    // Consultores: bolinhas pequenas — camada de baixo
    CONSULTORES.forEach(o => {
      const m = document.createElementNS(NS, 'circle');
      m.setAttribute('cx', o.xy[0]); m.setAttribute('cy', o.xy[1]);
      m.setAttribute('r', 4);
      m.setAttribute('class', 'mk mk-con');
      m.dataset.label = o.label;
      g.appendChild(m);
    });
    // Escritórios: triângulos pequenos
    ESCRITORIOS.forEach(o => {
      const [x, y] = o.xy, s = 9;
      const tri = document.createElementNS(NS, 'polygon');
      tri.setAttribute('points', `${x},${y - s * 0.62} ${x - s * 0.55},${y + s * 0.38} ${x + s * 0.55},${y + s * 0.38}`);
      tri.setAttribute('class', 'mk mk-esc');
      tri.dataset.label = o.label;
      g.appendChild(tri);
    });
    // Sede: círculo com pulso — camada de cima
    const sede = document.createElementNS(NS, 'circle');
    sede.setAttribute('cx', SEDE.xy[0]); sede.setAttribute('cy', SEDE.xy[1]);
    sede.setAttribute('r', 8);
    sede.setAttribute('class', 'mk mk-sede');
    sede.dataset.label = SEDE.label;
    g.appendChild(sede);
    svg.appendChild(g);

    // Tooltip: estados ativos + marcadores
    const showTip = (e, text) => {
      if (!tip) return;
      tip.textContent = text; tip.hidden = false;
      const r = host.getBoundingClientRect();
      tip.style.left = (e.clientX - r.left) + 'px';
      tip.style.top = (e.clientY - r.top) + 'px';
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
  }).catch(() => { host.innerHTML = '<p style="text-align:center;color:var(--muted)">Mapa indisponível.</p>'; });
})();
