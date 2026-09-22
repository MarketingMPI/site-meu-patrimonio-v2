# SITE MEU PATRIMONIO v2

Site institucional unificado da Meu Patrimônio (redesign v2). A **Home** fica na raiz e cada landing page vive em sua subpasta, com navegação interna religada por links relativos.

## Estrutura

| Rota | Página |
|------|--------|
| `/` | Home (B2C) |
| `/planejamento/` | Planejamento Financeiro |
| `/consultoria/` | Consultoria de Investimentos (Goal Based Investing) |
| `/family-office/` | Family Office |
| `/rede/` | Rede Meu Patrimônio |
| `/educacao/` | Educação Financeira |
| `/glossario/` | Glossário Financeiro |
| `/quem-somos/` | Quem Somos |

## Publicação

Hospedado via **GitHub Pages** em https://marketingmpi.github.io/site-meu-patrimonio-v2/
Todo push na `main` republica automaticamente (~1 min).

## Desenvolvimento no Replit

Use o workflow **Start application**. Ele serve o site estático em `0.0.0.0:5000`
com o servidor HTTP do Python, sem dependências adicionais.

## Validação de links e assets

Antes de publicar, execute:

```sh
python3 scripts/check-site.py
```

O comando verifica as oito rotas, links internos, âncoras, imagens, vídeos,
fontes, folhas de estilo e scripts locais. URLs externas não são acessadas.
Quando encontra um problema, informa a rota afetada e a URL que não pôde ser
resolvida.

## Origem

Consolidação dos repositórios de redesign individuais:
MP-Home-Redesigner, LP-planejamento-redesigner, LP-Consultoria, LP-Family-Office,
rede-mp-lp, LP-educacao-financeira-redesigner, LP-Quem-Somos.
