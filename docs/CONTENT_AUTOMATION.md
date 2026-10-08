# Conteúdo autônomo — Dornelas IA

O Estúdio IA transforma dados reais do site/Instagram em um pacote comercial pronto para aprovação.

## Capacidades

- analisar o site público configurado em \`SITE_URL\`;
- analisar Instagram/Meta conectado;
- pesquisar assuntos e curiosidades atuais usando pesquisa web da IA;
- montar plano editorial de 7 dias;
- criar campanhas e testes A/B;
- reaproveitar publicações existentes;
- gerar artes com \`gpt-image-2\`;
- gerar cortes de vídeos existentes com FFmpeg;
- publicar imagens e Reels pela API oficial da Meta quando autorizado;
- agendar conteúdos confirmados;
- executar os agendamentos via GitHub Actions a cada 5 minutos.

## Variáveis do Render

Além das variáveis Meta/OpenAI já existentes:

- \`AI_MODEL=gpt-6-luna\`
- \`AI_IMAGE_MODEL=gpt-image-2\`
- \`SITE_URL=https://iinteligenci.github.io/dorn/\`
- \`GITHUB_TOKEN=<token do GitHub com Contents: Read and write no repositório iinteligenci/dorn>\`
- \`CONTENT_ASSET_REPO=iinteligenci/dorn\`
- \`CONTENT_ASSET_BRANCH=main\`
- \`CONTENT_ASSET_BASE_URL=https://iinteligenci.github.io/dorn/\`
- \`SCHEDULE_FILE=generated/ai/schedule.json\`
- \`META_PERSIST_FILE=generated/ai/meta-connection.json\`
- \`SCHEDULER_SECRET=<segredo aleatório forte>\`

O token do GitHub nunca deve ser colocado no código ou no GitHub. A API oficial de Contents aceita tokens fine-grained com permissão Contents: write.

## Agendamento

O workflow \`.github/workflows/content-scheduler.yml\` roda a cada 5 minutos no fuso \`America/Sao_Paulo\`.

Crie no repositório \`iinteligenci/Dornelas-IA\` um Secret de Actions chamado:

\`DORNELAS_SCHEDULER_SECRET\`

O valor deve ser exatamente o mesmo de \`SCHEDULER_SECRET\` no Render.

## Regra de segurança

A IA não publica automaticamente apenas por ter gerado um conteúdo. O conteúdo precisa estar marcado como \`approved=true\` antes de entrar no agendamento/publicação.

A autonomia nível 2 ou superior continua obrigatória para publicação externa.

## Infraestrutura

O Render atual está no plano Free. O filesystem local é efêmero; por isso os ativos e a agenda não ficam no disco local do Render. O projeto usa GitHub como armazenamento externo para esses artefatos.
