# OrbeLabz - Apuração

Painel público em tema escuro com resultados oficiais do TSE para o Brasil e os brasileiros que votam no exterior. Inclui estados, países, continentes e localidades eleitorais; a seleção Américas reúne as localidades eleitorais do continente.

A seleção de governador, senador e deputados abre a aba Brasil e permite escolher o estado. Na presidência, a ordem de exibição personalizada coloca Flávio Bolsonaro e Lula primeiro; os dados e os votos permanecem oficiais.

Paleta da marca: preto espacial `#090B14`, azul-marinho `#0E1B3D`, azul elétrico `#3B82F6`, ciano `#22D3EE` e violeta `#8B5CF6`.

## Atualização dos resultados

A página consulta os dados a cada 30 segundos enquanto está visível. O total mundial usa a totalização nacional do TSE, que já inclui o exterior, evitando contar votos duas vezes. Cargos estaduais são exibidos na seleção Brasil; o exterior vota para presidente.

Antes da divulgação oficial, a página mostra o estado de preparação e não inventa votos. Se o TSE estiver indisponível, a última resposta permanece identificada, com aviso de falha e a data da fonte.

## Hospedagem

O GitHub Pages publica o frontend em `docs/`, a partir da branch `main`. A API em `app/api/` consulta e valida os arquivos oficiais do TSE na hospedagem de servidor do painel. A API permite leitura pelo domínio GitHub da OrbeLabz e por seu domínio já existente; não recebe credenciais nem permite edição.

A separação é necessária porque GitHub Pages hospeda arquivos estáticos e o TSE não habilita CORS nos arquivos de resultados para consulta direta pelo navegador. O código do frontend e da API fica versionado neste repositório.

## Desenvolvimento e publicação

Requer Node 22.13+ e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build:pages
touch docs/.nojekyll
```

Versionar os arquivos de `docs/` junto com o código. Cada commit em `main` que atualize `docs/` aciona a publicação do GitHub Pages. Mudanças na API precisam também de publicação na hospedagem do servidor; o identificador do projeto está em `.openai/hosting.json`.

## Permissões

Este repositório é público para consulta. Somente a conta proprietária e acessos de escrita que ela autorizar podem alterar ou publicar o código. Não adicionar colaboradores de escrita sem autorização do proprietário.

## Fontes

- Resultados oficiais: https://resultados.tse.jus.br/
- Informações técnicas: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados
- Cartografia: IBGE e Natural Earth.
