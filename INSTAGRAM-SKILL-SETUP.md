# Dornelas IA — módulo de conteúdo e pesquisa viral

Esta branch adiciona uma skill de Claude para pesquisa de referências, análise de Reels e criação de conteúdo original para a Charcutaria Dornelas. Ela não muda o site publicado nem adiciona integração automática com Instagram.

## Arquivos
- `.claude/skills/dornelas-instagram/SKILL.md`: instruções da skill.
- `.claude/skills/dornelas-instagram/brand-context.md`: contexto e limites da marca.
- `INSTAGRAM-SKILL-SETUP.md`: este guia.

## Como usar
1. Abra o repositório `iinteligenci/Dornelas-IA` no computador com Claude Code disponível.
2. Faça checkout da branch `feat/instagram-viral-skill` ou baixe os arquivos desta branch.
3. Abra a pasta do repositório como projeto no Claude Code. A skill do projeto fica em `.claude/skills/dornelas-instagram/`.
4. Peça, por exemplo:
   - “Use a skill dornelas-instagram para pesquisar 10 Reels virais recentes de bacon, defumados e churrasco brasileiros. Traga os links, explique o padrão e adapte 3 ideias originais para a barraca.”
   - “Monte o calendário desta semana com conteúdo orgânico, sem comprar nada e com foco em recuperar clientes antigos.”
   - “Analise estes resultados dos meus Reels e compare com a mediana do perfil: [cole os dados].”
5. Revise os resultados. A skill só prepara pesquisa e rascunhos; não publica automaticamente.

## Skill open-source de referência
O pacote comunitário de 13 skills para Instagram está em:
https://github.com/Jakeschincariol/instagram-agent-skill

A licença MIT permite reutilização conforme seus termos. Esta branch adiciona um contexto próprio da Dornelas e um fluxo mais conservador para caixa e precisão comercial; não copia nem instala automaticamente todo o pacote upstream.

## Limites
- O acesso à web e a qualidade da pesquisa dependem das ferramentas habilitadas na instalação de Claude.
- A skill não garante que todo Reel pesquisado tenha métricas públicas, nem acessa insights privados da conta por conta própria.
- A skill não publica, não envia DMs e não pede senhas ou tokens.
- O repositório GitHub é gratuito; uso de Claude Code e de ferramentas externas pode depender do plano e de limites da conta. Verifique antes de ativar serviços pagos.
