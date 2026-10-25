# Plugins Abyssal Nexoria

## NexoriaLogin

Primeiro plugin da rede: sincroniza login e cadastro com a API do site. Ele não
armazena senhas no servidor Minecraft; envia a senha somente por HTTPS à API,
que guarda apenas o hash. Após o login, outros plugins poderão consultar o
serviço `NexoriaLoginService` para saber se o jogador foi autenticado.

Configure `NexoriaLogin/config.yml` com a URL HTTPS da API e a mesma chave
`PLUGIN_LOGIN_KEY` definida nas variáveis de ambiente da API. Compile com
`mvn package` dentro de `NexoriaLogin/`, então coloque o JAR de `target/` na
pasta `plugins/` do Paper/Purpur.

> O `config.yml` não deve ser enviado a repositórios com a chave preenchida.

## NexoriaVIP — próxima fase

Plugin Java para Paper/Purpur, com integração LuckPerms.

Responsabilidades planejadas:
- Consultar entregas pendentes pela API autenticada.
- Aplicar e remover grupos via integração segura com LuckPerms.
- Controlar validade mensal e renovação.
- Persistir IDs de pedidos já processados para impedir duplicação.
- Registrar auditoria e permitir comandos administrativos.

A versão da Paper API será definida de acordo com a versão exata do Purpur em execução no servidor. Não copie tokens da API para arquivos distribuídos no JAR.
