# Operação do Dornelas-IA

## Variáveis de ambiente (nomes; nunca coloque valores reais neste arquivo)

- `PORT`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `DATA_STORE_REPO`
- `DATA_STORE_TOKEN`
- `DATA_STORE_BRANCH`
- `TOKEN_ENCRYPTION_KEY`
- `SCHEDULER_SECRET`
- `META_PUBLISH_MODE`
- `META_CLIENT_ID`
- `META_CLIENT_SECRET`
- `META_REDIRECT_URI`
- `META_CONFIG_ID`
- `META_ACCESS_TOKEN`
- `META_AUTH_TYPE`
- `INSTAGRAM_CLIENT_ID`
- `INSTAGRAM_CLIENT_SECRET`
- `INSTAGRAM_REDIRECT_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `AI_API_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `AI_IMAGE_MODEL`
- `AI_TEMPERATURE`
- `AI_REQUEST_TIMEOUT_MS`
- `GITHUB_TOKEN`
- `CONTENT_ASSET_REPO`
- `CONTENT_ASSET_BRANCH`
- `CONTENT_ASSET_BASE_URL`
- `SITE_URL`
- `APP_BASE_URL`
- `API_BASE_URL`
- `SCHEDULE_FILE`
- `META_PERSIST_FILE`

`SCHEDULER_SECRET` é a única variável aceita para autenticar `POST /agent/scheduler/run`. `DORNELAS_SCHEDULER_SECRET` não é usada.

`META_PUBLISH_MODE` deve ficar como `simulate` (inclusive quando ausente). Não configure `live` nesta fase; a publicação externa permanece desativada para esta entrega.

## Criar o repositório privado de dados

1. No GitHub, crie um repositório novo, **Private**, exclusivo para JSON operacionais. Não conecte esse repositório ao Render nem a GitHub Pages.
2. Crie um fine-grained personal access token com acesso apenas ao repositório privado de dados e permissão **Contents: Read and write**. Não conceda acesso a outros repositórios nem permissões de administração.
3. Configure no Render `DATA_STORE_REPO` com `owner/repo`, `DATA_STORE_TOKEN` com o token restrito e `DATA_STORE_BRANCH` com a branch de dados.
4. Configure `TOKEN_ENCRYPTION_KEY` com uma chave aleatória independente, com pelo menos 32 bytes. Guarde-a em um gerenciador de senhas. Não a comite, não a envie pelo painel e não a inclua em logs.
5. Mantenha `GITHUB_TOKEN` e `CONTENT_ASSET_REPO` separados para ativos públicos. Eles não substituem a configuração do repositório privado de dados.
6. Antes de ativar o destino novo, migre os arquivos JSON operacionais listados em `docs/DATA_MODEL.md`, mantendo os caminhos relativos. Não copie `.env`, tokens em texto puro, arquivos de mídia pública ou arquivos que não pertençam à camada de dados.

## Arquivos gravados no repositório privado

- `generated/ai/schedule.json` ou o caminho definido por `SCHEDULE_FILE`: agenda, legendas, URLs de mídia, datas, aprovação, status e resultados da execução.
- O caminho definido por `META_PERSIST_FILE` (padrão `generated/ai/meta-connection.json`): token Meta/Instagram dentro do campo `encrypted`, mais metadados de atualização.
- `generated/ai/google-connection.json`: tokens Google dentro do campo `encrypted`, mais metadados de atualização.
- `generated/ai/approval-queue.json`: rascunhos, status de revisão e datas; sem credenciais.
- `generated/ai/connection-tests.json`: resultados de verificações; não deve conter valores secretos.
- `generated/ai/knowledge-base.json`: base de conhecimento e estado da coleta.
- `generated/ai/snapshots/*.json`: snapshots da base de conhecimento.
- `generated/ai/site-improvement-proposal.json`: propostas de melhoria do site.
- `generated/ai/self-audit.json`: resultado da autoauditoria.
- `generated/ai/system-state.json`: estado operacional.

As gravações de conexão contêm somente payload cifrado com AES-256-GCM no campo `encrypted`, nunca tokens em texto puro. Não use o repositório como cofre de chaves: a chave `TOKEN_ENCRYPTION_KEY` fica exclusivamente no ambiente do backend. O repositório privado ainda deve ser tratado como sensível.

## Migração de tokens legados e perda da chave

Registros antigos cifrados com `META_CLIENT_SECRET` ou `GOOGLE_CLIENT_SECRET` podem ser lidos temporariamente para migração. Na primeira escrita subsequente da conexão, se `TOKEN_ENCRYPTION_KEY` estiver configurada, o backend regrava o registro usando a chave dedicada. Se a gravação falhar, a conexão continua marcada como migração pendente e o erro é registrado sem revelar dados. Depois de confirmar que Meta e Google foram migrados, faça um commit separado removendo o fallback de leitura legado e rotacione os client secrets caso exista suspeita de exposição.

Se `TOKEN_ENCRYPTION_KEY` for perdida ou trocada, o servidor continua funcionando, mas o estado da integração aparecerá como `reconnect_required` (“Reconectar conta”). Reconfigure a chave correta ou reconecte a conta pelo OAuth. Não apague nem sobrescreva o JSON cifrado antes de confirmar a recuperação/reconexão.

## Chamador externo do agendador no Render gratuito

O serviço web gratuito do Render não oferece um agendador persistente confiável. Configure um serviço externo de cron HTTP gratuito para executar periodicamente `POST https://dornelas-ia.onrender.com/agent/scheduler/run` e enviar o cabeçalho `x-scheduler-secret` com o valor de `SCHEDULER_SECRET`, configurado separadamente no Render e no chamador. Não coloque o segredo na URL, no corpo, em código versionado ou em logs.

Exemplo de chamada (substitua o valor localmente; não versione o comando com o segredo real):

```sh
curl -X POST "https://dornelas-ia.onrender.com/agent/scheduler/run" \
  -H "Content-Type: application/json" \
  -H "x-scheduler-secret: $SCHEDULER_SECRET" \
  -d '{}'
```

Sem `SCHEDULER_SECRET`, a rota retorna `503`; com segredo inválido, retorna `401`; tentativas inválidas repetidas são limitadas por IP e podem retornar `429` com `Retry-After`. O limite é simples e fica em memória, então reinicia com o processo. O endpoint permanece em modo simulado por padrão; nenhum post real é publicado.
