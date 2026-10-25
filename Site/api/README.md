# API — Área do jogador (primeira base)

Este diretório já contém uma API local mínima para a área de conta. Ela serve
apenas ao desenvolvimento: o perfil de `MrPesce` é uma massa de demonstração e
as sessões vivem somente na memória do processo.

Para iniciar, em outro terminal:

```powershell
cd api
npm run dev
```

Depois inicie o site em `web/`. O Vite encaminha as chamadas `/api` para essa
API local.

## Antes de publicar

- Troque a senha temporária e migre usuários para um banco de dados.
- Use HTTPS, cookies `HttpOnly`/`Secure` ou sessões persistentes, expiração e
  revogação de token.
- O plugin deve se autenticar na API com uma credencial própria e sincronizar
  dados por UUID, nunca por nickname como identificador definitivo.
- Não exponha inventários, localização, senhas ou endpoints do plugin sem
  autenticação e autorização no servidor.

## Painel administrativo

O painel exige nick, e-mail, senha e um segundo fator obrigatório. Configure o
administrador copiando `.env.example` para `.env` e preenchendo os valores.
No desenvolvimento o código de 2FA é exibido exclusivamente no terminal da
API; em produção, substitua o adaptador `sendTwoFactorCode` por um provedor de
e-mail transacional antes de habilitar o painel.

Para deploy, configure `PORT` (a Square Cloud fornece esse valor), `WEB_ORIGIN`
com a URL pública do frontend e todas as variáveis `OWNER_*`/`PLUGIN_LOGIN_KEY`.

## Diagnóstico público

Após publicar a aplicação, a URL pública da Square Cloud deve responder em
`/health`, `/api/health` ou `/`. Se não houver uma linha `[HTTP] GET /health`
nos logs ao abrir a URL, o domínio/subdomínio não está apontando para esta
aplicação; revise **Publicação na Web** e o subdomínio no painel.

## Próximas responsabilidades

Responsabilidades planejadas:
- Catálogo e preços controlados pelo servidor.
- Criação de pedidos pendentes.
- Integração Mercado Pago no backend.
- Validação da notificação e consulta do pagamento.
- Fila persistente de entregas para o plugin.
- Autenticação entre plugin e API, rate limiting e logs.

Não coloque credenciais reais neste diretório até implementarmos o fluxo seguro. O frontend nunca deve receber o Access Token do Mercado Pago.
