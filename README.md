# Dornelas IA

Sistema separado do site dos Defumados Dornelas para operar marketing, vendas e automações com IA.

## Princípios
- O site atual dos Defumados permanece intocado.
- Integrações usam APIs/OAuth oficiais e permissões mínimas.
- Ações sensíveis podem exigir aprovação humana.
- Toda ação da IA deve gerar registro/auditoria.

## MVP
1. Painel de comando
2. Cadastro de produtos, preços e estoque
3. Planejamento e geração de campanhas
4. Aprovação de ações
5. Integrações externas desacopladas
6. Métricas e histórico

## Estrutura planejada
- `apps/web`: painel
- `apps/api`: API/backend
- `packages/core`: regras de negócio
- `packages/integrations`: conectores externos
- `packages/ai`: orquestração do agente

> Nenhuma credencial deve ser commitada neste repositório. Use variáveis de ambiente/secret manager.


## Aquisição e conversão
A aba **Aquisição** organiza campanhas por canal, gera links com parâmetros UTM e permite registrar manualmente cliques observados, conversas, pedidos, faturamento e investimento, além de exportar CSV.

**Limitação atual:** os registros dessa aba ficam no armazenamento local do navegador/aparelho. Não há sincronização entre dispositivos e os números não são coletados automaticamente pelo site ou pelo WhatsApp. Os links UTM identificam a campanha no endereço, mas a medição automática exige instrumentação adicional no site e uma camada de armazenamento segura. Use números observados; não insira dados pessoais de clientes.


## Configuração do backend (Render)

A integração de texto usa o **Lovable AI Gateway**, não a API direta da OpenAI.

Variáveis necessárias:
- `LOVABLE_API_KEY`: chave do gateway, configurada somente no ambiente do servidor.
- `LOVABLE_AI_GATEWAY_URL`: opcional; padrão `https://ai.gateway.lovable.dev/v1`.
- `AI_MODEL`: padrão `google/gemini-2.5-flash`; confirme disponibilidade no gateway da conta.
- `SITE_URL`: padrão `https://iinteligenci.github.io/Site-dornelas/`.
- `AI_IMAGE_MODEL`: opcional; só habilite depois de confirmar que o modelo e o endpoint de imagem são suportados pelo gateway.
- `CONTENT_ASSET_REPO`: repositório onde imagens/ativos públicos são salvos; atualmente o padrão permanece `iinteligenci/dorn`.

Depois de configurar as variáveis no Render, faça um deploy e valide `/health`, uma conversa de IA e a leitura do catálogo. A existência da chave não comprova que o modelo ou a conta tenham acesso; teste as chamadas reais.


## Proteção administrativa do backend

As rotas de IA e operações que alteram dados exigem uma sessão administrativa via cookie HttpOnly, Secure e SameSite=None. O frontend pede a senha quando uma sessão ainda não existe; a senha não deve ser colocada no código do site.

No Render, configure:
- `ADMIN_PASSWORD`: crie uma senha longa e exclusiva para a Dornelas IA.
- `ADMIN_SESSION_SECRET`: segredo aleatório forte (o Render pode gerar um valor ao aplicar o Blueprint).

Após configurar as variáveis, publique o serviço e valide o login. A sessão expira após 8 horas. Não habilite publicação automática antes de testar autenticação, cookies entre GitHub Pages e Render e as rotas de publicação. A configuração no repositório não altera as variáveis de um serviço Render que já existe até que você aplique/atualize o Blueprint.
