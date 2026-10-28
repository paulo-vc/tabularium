# Lançamento da v0.1

Roteiro dos passos fora do código. A ordem importa: o repositório da comunidade e a versão web precisam existir antes de anunciar.

## 1. Repositório da comunidade (`paulo-vc/tabula-templates`)

O nome está fixo no app (`apps/web/src/app/registry.ts`).

```bash
gh repo create paulo-vc/tabula-templates --public --description "Sistemas da comunidade para o Tabula RPG"
gh repo clone paulo-vc/tabula-templates ../tabula-templates
pnpm --filter @tabula/registry export ../tabula-templates
cd ../tabula-templates
node scripts/tabula-registry.mjs add ../tabularium/packages/templates/community/dualidade.json paulo-vc
node scripts/tabula-registry.mjs index
git add -A && git commit -m "Esqueleto do repositório e Dualidade" && git push
gh label create publicar --color 5319e7 --description "Pedido de publicação de sistema"
gh api -X PUT repos/paulo-vc/tabula-templates/actions/permissions/workflow \
  -f default_workflow_permissions=write -F can_approve_pull_request_reviews=true
```

Conferir: `https://cdn.jsdelivr.net/gh/paulo-vc/tabula-templates@main/index.json` mostra a Dualidade, e "Explorar comunidade" no app a lista.

## 2. Tornar o repositório do app público

- O histórico foi verificado: sem tokens, chaves ou arquivos de ambiente. Os e-mails dos autores dos commits ficam visíveis.
- Depois de público, aplicar a proteção da `main` e ligar o GitHub Pages (por Actions):

```bash
gh repo edit paulo-vc/tabularium --visibility public --accept-visibility-change-consequences
gh api -X POST repos/paulo-vc/tabularium/rulesets --input .github/rulesets/main.json
gh api -X POST repos/paulo-vc/tabularium/pages -f build_type=workflow
gh workflow run pages.yml
```

Conferir: `https://paulo-vc.github.io/tabularium/` abre o app, e um convite gerado ali começa com esse endereço.

## 3. Release

```bash
git tag v0.1.0 && git push origin v0.1.0
```

O workflow `release.yml` gera um **rascunho** com o instalador do Windows (NSIS/MSI), o executável solto e os pacotes Linux. Antes de publicar o rascunho:

- [ ] Instalar no Windows e abrir (aceitar o aviso do SmartScreen).
- [ ] Sessão ao vivo **no app instalado**: Mestre no desktop, jogador na versão web, em redes diferentes. Inclui: o Mestre alterar a ficha, um campo secreto e uma rolagem.
- [ ] Instalar um sistema da comunidade no app instalado.
- [ ] Escrever as notas da versão (o que tem, limitações: sem relay; macOS só pela web).

Publicado o rascunho, o app desktop das próximas versões avisa sozinho quando houver atualização (consulta as releases do GitHub).

## 4. Depois do lançamento

