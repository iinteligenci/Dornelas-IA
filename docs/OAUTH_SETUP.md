# Configuração OAuth

Configure os aplicativos OAuth nos consoles oficiais dos respectivos provedores e registre exatamente as URLs de callback usadas pelo ambiente em execução.

## Meta / Instagram

- Defina `META_CLIENT_ID`, `META_CLIENT_SECRET`, `META_CONFIG_ID` quando aplicável e `META_REDIRECT_URI`.
- Para Instagram Login, defina também `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` e `INSTAGRAM_REDIRECT_URI`.
- A URL de callback registrada no provedor precisa coincidir exatamente com a variável do ambiente.
- Use apenas os escopos necessários e valide permissões e revisão da aplicação antes de habilitar publicação.

## Google

- Defina `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI`.
- Habilite as APIs necessárias no projeto Google Cloud e configure a tela de consentimento.

## Segurança

- Não salve segredos no código, em commits ou no frontend.
- Use variáveis de ambiente durante desenvolvimento e um gerenciador de segredos no ambiente escolhido para execução.
- Não considere uma integração pronta apenas porque o fluxo OAuth retornou sucesso; teste leitura, renovação de tokens e permissões reais.
