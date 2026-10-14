# Automação de conteúdo

## Fluxo esperado

1. A IA prepara rascunhos e sugere datas.
2. O sistema valida os campos obrigatórios e as permissões.
3. O conteúdo permanece como rascunho até aprovação explícita.
4. Um executor agendado processa apenas itens aprovados e vencidos.
5. Cada tentativa registra horário, resultado e erro sem gravar segredos.

## Configuração

O executor deve receber por variáveis de ambiente as credenciais estritamente necessárias, a URL da API, o segredo do agendador e a configuração de persistência. Os nomes e valores finais dependem da infraestrutura escolhida.

## Persistência

Não dependa do disco local como armazenamento permanente. A agenda, ativos e registros devem usar um armazenamento persistente adequado ao ambiente. O conector GitHub existente é opcional e deve ser avaliado antes de ser usado como banco operacional.

## Segurança operacional

- O endpoint do agendador deve exigir autenticação por segredo.
- Não publique automaticamente conteúdo que não esteja explicitamente aprovado.
- Configure limite de tentativas, timeout, logs e alertas.
- Não execute agendamentos reais até testar o fluxo completo no ambiente escolhido.
