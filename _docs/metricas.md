# metricas.js, contrato e regras

Código-fonte comentado: `_docs/metricas.fonte.js`. O arquivo `js/metricas.js` é a versão minificada dele (esbuild --minify).

```
/* GYZA, medição de visitas sem cookie (v2, 06/11/2026): conta pessoas e ações de forma anônima.
   Sem cookie, sem IP guardado no site, sem fingerprint. Quem conta "pessoas únicas por dia" é o banco: ele cria um código
   (hash) a partir da conexão e do navegador, mistura com um segredo e a data, e guarda só o código, que muda todo dia.
   O site só guarda no sessionStorage o código da aba e a origem do primeiro contato (some ao fechar a aba).
   Respeita "não rastrear" (doNotTrack) e Global Privacy Control. Falha em silêncio: nunca quebra a página.

   Contrato com o banco: POST /rest/v1/rpc/registrar_evento_site
     { p_tipo, p_pagina, p_ref, p_sessao, p_detalhe, p_disp, p_medio, p_campanha, p_afiliado }
   Tipos extras do formulário: form_erro (detalhe = campo ou "envio"), form_voltou, form_abandono_etapa (detalhe = etapa em que saiu), clique_email.
   Tipos: visita, clique_analise (detalhe = onde: topo, menu, abertura, case, rodape...), form_inicio (primeiro campo tocado), form_etapa2,
     form_enviado, form_whatsapp, clique_whatsapp, clique_instagram, clique_linkedin, abriu_case (detalhe = qual),
     rolagem_50 e rolagem_90 (só na página inicial).
   Origem (primeiro contato da sessão): utm_source ou domínio de quem mandou; utm_medium (bio, stories, pagina...); utm_campaign;
     gclid sem utm_medium vira medio "cpc" (Google Ads); ?ref=CODIGO (afiliado ou parceiro) vale para a sessão inteira.
     O banco agrupa em instagram, google, linkedin, whatsapp, facebook, direto, outros. O ?ref= também fica 30 dias no localStorage
     (gyza_ref: só o código e a validade, sem renovar). O banco só credita o afiliado se o código existir e estiver ativo.
   window.gyzaMetrica(tipo, detalhe) é chamado por js/form.js; window.gyzaOrigem() devolve a origem para o pedido do formulário.

   Tráfego nosso: abrir gyza.com.br/?interno=1 grava gyza_interno=1 no localStorage DESTE aparelho e dali em diante ele não envia
   nada (nem eventos). ?interno=0 desfaz. É a única coisa que o site grava no aparelho, e só nos aparelhos da equipe.
   O banco também descarta robôs e navegadores sem janela (HeadlessChrome, Playwright, bot, Lighthouse, Vercel, preview...).
   Teste local: hostname 127.0.0.1/localhost não envia; ?metricas=teste força o envio. */
```
