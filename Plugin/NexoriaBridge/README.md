# NexoriaBridge

Ponte administrativa entre Paper/Purpur e a API do site.

## O que sincroniza

- UUID, nickname, status online e último login/logout;
- localização atual/última localização;
- nível e XP vanilla;
- inventário vanilla;
- ações administrativas solicitadas no painel: kick, ban, mute e aviso.

## Integrações opcionais

- **Vault:** sincroniza o saldo fornecido pelo plugin de economia registrado.
- **LuckPerms:** sincroniza o grupo primário como cargo/VIP.
- **CMI:** detectado e preparado para homes; a consulta será ligada à API da
  versão exata instalada no servidor.
- **GriefPrevention:** detectado e reservado para sincronização de claims.

Nenhuma integração é obrigatória: o Bridge continua iniciando se uma delas não
estiver instalada.

## Configuração

Na API, cadastre `PLUGIN_BRIDGE_KEY` nas variáveis da Square Cloud. No servidor
Minecraft, copie o mesmo valor em `plugins/NexoriaBridge/config.yml`, junto da
URL HTTPS pública da API. Não reutilize `PLUGIN_LOGIN_KEY`.

Compile com `mvn package` e instale somente `target/NexoriaBridge.jar` em
`plugins/`. Reinicie completamente o servidor após editar a configuração.
