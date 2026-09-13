# Projeto no Replit

Site institucional estático em HTML, CSS e JavaScript, sem etapa de build ou
dependências de aplicação.

## Executar

Inicie o workflow **Start application**, que executa:

```sh
python3 -m http.server 5000 --bind 0.0.0.0
```

O servidor deve escutar em `0.0.0.0:5000` para funcionar no Preview do Replit.
As páginas secundárias ficam em subdiretórios e são acessadas por URLs como
`/planejamento/`, `/consultoria/` e `/quem-somos/`.

## Publicação existente

O repositório também é publicado pelo GitHub Pages a partir da branch `main`.