# GYZA, site institucional

Site da GYZA, agência de marketing 360°. No ar em https://gyza.com.br (Vercel, projeto `gyza`).

## Páginas
- `index.html` (home: abertura, dor, pirâmide 3D, cases, formulário)
- `servicos.html`, `metodo.html`, `contato.html`, `privacidade.html`

## Estrutura
- `css/style.css`: o visual de todas as páginas. `css/servicos.css`: só a página de Serviços.
- `js/main.js`: movimento da home (GSAP). `js/gl.js`: pirâmide 3D (three.js), carregada só perto da seção.
- `js/form.js`: formulário da análise (home e contato), não depende do GSAP.
- `js/menu.js`: menu do celular e tom do topo nas páginas internas. `js/servicos.js`: trilho e entradas de Serviços.
- `assets/`: fonte DM Sans (WOFF com subconjunto latino), imagens, cases, imagem de compartilhamento `og-gyza.jpg`.
- `_social/`: fontes HTML dos posts do Instagram (não vão para o site).

## Regra do ?v= (cache)
Os arquivos CSS e JS são chamados com `?v=NÚMERO`. Mexeu em qualquer CSS ou JS: troque o número nas 5 páginas, todas com o mesmo número. Comando único (troque NOVO pelo número novo):
```
sed -i '' -E 's/\?v=[0-9]{10}/?v=NOVO/g' index.html servicos.html metodo.html contato.html privacidade.html
```
Os pôsteres da pirâmide (`pyr-poster*.webp?v=`) têm número próprio em `js/gl.js` e `js/main.js`: suba quando trocar a imagem.

## O que muda em todas as páginas (editar as 5)
Topo, menu do celular, rodapé, botão fixo do celular e o símbolo do logo estão copiados em cada HTML. Ao mudar qualquer item abaixo, mude nas 5:
- links do menu (Serviços, Método, Contato) e do rodapé (Início, Serviços, Método, Contato, Política de privacidade);
- WhatsApp (47) 99260-6871 (`wa.me/5547992606871`), e-mail agenciagyza@gmail.com, Instagram @gyza.ag;
- razão social e CNPJ da linha legal do rodapé;
- o formulário é igual em `index.html` e `contato.html` (o JS é um só, `js/form.js`).

## Segurança
- `vercel.json` tem os cabeçalhos (CSP). O CSP libera o `importmap` do `index.html` pelo hash: se mudar o importmap, recalcule o hash, senão a pirâmide 3D some.
- `.vercelignore` tira do deploy os arquivos de trabalho (md, scripts, `_social`, png da raiz, TTF e a pirâmide em PNG). Print de teste nunca na raiz do projeto.

## Rodar localmente
```
python3 -m http.server 8091
```
e abrir http://127.0.0.1:8091. Os links internos são limpos (`/servicos`), como na Vercel (`cleanUrls`); o servidor simples do Python não entende endereço sem `.html`, então abra as páginas pelo nome (`/servicos.html`) ou use um servidor que resolva `.html`.