- **Assinatura do Windows:** pedir à [SignPath Foundation](https://signpath.org/apply) (gratuito para projetos open source, exige o repositório público). Remove o aviso do SmartScreen.
- **Atualização automática:** feita (plugin updater do Tauri). A chave privada de assinatura fica nos segredos `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, com backup fora do computador: perdê-la impede atualizar quem já instalou. Releases deixam de ser pré-lançamento, porque o app procura a atualização em `releases/latest`.
- **Ordem Paranormal:** só com autorização da Jambô, ou como ficha "inspirada", com outro nome e sem textos dos livros.
- **Nome do repositório:** `tabula-rpg` passou a `tabularium` (2026-10-10). O GitHub redireciona o `git`, as páginas e os downloads das releases, então o desktop instalado continua achando as atualizações. O endereço da versão web mudou para `paulo-vc.github.io/tabularium` e o antigo **não** redireciona: convites gerados antes da mudança e apps web instalados pelo endereço antigo deixam de abrir. Nunca criar um repositório novo chamado `tabula-rpg`: isso desliga o redirecionamento do GitHub e quebra a atualização do desktop.

## Identificadores do app desktop

Mudar estes nomes tem efeito em quem já instalou:

- `identifier` (`tauri.conf.json`): define a pasta de dados (fichas, campanhas). **Nunca mudar.**
- `productName`: no Windows, define a pasta de instalação e a entrada em "Aplicativos instalados". Ao mudar de "Tabula RPG" para "Tabularium", a versão nova passou a se instalar **ao lado** da antiga, com os mesmos dados; o gancho `src-tauri/windows/hooks.nsh` remove a instalação antiga.
- Nome do pacote Rust (`Cargo.toml`): é o nome do executável. O instalador do Windows troca o executável e os atalhos sozinho; no Linux, o pacote `.deb`/`.rpm` (chamado `tabularium`) remove o arquivo antigo.

## Android: chave de assinatura (uma vez)

O APK das releases é assinado com uma chave que fica só nos segredos do repositório. Todas as versões precisam da **mesma** chave: um APK assinado com outra não instala por cima do anterior. Guarde o arquivo `.jks` e a senha em lugar seguro, fora do repositório.

1. Gere a chave (o `keytool` vem com o Java). Use a **mesma senha** para o arquivo e para a chave:

   ```
   keytool -genkey -v -keystore tabularium.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tabularium
   ```

2. Converta o arquivo para base64 (PowerShell):

   ```
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("tabularium.jks")) | Set-Content tabularium.jks.base64
   ```

3. Cadastre os segredos no repositório (Settings → Secrets and variables → Actions):
   - `ANDROID_KEYSTORE`: o conteúdo de `tabularium.jks.base64`;
   - `ANDROID_KEY_ALIAS`: `tabularium`;
   - `ANDROID_KEY_PASSWORD`: a senha.

Sem os segredos, o workflow Android gera só um APK de teste (artefato do build), que não é anexado à release.

## v0.2.0

1. Mesclar o PR da versão (números de versão em `apps/web/package.json`, `tauri.conf.json` e `Cargo.toml`, e o [CHANGELOG](../CHANGELOG.md)).
2. Criar e enviar a tag:

```bash
git tag v0.2.0 && git push origin v0.2.0
```

3. O `release.yml` gera um **rascunho** com os instaladores assinados e o `latest.json`. Antes de publicar:
   - [ ] Instalar no Windows **por cima da v0.1.0** e conferir que fichas e campanhas continuam lá.
   - [ ] Na v0.1.0 instalada, conferir que o aviso de versão nova aparece e leva à página da release (a v0.1 não tem a atualização automática).
   - [ ] Sessão ao vivo no app instalado com um jogador na versão web (`paulo-vc.github.io/tabularium`): ficha, ordem de turno, rolagem.
   - [ ] Colar o trecho da v0.2.0 do CHANGELOG como notas da release.
4. Publicar o rascunho como versão normal (não pré-lançamento), para o `releases/latest` passar a apontar para ela.
5. Depois de publicada:
   - Mesclar o PR do `tabula-templates` com o nome novo e a verificação do formato novo.
   - Publicar a Dualidade 1.2.0 no `tabula-templates` (ela pede o app 0.2.0; quem está na v0.1 vê "requer app novo").
   - Na v0.3, conferir a primeira **atualização automática** de verdade (da v0.2.0 instalada para a seguinte).

## v0.2.1

Mesmo roteiro da v0.2.0 (tag `v0.2.1`, conferir o rascunho, publicar como versão normal), com duas conferências a mais:

- [ ] **Primeira atualização automática:** na v0.2.0 instalada, o app deve oferecer a v0.2.1 e se atualizar sozinho.
- [ ] **Windows com a v0.1 ainda instalada ao lado:** depois de instalar a v0.2.1, só o Tabularium aparece em "Aplicativos instalados", os atalhos "Tabula RPG" somem e as fichas continuam lá.

## v0.2.2

Mesmo roteiro (tag `v0.2.2`, conferir o rascunho, publicar como versão normal). O nome visível passa a "Tabularium RPG"; o `productName` continua "Tabularium" de propósito (ver "Identificadores do app desktop"), então a instalação não muda.

- [ ] Na v0.2.1 instalada, a atualização automática chega e o título da janela passa a "Tabularium RPG".

## v0.3.0

Mesmo roteiro (tag `v0.3.0`, conferir o rascunho, publicar como versão normal). O banco local passa para a v10 (tabelas novas do diário, das imagens e do chat; os dados existentes não mudam).

- [ ] Na v0.2.2 instalada, a atualização automática chega e as fichas e campanhas continuam lá.
- [ ] Sessão com o Mestre no app instalado e um jogador na versão web: diário compartilhado, cutscene (a imagem chega e abre em tela cheia) e chat (fala de personagem, `/me`, `/r` e um sussurro).

## v0.3.1

Correção da CSP do app desktop: `img-src` passa a aceitar `blob:`, que a galeria, a prévia e a cutscene usam para mostrar as imagens guardadas no aparelho. O teste `apps/web/src/lib/desktop-csp.test.ts` confere a CSP, porque o navegador e os testes não a aplicam.

- [ ] Na v0.3.0 instalada, a atualização chega, e as miniaturas da galeria e a cutscene do jogador aparecem.

## v0.3.2

Mesmo roteiro (tag `v0.3.2`, conferir o rascunho, publicar como versão normal). Sem mudança no banco local: o retrato fica na ficha e a capa na campanha.

- [ ] Na v0.3.1 instalada, a atualização chega, e as fichas e campanhas continuam lá.
- [ ] No app instalado, escolher um retrato e uma capa (a CSP do desktop precisa aceitar as imagens `data:`).
- [ ] Sessão entre o app instalado e a versão web: o Mestre vê o retrato da jogadora no card, e a jogadora recebe a capa.

## v0.3.3

Mesmo roteiro (tag `v0.3.3`, conferir o rascunho, publicar como versão normal). Sem mudança no banco local: as preferências de som ficam na tabela `settings`.

- [ ] Na v0.3.2 instalada, a atualização chega.
- [ ] No app instalado, o ícone de som do cabeçalho toca o "Testar" (o WebView do desktop precisa liberar o áudio depois do clique).
- [ ] Sessão com a ficha aberta: a vez no combate mostra "É a sua vez!" e toca; mensagens, sussurros e rolagens da mesa também tocam.

## v0.3.4

Mesmo roteiro (tag `v0.3.4`, conferir o rascunho, publicar como versão normal). Sem mudança no banco local. Permissão nova no desktop: `core:window:allow-request-user-attention` (piscar o ícone na barra de tarefas).

- [ ] Na v0.3.3 instalada, a atualização chega.
- [ ] Painel do Mestre: abas à esquerda, combate e rolagens à direita, e o convite se recolhendo quando um jogador entra.
- [ ] Com o app do jogador em outra janela, na vez dele: o título pisca e, no desktop, o ícone pisca na barra de tarefas.
- [ ] Um jogador que entra com o combate em andamento aparece em "Fora do combate" e entra na ordem.

## v0.3.5

Mesmo roteiro (tag `v0.3.5`, conferir o rascunho, publicar como versão normal). Sem mudança no banco local. D&D 5e vai para 1.5.0 e Lendas d20 para 1.4.0 (só o número do meio: as fichas se atualizam sozinhas).

- [ ] Na v0.3.4 instalada, a atualização chega, e as fichas abrem no sistema novo sem perder nada.
- [ ] Ficha de D&D: "Ataque" e "Ataque + dano" na aba Combate, com o som dos dados.
- [ ] Bônus: +2 de Força muda o modificador e as perícias; na sessão, o Mestre aplica uma maldição pela ficha do jogador e ela chega na hora.

## v0.3.6

Mesmo roteiro (tag `v0.3.6`, conferir o rascunho, publicar como versão normal). Sem mudança no banco local. D&D 5e vai para 1.6.0 e Lendas d20 para 1.5.0: saem os "Efeitos temporários" (guardados na ficha, sem aparecer).

- [ ] Na v0.3.5 instalada, a atualização chega, e as fichas abrem no sistema novo.
- [ ] Aba Combate: "Bônus e efeitos" adiciona um bônus numa perícia só (busca "furt"), e só ela muda.
- [ ] No celular (versão web), o nome da ficha aparece inteiro.

## v0.4.0

Mesmo roteiro (tag `v0.4.0`, conferir o rascunho, publicar como versão normal). O banco local vai para a v11 (tabela `tracks`, das trilhas); a migração é automática. A política de segurança do desktop libera `media-src blob:` para a música. O protocolo ganhou mensagens novas (música, sussurro, sala do convite curto); versões antigas ignoram o que não conhecem.

- [ ] Na v0.3.6 instalada, a atualização chega, e campanhas e fichas abrem como antes.
- [ ] Música: o Mestre no desktop toca uma trilha MP3; o jogador na web ouve, pausa e repete acompanham, e "Baixar músicas" desligado mostra só o título.
- [ ] Sussurro: com dois jogadores, um sussurra ao outro, e o chat do Mestre não mostra nada.
- [ ] Convite curto: com a sessão aberta, um jogador digita o código no celular e entra.
- [ ] Imprimir: "Imprimir ou PDF" no menu da ficha abre a impressão do sistema no desktop.

## v0.4.1

Mesmo roteiro (tag `v0.4.1`, conferir o rascunho, publicar como versão normal). Sem mudança no banco local. As rolagens ganham o campo opcional `diceColor`, que versões antigas ignoram. A parte 3D (three.js) vem num pedaço separado, carregado na primeira rolagem.

- [ ] Na v0.4.0 instalada, a atualização chega.
- [ ] No app desktop, rolar mostra os dados 3D (ou parados, com as animações do Windows desligadas).
- [ ] Na sessão, a cor escolhida por um jogador aparece nos dados dele na tela do Mestre.
- [ ] Desligar "Dados 3D nas rolagens" volta ao aviso de antes.

## v0.4.2

Mesmo roteiro (tag `v0.4.2`, conferir o rascunho, publicar como versão normal). Sem mudança no banco local. As rolagens com dados do sistema levam o dado inteiro (`custom`); versões anteriores recusam essas rolagens, então a mesa toda deve estar na v0.4.2 para usá-las. O tema escolhido fica no `localStorage`.

- [ ] Na v0.4.1 instalada, a atualização chega.
- [ ] No app desktop, os dados giram (mesmo com as animações do Windows desligadas) e caem à direita, com os resultados embaixo.
- [ ] Na sessão, tocar num resultado abre a aba Rolagens do chat, com o histórico.
- [ ] A engrenagem abre as Configurações; o tema escuro vale e continua depois de fechar e abrir o app.
- [ ] Um sistema importado com dados próprios (ex.: `4dF`) rola pela ficha e pelo chat, e a mesa vê as faces do sistema.

## v1.0.0

A primeira versão para outras pessoas: desktop (Windows e Linux) e Android. Roteiro completo, porque muda mais coisa que as anteriores.

**Antes da tag:**

- [ ] **Chave do Android** nos segredos do repositório ([passos acima](#android-chave-de-assinatura-uma-vez)). Sem ela, o workflow Android gera só o APK de teste e não anexa nada à release.
- [x] **Versão web:** desligada em 2026-10-28 ([ADR 0010](adr/0010-distribuicao-desktop-e-android.md)). Os apps instalados não dependem dela: o convite deles é o código e o código curto, sem link.
- [ ] **PR da versão:** `1.0.0` em `apps/web/package.json`, `apps/desktop/src-tauri/tauri.conf.json` e `Cargo.toml`; o "Próxima versão" do [CHANGELOG](../CHANGELOG.md) vira "v1.0.0", com um resumo no topo.
- [ ] Mesclado o PR, conferir que o `main` tem `1.0.0` no `apps/web/package.json` e só então criar e enviar a tag:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

**Conferir o rascunho** (o `release.yml` gera os instaladores do desktop; o `android.yml` anexa o APK):

- [ ] O APK assinado (`Tabularium_1.0.0_android.apk`) está no rascunho. Quem instalou um APK de teste precisa desinstalá-lo antes (a chave é outra).
- [ ] Na v0.4.2 instalada no Windows, a atualização para a 1.0 chega, e campanhas e fichas abrem como antes. As campanhas antigas do Mestre ganham a chave ao abrir o app.
- [ ] Sessão de verdade: o Mestre no desktop e um jogador no Android pelo 4G ou 5G, entrando pelo código curto. Ficha ao vivo, rolagem com dados 3D, combate (aviso da vez), chat e música.
- [ ] No Android, Configurações → Conexão → Testar minha rede responde, e o link "Guia de uso" abre o navegador.
- [ ] Notas da release: o trecho da v1.0.0 do CHANGELOG, avisando que **a mesa toda precisa estar na 1.0** (o jogador só aceita o Mestre com prova da chave, e convites do formato antigo não valem mais).

**Publicar** o rascunho como versão normal, para o `releases/latest` apontar para ela. Depois, atualizar o README se algo dos downloads mudou e marcar a 1.0 como entregue no [roteiro](roadmap.md).
