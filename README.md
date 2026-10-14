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
