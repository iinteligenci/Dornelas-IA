# Modelo de dados — Dornelas IA

Entidades: **business**, **product**, **sales_order**, **campaign**, **integration**, **permission**, **agent_run** e **audit_event**.

Campos essenciais:
- product: preço, custo, estoque, margem mínima e status.
- sales_order: origem, ID externo, itens, total e status.
- campaign: objetivo, canal, status, orçamento e período.
- integration: provedor, conta, status, escopos e referência segura do token.
- permission: ação permitida e se exige aprovação.
- agent_run: início, fim, nível de autonomia, objetivo e status.
- audit_event: execução, provedor, status, motivo e ID externo.

## Arquivos JSON operacionais atuais

- `SCHEDULE_FILE` (padrão `generated/ai/schedule.json`): itens agendados, legendas, URLs de mídia, horário, aprovação, status e resultado da execução.
- `META_PERSIST_FILE` (padrão `generated/ai/meta-connection.json`): token Meta/Instagram, expiração e metadados da conexão dentro de um campo `encrypted` autenticado por AES-256-GCM.
- `generated/ai/google-connection.json`: tokens de acesso/renovação Google dentro de um campo `encrypted` autenticado por AES-256-GCM.
- `generated/ai/knowledge-base.json`: catálogo/conhecimento agregado pelo agente e estado da coleta.
- `generated/ai/connection-tests.json`: relatório de verificações de integração, sem valores de segredos.
- `generated/ai/site-improvement-proposal.json`: proposta gerada para melhorias do site.
- `generated/ai/self-audit.json` e `system-state.json`: resultado da autoauditoria e estado operacional.
- `generated/ai/snapshots/*.json`: snapshots versionados da base de conhecimento; podem conter conteúdo do site e dados de integrações coletados, portanto ficam no repositório privado.

Os arquivos JSON são acessados pela camada `server/integrations/data-store.js`. Use um repositório privado exclusivo para esses dados, com token limitado a Contents nesse repositório. `TOKEN_ENCRYPTION_KEY` é a chave dedicada para novas gravações de tokens OAuth; tokens nunca devem ser gravados em texto puro. `GITHUB_TOKEN`/`CONTENT_ASSET_REPO` são separados e destinam-se à publicação de mídia pública, não à persistência privada.
