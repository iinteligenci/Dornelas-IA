# Configuração OAuth

## Meta / Instagram
1. Criar/configurar o aplicativo no Meta for Developers.
2. Configurar OAuth e a URL de callback do Dornelas IA.
3. Garantir que o Instagram profissional esteja vinculado à estrutura Meta necessária.
4. Colocar somente Client ID/Secret no ambiente seguro do servidor.
5. Usar o botão Conectar Instagram / Meta no painel.
6. Fazer login e conceder as permissões solicitadas.
7. O callback troca o código por token no backend.
8. O agente registra a conexão e as permissões concedidas.

## Google
O mesmo fluxo será usado para o Google Business Profile. A criação/validação da conta Google continua sendo feita pelo proprietário; o agente administra somente a conta autorizada.

## Segurança
- Nunca pedir senha do Instagram ou Google dentro do Dornelas IA.
- Nunca armazenar secrets no GitHub.
- Usar state anti-CSRF.
- Guardar tokens em armazenamento seguro.
- Permissões são revogáveis.
- Toda ação posterior será auditada.
