# Backend do Dornelas IA

Esta pasta é o limite seguro entre o painel e os serviços externos.

Responsabilidades:
1. autenticação da sessão do proprietário;
2. OAuth dos provedores;
3. armazenamento seguro de tokens;
4. leitura de dados comerciais;
5. execução de ações autorizadas;
6. auditoria;
7. execução do ciclo do agente.

O frontend nunca deve receber client secrets ou tokens de provedor.

## Contrato do ciclo

Entrada:
- objetivo;
- nível de autonomia;
- estado comercial;
- permissões;
- guardrails.

Saída:
- decisões;
- ações executadas;
- aprovações necessárias;
- métricas;
- eventos de auditoria.

O primeiro conector real a implementar será escolhido entre Meta/Instagram e Google Business Profile após configuração das credenciais OAuth.

## Persistência e segredos

Os JSON operacionais usam a camada `server/integrations/data-store.js`, isolada por uma interface `getJson`/`putJson` para permitir trocar o provedor por banco de dados futuramente. Configure `DATA_STORE_REPO` para um repositório **privado e exclusivo para dados**, `DATA_STORE_TOKEN` para um token com permissão mínima de Contents apenas nesse repositório, e `DATA_STORE_BRANCH` (padrão `main`). O token de dados não é o mesmo token usado para publicar arquivos de mídia: `GITHUB_TOKEN` e `CONTENT_ASSET_REPO` continuam reservados aos ativos públicos.

Os tokens OAuth nunca devem ser gravados em texto puro. A persistência Meta/Google exige `TOKEN_ENCRYPTION_KEY` para criptografar dados com AES-256-GCM. A leitura ainda aceita, temporariamente, dados legados criptografados com os client secrets antigos; após configurar a nova chave e reconectar/salvar a integração, os dados novos passam a usar a chave dedicada. Não comite `.env` nem copie segredos para o repositório privado de dados.

Conflitos de SHA são tratados com uma tentativa de atualização apenas se o conteúdo remoto continuar igual à versão lida inicialmente. Se houver alteração concorrente, a gravação falha com `DATA_STORE_WRITE_CONFLICT`, sem sobrescrever os dados concorrentes.

## Agendador externo no Render gratuito

O plano gratuito do Render não deve ser tratado como um agendador persistente garantido. Configure um chamador externo gratuito (por exemplo, um serviço de cron HTTP) para fazer `POST /agent/scheduler/run` enviando o cabeçalho `x-scheduler-secret`. A única variável de autenticação aceita por essa rota é `SCHEDULER_SECRET`; ela deve ser longa e aleatória e configurada no Render e no chamador. Sem ela, a rota retorna `503`; com segredo incorreto, retorna `401`. O endpoint usa modo de publicação simulado por padrão quando `META_PUBLISH_MODE` está ausente; não considere isso uma publicação real.

### Migração inicial dos dados existentes

Antes de ativar o novo `DATA_STORE_REPO`, copie os JSON existentes do repositório/branch atualmente configurados para o novo repositório privado, mantendo os caminhos relativos. No padrão antigo, os arquivos operacionais ficavam sob `generated/ai/`, incluindo `schedule.json`, o arquivo apontado por `META_PERSIST_FILE`, `google-connection.json`, `knowledge-base.json`, `connection-tests.json`, `site-improvement-proposal.json`, os snapshots em `snapshots/`, `self-audit.json` e `system-state.json`. Verifique o destino e a existência dos arquivos na configuração real do Render antes de migrar; não copie mídia pública nem `.env`. Os arquivos de conexão contêm apenas o campo cifrado e metadados, mas trate-os como dados secretos. Configure `TOKEN_ENCRYPTION_KEY` com uma string aleatória de pelo menos 32 caracteres. Os tokens antigos podem ser lidos com o mecanismo de compatibilidade legado; novas gravações usam a chave dedicada.
