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
