# Deploy inicial na Square Cloud

Este projeto deve ser publicado como duas aplicações:

## 1. API

Diretório da aplicação: `Site/api`

Comando: `npm start`

Variáveis obrigatórias na Square Cloud:

- `NODE_ENV=production`
- `WEB_ORIGIN=https://URL_DO_SITE`
- `OWNER_NICK`, `OWNER_EMAIL`, `OWNER_WHATSAPP`
- `OWNER_PASSWORD_SALT`, `OWNER_PASSWORD_HASH`
- `PLUGIN_LOGIN_KEY`

O processo usa a porta fornecida pela variável `PORT` da plataforma.

## 2. Site

Diretório da aplicação: `Site/web`

Build: `npm install && npm run build`

O frontend precisa de `VITE_API_URL=https://URL_DA_API`. Publique o conteúdo de
`dist` como site estático conforme o tipo de aplicação escolhido na Square Cloud.

## Git

Na raiz do projeto:

```powershell
git init
git add .
git commit -m "Preparar deploy inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Nunca faça commit de `.env`, `plugin-key` preenchida ou tokens reais.
