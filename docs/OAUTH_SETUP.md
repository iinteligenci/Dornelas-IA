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

## Instagram Login direto (recomendado)
A Dornelas IA também suporta o **Instagram API with Instagram Login**, que permite conectar uma conta profissional (Business ou Creator) diretamente, sem exigir uma Página do Facebook vinculada. A Meta documenta esse fluxo separadamente do Facebook Login for Business. citeturn3search0turn3search4

No Render, configurar:
- `INSTAGRAM_CLIENT_ID` — Client ID do produto Instagram/Business Login.
- `INSTAGRAM_CLIENT_SECRET` — secret do produto Instagram, sem publicar no GitHub.
- `INSTAGRAM_REDIRECT_URI` — `https://dornelas-ia.onrender.com/auth/instagram/callback`.

O botão **Conectar Instagram** do painel usa esse fluxo. Depois do login, a IA passa a ler perfil, publicações e métricas disponíveis e também pode publicar quando a autonomia/permissão permitir.
