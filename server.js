/**
 * Servidor do SITE MEU PATRIMONIO v2.
 *
 * Serve o site estático (Home na raiz + subpastas /planejamento, /consultoria,
 * /family-office, /rede, /educacao, /glossario, /quem-somos) E hospeda o backend de
 * captação da Rede em POST /api/application, que grava a candidatura no
 * Pipedrive (mesmo handler antes rodado como função serverless na Vercel).
 *
 * O deploy anterior era estático (python -m http.server), que não processava
 * o POST -> os leads da Rede se perdiam. Este servidor Node restaura a conexão.
 *
 * Requer a env var PIPEDRIVE_API_TOKEN (cadastrar como Secret no Replit).
 * Opcionais: PIPEDRIVE_PIPELINE_ID, PIPEDRIVE_STAGE_ID, PIPEDRIVE_COMPANY_DOMAIN.
 */
const path = require('path');
const express = require('express');

const applicationHandler = require('./api/application.js');

const app = express();
// Strict routing: '/rede' casa só sem a barra; '/rede/' cai no static (index.html).
// Sem isso, a rota de redirect abaixo casaria '/rede/' também -> loop infinito.
app.set('strict routing', true);
const ROOT = __dirname;
const PORT = process.env.PORT || 5000;

// Body JSON para o endpoint da candidatura (o handler espera req.body objeto).
app.use(express.json({ limit: '64kb' }));

// --- Backend da Rede: candidaturas -> Pipedrive -------------------------------
// Aceita tanto /api/application quanto /rede/api/application (o form envia
// relativo à página; com a <base> ativa em /rede/, resolve para /rede/api/...).
app.all(['/api/application', '/rede/api/application'], (req, res) =>
  applicationHandler(req, res)
);

// --- Trailing-slash: /rede -> /rede/ ------------------------------------------
// O deploy estático anterior não redirecionava; sem a barra os caminhos
// relativos quebravam. Replica o comportamento do GitHub Pages.
const SECTIONS = ['planejamento', 'consultoria', 'family-office', 'rede', 'educacao', 'glossario', 'quem-somos'];
for (const section of SECTIONS) {
  app.get(`/${section}`, (req, res) => res.redirect(301, `/${section}/`));
}

// --- Arquivos estáticos -------------------------------------------------------
app.use(express.static(ROOT, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// index.html de cada pasta é resolvido pelo express.static; fallback 404 simples.
app.use((req, res) => res.status(404).send('Não encontrado.'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SITE MEU PATRIMONIO v2 ouvindo em http://0.0.0.0:${PORT}`);
  if (!process.env.PIPEDRIVE_API_TOKEN) {
    console.warn('[aviso] PIPEDRIVE_API_TOKEN ausente — /api/application responderá 503 até o Secret ser configurado.');
  }
});
