# NexoriaLogin - correção de bloqueio pré-login

## O que mudou
- Removeu o bypass automático de operadores (OP).
- Bloqueia movimento/rotação, chat, comandos não autorizados, interação, quebra/colocação, inventário, drop/pickup, troca de mão, consumo e dano antes da autenticação.
- Só libera o jogador quando a API responde com HTTP 2xx.
- O arquivo JAR antigo foi removido para evitar instalar por engano uma versão desatualizada.

## Compilar no Windows
Abra o PowerShell na pasta `NexoriaLogin` e execute com o Maven Daemon instalado:

```powershell
mvnd clean package
```

O JAR novo será criado em:
`target\NexoriaLogin.jar`

Copie esse JAR para a pasta `plugins` do servidor, substituindo o antigo, e reinicie completamente o servidor.

## Configuração obrigatória
Edite `plugins/NexoriaLogin/config.yml` e configure:
- `api-url`: URL pública da API, sem barra no final.
- `plugin-key`: a mesma chave `PLUGIN_LOGIN_KEY` configurada na API.

Não use `/reload` para testar plugins; reinicie o servidor.
