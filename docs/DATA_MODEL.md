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

Segredos devem permanecer em infraestrutura segura; o banco não deve armazenar credenciais em texto puro.
