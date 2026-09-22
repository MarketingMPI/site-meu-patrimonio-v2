const PERSON_FIELDS = {
  city: 'f454aca8c62d5d0877ce516a6a35aafa1808c822',
  state: 'f40ef9ac25754ee8ca6c612bb9a3ae7580b55d47',
  market: '3b7a294bd9f61145b4b0765a67b308fd7a4b54eb',
  role: 'bddde70208ba5363eb2580e2b59a700c4f75a74a',
  certifications: 'b5f03864f08c2bd59b13299b2f95f931bc092d1f',
  portfolio: '6ada68b5a6e257fbbb3a501da847f27da90c2abd',
  model: 'f21e5f985f78b3ceee0af054e7f3534519d59804'
};

// Funil de destino. IDs conferidos na conta meupatrimoniob2c em 05/08/2026 via
// API (related_objects): pipeline 60 = "B2B - Alpha" (o nome real usa hífen),
// stage 431 = "Entrada de Leads", order_nr 1, pipeline_id 60, ativo.
// Os env vars existem para reordenação de etapas sem precisar de deploy de código.
// Lido por request, não no load do módulo: em serverless o módulo fica em cache
// entre invocações, e resolver na hora garante que trocar a env var tenha efeito.
const dealTarget = () => ({
  pipelineId: Number(process.env.PIPEDRIVE_PIPELINE_ID || 60),
  stageId: Number(process.env.PIPEDRIVE_STAGE_ID || 431)
});
const DEAL_TITLE_PREFIX = 'LP_Rede - ';

const ROLES = new Set(['Consultor de Investimentos', 'Assessor de Investimentos', 'Gerente de Relacionamento', 'Gerente de Contas', 'Gerente de Agência', 'Planejador Financeiro', 'Operações Internas', 'Corretor de Seguros', 'Gestor de Ativos', 'Não atuo']);
const CERTIFICATIONS = new Set(['Não', 'CNPI', 'CEA', 'CPRO-R', 'CPRO-I', 'CPA-10', 'CPA-20', 'ANCORD', 'CFP', 'CGA', 'CFA']);
const PORTFOLIOS = new Set(['Não tenho carteira', 'Até R$ 10 milhões', 'Até R$ 20 milhões', 'Até R$ 50 milhões', 'Até R$ 100 milhões', 'Mais de R$ 100 milhões']);

const clean = (value, limit = 180) => String(value ?? '').trim().slice(0, limit);
const response = (res, status, body) => res.status(status).json(body);

const parseBody = req => {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body && typeof req.body === 'object' ? req.body : {};
};

const validate = input => {
  const data = {
    submissionId: clean(input.submission_id, 100),
    model: clean(input.modelo, 20),
    name: clean(input.nome, 120),
    email: clean(input.email, 180).toLowerCase(),
    phone: clean(input.fone, 40),
    market: clean(input.atua_mercado, 10),
    role: clean(input.tipo_atuacao, 80),
    certifications: Array.isArray(input.certificacoes) ? input.certificacoes.map(item => clean(item, 20)) : [],
    portfolio: clean(input.carteira_clientes, 40),
    city: clean(input.cidade, 90),
    state: clean(input.estado, 2).toUpperCase(),
    office: clean(input.escritorio_atual, 140),
    honeypot: clean(input.website, 100)
  };
  if (data.honeypot) return {data, bot: true};
  if (!/^rede-mp-[a-z0-9-]+$/i.test(data.submissionId)) return {error: 'Identificador de envio inválido.'};
  if (!['consultor', 'escritorio'].includes(data.model)) return {error: 'Modelo de candidatura inválido.'};
  if (data.name.length < 3) return {error: 'Informe seu nome completo.'};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return {error: 'Informe um e-mail válido.'};
  if (data.phone.replace(/\D/g, '').length < 10) return {error: 'Informe um WhatsApp com DDD.'};
  if (!['sim', 'nao'].includes(data.market)) return {error: 'Informe se atua no mercado financeiro.'};
  if (!ROLES.has(data.role) || (data.market === 'sim' && data.role === 'Não atuo')) return {error: 'Tipo de atuação inválido.'};
  if (!data.certifications.length || data.certifications.some(item => !CERTIFICATIONS.has(item))) return {error: 'Certificações inválidas.'};
  if (data.certifications.includes('Não') && data.certifications.length > 1) return {error: 'A opção “Não” não pode ser combinada com certificações.'};
  if (!PORTFOLIOS.has(data.portfolio)) return {error: 'Carteira de clientes inválida.'};
  if (!data.city || !/^[A-Z]{2}$/.test(data.state)) return {error: 'Informe cidade e estado.'};
  if (data.model === 'escritorio' && !data.office) return {error: 'Informe o escritório atual ou “Não tenho”.'};
  return {data};
};

