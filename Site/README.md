# Abyssal Nexoria

Monorepo inicial para o site, API e plugin de VIPs do servidor Minecraft.

## Estrutura

- `web/` — React + Vite: interface pública e loja (fase 1).
- `api/` — reservado para API Node.js/Express, pedidos e Mercado Pago.
- `plugin/` — reservado para plugin Java/Paper-Purpur + LuckPerms.

## Requisitos

- Node.js LTS (Node 22.12+ ou 24 LTS recomendado para Vite).
- VS Code.
- Java/Maven serão usados na fase do plugin.

## Rodar o site localmente

No PowerShell, a partir da pasta `abyssal-nexoria`:

```powershell
cd web
npm install
npm run dev
```

Abra o endereço mostrado no terminal, normalmente `http://localhost:5173`.

Para validar a compilação:

```powershell
npm run build
```

## Importante

A loja nesta fase é apenas uma interface demonstrativa. Não recebe pagamentos, não cria pedidos reais e não entrega VIPs. Nunca coloque token do Mercado Pago no React/frontend. O pagamento e a confirmação serão implementados no backend em uma fase posterior.
