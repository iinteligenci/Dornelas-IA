# Dornelas IA — base estática

Painel operacional inicial dos Defumados Dornelas, preparado para funcionar no GitHub Pages sem backend, sem chaves de API e sem IA por enquanto.

## Funcionalidades disponíveis no navegador

- Cadastro local de produtos e preços.
- Criação de campanhas e links com parâmetros UTM.
- Registro manual de cliques, conversas, pedidos, faturamento e investimento.
- Rascunhos de conteúdo por modelos fixos, sem geração por IA.
- Agenda manual de conteúdo.
- Exportação e importação de backup JSON.

## Publicação pelo GitHub

O workflow `.github/workflows/deploy-pages.yml` constrói o frontend e publica a pasta `dist` no GitHub Pages quando a branch `main` recebe alterações. O caminho de entrada usa URL relativa para funcionar no endereço de projeto do GitHub Pages.

## Limitações importantes

- Os dados são armazenados em `localStorage` no navegador atual; não sincronizam entre aparelhos nem usuários.
- O backup JSON permite transferir os dados manualmente.
- Não há coleta automática de visitas, integração com Instagram/Meta, publicação automática ou IA.
- Não coloque credenciais, senhas ou chaves secretas no frontend ou neste repositório.
- O backend antigo permanece no repositório como código de referência, mas não é necessário para esta versão estática.

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
```

Esta versão é a base simples para validar o fluxo operacional antes de escolher banco de dados, backend ou integrações que exijam credenciais.
