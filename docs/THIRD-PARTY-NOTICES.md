# Avisos de software de terceiros

Projeto Sistema Interno para Empresas — versão 2.3.0. Inventário preparado em 07/10/2026.

A [licença proprietária do projeto](../LICENSE) abrange o código original sobre o qual Lucas Cerbaro Aguiar detém direitos. Bibliotecas, componentes, ícones, estilos e outros materiais de terceiros continuam sujeitos às respectivas licenças. As restrições do projeto não substituem nem limitam as permissões que os titulares desses materiais concedem separadamente.

## Conteúdo preservado

- [Inventário legível de dependências](licenses/INVENTARIO.md): nome, versão, licença declarada e ligação para os textos preservados.
- [Inventário detalhado em JSON](licenses/inventory.json): entradas do lock, identificação das cópias locais, origem e SHA-256 dos avisos.
- [Pacotes identificados no JavaScript compilado](licenses/bundle-packages.json): resultado de uma recompilação local da interface, sem gravação sobre os arquivos de produção.
- [Licenças dos pacotes npm](licenses/npm/): cópias dos arquivos de licença, avisos e atribuição das bibliotecas identificadas na interface compilada e no CSS, obtidas dos pacotes locais da mesma versão registrada no lock. As demais dependências aparecem somente no inventário.
- [Avisos adicionais obtidos na origem](licenses/upstream/): textos de projetos cujo pacote npm omitiu a licença principal ou parte dela; as fontes e o alcance da conferência constam no inventário JSON.

O inventário cobre as 882 entradas de `frontend/package-lock.json`, agrupadas em 838 combinações de nome e versão. A coleta encontrou 675 entradas instaladas com versões correspondentes e 207 entradas não instaladas, principalmente variantes opcionais de outras plataformas. A presença no lock não significa que o código do pacote faça parte dos arquivos compilados ou seja redistribuído neste repositório.

## Materiais incluídos na aplicação

### Interface compilada

Os arquivos JavaScript de `public/assets/` incluem partes de React, React DOM, Radix UI, Floating UI, Lucide, Recharts e suas dependências, entre outras bibliotecas. A recompilação identificou 71 nomes de pacotes com módulos JavaScript retidos. Todos têm textos de licença ou avisos preservados nesta pasta, considerando o pacote disponível de cada nome e versão. A lista é um inventário técnico da recompilação, não uma declaração de autoria sobre essas bibliotecas.

Os avisos completos de [Lucide](licenses/npm/lucide-react/1.31.0/LICENSE) também preservam a atribuição dos ícones derivados do projeto Feather. Os avisos de [Victory Vendor](licenses/npm/victory-vendor/37.3.6/lib-vendor/) preservam as licenças das cópias internas de D3 e Internmap; a [licença principal do tag v37.3.6](licenses/upstream/victory/LICENSE.txt) complementa esses arquivos.

### Estilos e componentes de interface

- Tailwind CSS 4.2.1: [licença MIT](licenses/npm/tailwindcss/4.2.1/LICENSE).
- `tw-animate-css` 1.4.0: [licença MIT](licenses/npm/tw-animate-css/1.4.0/LICENSE).
- Componentes baseados em shadcn/ui e CSS vendorizado identificado como `shadcn-tailwind-4.13.0.css`: [licença MIT, copyright 2023 shadcn](licenses/vendored/shadcn-ui/LICENSE.md). O mesmo aviso acompanha o CSS em `frontend/vendor/`. As adaptações específicas do projeto não eliminam os direitos sobre a base original.

### Envio de e-mail

`server/vendor/nodemailer/` contém Nodemailer 10.0.10. Sua [licença MIT-0 original](licenses/vendored/nodemailer/LICENSE) também permanece no diretório do código vendorizado. Não se aplica a esse componente a restrição de redistribuição do código original do projeto.

### Ambiente de execução

Node.js e Windows não são redistribuídos neste pacote. São instalados separadamente e conservam suas licenças. A pasta `node_modules` também não é incluída; o processo de desenvolvimento instala as dependências conforme o lock.

## Textos adicionais conferidos na origem

O pacote `react-remove-scroll-bar` 2.3.8 declara MIT, mas não trouxe arquivo `LICENSE` separado. Foi preservado o [texto publicado pelo autor](licenses/upstream/react-remove-scroll-bar/LICENSE), consultado no [repositório oficial](https://github.com/theKashey/react-remove-scroll-bar/blob/master/LICENSE) em 07/10/2026. Esse texto foi obtido do ramo principal; não foi localizado um tag da versão com o arquivo.

O pacote `@radix-ui/react-compose-refs` 1.1.2 também declara MIT e omite um arquivo separado. Foi preservado o [aviso do projeto Radix Primitives](licenses/upstream/radix-ui-primitives/LICENSE), conferido no [repositório oficial](https://github.com/radix-ui/primitives/blob/main/LICENSE). O texto coincide com os avisos de outros componentes Radix presentes no ambiente de compilação.

Para Victory, foi usado o arquivo do [tag oficial v37.3.6](https://github.com/FormidableLabs/victory/blob/v37.3.6/LICENSE.txt), além dos avisos internos copiados do pacote instalado.

## Ferramentas e dependências opcionais

O lock também registra licenças como Apache-2.0, MPL-2.0 e LGPL-3.0-or-later. Entre os exemplos estão Lightning CSS, ferramentas de compilação e variantes de Sharp/libvips ligadas às dependências de Next/Cloudflare. Essas entradas não autorizam a substituição das licenças de tais componentes por uma licença proprietária. Seus binários não foram incluídos como `node_modules` neste pacote e não foram identificados na lista de módulos JavaScript retidos da interface.

Ao preparar outra forma de distribuição — por exemplo, um instalador que inclua Node.js, `node_modules`, Sharp ou libvips — é necessário revisar os avisos e obrigações daquilo que for efetivamente incluído. Este inventário não certifica uma distribuição futura diferente desta.

Alguns pacotes de ferramentas declaram licença nos metadados, mas não fornecem texto separado no pacote local. O inventário os identifica como “Sem texto local”, sem inventar avisos ou atribuições. Variantes opcionais não instaladas estão identificadas como “Não instalado”.

## Atualizações e conservação dos avisos

Conserve esta pasta junto ao código-fonte e aos arquivos compilados quando fizer uma cópia autorizada do projeto. Preserve também os comentários de licença emitidos pelas ferramentas nos arquivos JavaScript e CSS. Ao alterar versões ou acrescentar dependências, atualize o inventário e copie os respectivos avisos, incluindo arquivos `NOTICE`, quando existirem.

Os arquivos de licença e avisos prevalecem sobre descrições resumidas deste documento. Os nomes dos projetos identificam os componentes utilizados e não indicam patrocínio, vínculo ou aprovação de seus titulares.
