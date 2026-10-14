# Dornelas IA

Sistema independente para apoiar marketing, vendas e operações dos Defumados Dornelas.

## Objetivo desta base

Manter o código desacoplado de provedores de hospedagem e de IA para que a arquitetura possa ser definida antes da escolha da infraestrutura.

## Princípios

- O site comercial da Dornelas é um projeto separado.
- Integrações externas ficam isoladas em módulos próprios.
- Credenciais e tokens não entram no repositório.
- Ações sensíveis exigem validação e, quando aplicável, aprovação humana.
- Decisões e ações automatizadas devem ter rastreabilidade.
- Nenhuma publicação ou alteração externa deve ser presumida como concluída sem confirmação.

## Módulos atuais

- Painel web em React.
- API/backend em Node.js.
- Agente comercial e prompts.
- Conectores para Meta/Instagram e Google.
- Camada de IA baseada em API compatível com Chat Completions, configurada por ambiente.
- Integração opcional com GitHub para persistência de dados e ativos.
- Aquisição: links UTM e registro manual de campanhas, conversas, pedidos, faturamento e investimento.

## Configuração local

1. Instale uma versão atual do Node.js.
2. Instale as dependências do frontend com `npm install`.
3. Instale as dependências do backend em `server` com `npm install`.
4. Copie `.env.example` para `.env` e preencha apenas os valores necessários ao ambiente local.
5. Execute o frontend com `npm run dev`.
6. Execute o backend com o comando `npm start` dentro de `server`; ajuste os scripts conforme a arquitetura definida.

A camada de IA requer `AI_API_BASE_URL`, `AI_API_KEY` e `AI_MODEL` de um provedor compatível. Nenhum provedor específico é selecionado por padrão. A geração de imagens depende do suporte do provedor escolhido.

## Aquisição e conversão

A aba **Aquisição** organiza campanhas por canal, gera links com parâmetros UTM e permite registrar manualmente cliques, conversas, pedidos, faturamento e investimento, além de exportar CSV.

**Limitação atual:** esses registros ficam no armazenamento local do navegador/aparelho. Não há sincronização entre dispositivos nem coleta automática de visitas ou pedidos. Os links UTM identificam a campanha no endereço, mas a medição automática exige instrumentação adicional no site e uma camada de armazenamento segura. Não registre dados pessoais de clientes.

## Próxima etapa

Definir arquitetura de execução, banco de dados, autenticação, observabilidade e estratégia de implantação antes de conectar um novo provedor ou ambiente de hospedagem.