const getItemId = item => item?.item?.id || item?.id;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return response(res, 405, {ok: false, message: 'Método não permitido.'});
  }

  const validation = validate(parseBody(req));
  if (validation.bot) return response(res, 200, {ok: true});
  if (validation.error) return response(res, 400, {ok: false, message: validation.error});

  const token = process.env.PIPEDRIVE_API_TOKEN;
  const company = process.env.PIPEDRIVE_COMPANY_DOMAIN || 'meupatrimoniob2c';
  if (!token) return response(res, 503, {ok: false, message: 'Integração temporariamente indisponível.'});

  const api = async (path, options = {}) => {
    const url = new URL(`https://${company}.pipedrive.com/api/v1${path}`);
    url.searchParams.set('api_token', token);
    const result = await fetch(url, {
      ...options,
      headers: {'Content-Type': 'application/json', ...options.headers}
    });
    const payload = await result.json().catch(() => ({}));
    if (!result.ok || payload.success === false) throw new Error(`Pipedrive ${result.status} em ${path.split('?')[0]}`);
    return payload.data;
  };

  const data = validation.data;
  try {
    let organizationId;
    if (data.model === 'escritorio' && data.office.toLowerCase() !== 'não tenho') {
      const foundOrganizations = await api(`/organizations/search?term=${encodeURIComponent(data.office)}&fields=name&exact_match=true`);
      organizationId = getItemId(foundOrganizations?.items?.[0]);
      if (!organizationId) {
        const organization = await api('/organizations', {method: 'POST', body: JSON.stringify({name: data.office, visible_to: '3'})});
        organizationId = organization.id;
      }
    }

    const foundPeople = await api(`/persons/search?term=${encodeURIComponent(data.email)}&fields=email&exact_match=true`);
    let personId = getItemId(foundPeople?.items?.[0]);
    const personPayload = {
      name: data.name,
      email: [{value: data.email, primary: true, label: 'work'}],
      phone: [{value: data.phone, primary: true, label: 'mobile'}],
      visible_to: '3',
      ...(organizationId ? {org_id: organizationId} : {}),
      [PERSON_FIELDS.city]: `${data.city}, ${data.state}, Brasil`,
      [PERSON_FIELDS.state]: data.state,
      [PERSON_FIELDS.market]: data.market === 'sim' ? 'Sim' : 'Não',
      [PERSON_FIELDS.role]: data.role,
      [PERSON_FIELDS.certifications]: data.certifications.join(', '),
      [PERSON_FIELDS.portfolio]: data.portfolio,
      [PERSON_FIELDS.model]: data.model === 'consultor' ? 'Consultor' : 'Escritório Parceiro'
    };
    if (personId) await api(`/persons/${personId}`, {method: 'PUT', body: JSON.stringify(personPayload)});
    else {
      const person = await api('/persons', {method: 'POST', body: JSON.stringify(personPayload)});
      personId = person.id;
    }

    const title = `${DEAL_TITLE_PREFIX}${data.name}`;

    // Idempotência: deals não aceitam origin_id gravável, então a chave passa a ser
    // (pessoa + funil + título + deal aberto). Isso absorve duplo clique e reenvio da
    // mesma candidatura, e ainda permite uma nova candidatura futura depois que o deal
    // anterior for ganho/perdido.
    const target = dealTarget();
    const existingDeals = await api(`/persons/${personId}/deals?status=open&limit=100`);
    const duplicate = (existingDeals || []).find(deal =>
      Number(deal?.pipeline_id) === target.pipelineId && deal?.title === title);
    if (duplicate) return response(res, 200, {ok: true, duplicate: true, id: duplicate.id});

    const deal = await api('/deals', {
      method: 'POST',
      body: JSON.stringify({
        title,
        person_id: personId,
        ...(organizationId ? {org_id: organizationId} : {}),
        pipeline_id: target.pipelineId,
        stage_id: target.stageId,
        visible_to: '3'
      })
    });
    return response(res, 201, {ok: true, id: deal.id});
  } catch (error) {
    console.error('rede-mp application integration failed:', error.message);
    return response(res, 502, {ok: false, message: 'Não foi possível concluir o envio. Tente novamente em alguns minutos.'});
  }
};
