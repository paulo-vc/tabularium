# Roteiro

O que está em andamento e as ideias para depois. As fases já entregues ficam em [`architecture.md`](architecture.md#roadmap); as mudanças de cada versão, no [CHANGELOG](../CHANGELOG.md).

## Plano para a 1.0

Desde a v0.4.2 (2026-10), sem lançar versões: o projeto ainda não é distribuído, então o foco é chegar a uma 1.0 pronta para outras pessoas. Até lá, o `main` segue sempre funcionando (PRs, `pnpm check`, testes de ponta a ponta), o CHANGELOG acumula em "Próxima versão" e, para testar o app instalado, vale o instalador gerado pelo workflow "Desktop" em cada PR.

**Plataformas da 1.0** (decidido em 2026-10-24): **desktop e Android**. A versão de navegador deixa de ser distribuída; o app web continua sendo a base do desktop e do celular e é onde rodam os testes, mas não é publicado como site.

**A 1.0 está pronta quando** um grupo que nunca viu o app consegue, sem ajuda: instalar no computador ou no Android, criar as fichas, entrar na mesa pelo convite, jogar uma sessão inteira e voltar na semana seguinte com tudo no lugar, inclusive trocando de aparelho.

### Essencial

1. **Não perder nada.** Feito: a cópia de segurança completa (Configurações → Cópia de segurança), que também leva as campanhas do Mestre a outro aparelho, e o lembrete na tela inicial. O que era:
   - cópia de segurança completa do aparelho num arquivo (fichas, campanhas com a chave do Mestre, sistemas, diário; imagens e trilhas opcionais) e restaurar a partir dela;
   - levar uma campanha de Mestre para outro aparelho;
   - lembrete discreto de fazer a cópia (ex.: depois de uma sessão, se a última tem mais de um mês).
2. **Conectar sempre que der, sem retransmissão** (decidido: a 1.0 segue só com conexão direta, [ADR 0008](adr/0008-lancar-sem-relay.md); nada de servidor para manter). Falta medir de verdade, sobretudo no 4G do Android (a ferramenta `tools/conn-test` existe), aproveitar tudo o que a conexão direta permite e, quando ela falhar, explicar com clareza o que fazer (ex.: trocar para o Wi-Fi, usar o celular como roteador para os outros).
3. **Primeira experiência.** Feito: boas-vindas no aparelho vazio (mestrar, jogar ou só uma ficha), ficha de exemplo e dicas na campanha, para o Mestre e para o jogador. O convite e o combate já se explicam na própria tela.
4. **Revisão de interface.** Feito: identidade visual "Noite arcana" (escuro como padrão, cobalto, títulos condensados, números em mono) e uma passada tela por tela, nos dois temas e no celular, com prints reais.
5. **Formatos estáveis.** Feito: saíram o convite em JSON e o Mestre sem prova, todo convite leva a chave do Mestre, e os formatos da 1.0 e as regras para mudá-los estão em [`formatos.md`](formatos.md), com testes que travam os bytes do convite. Os efeitos temporários antigos dos sistemas ficam para quando os sistemas forem retomados.
6. **Segurança e privacidade.** Feito: revisão do que vem de outros participantes, de arquivos e cópias, do app desktop e do convite; limite por jogador no que ele manda à mesa; conferência completa da cópia de segurança; e a [política de privacidade](privacidade.md), resumida em Configurações.

### Importante

- **App no celular** (decidido: entra na 1.0, só Android). Tauri 2 para Android, com o mesmo código do desktop; o que muda na interface (toques, telas pequenas, teclado). Distribuído de graça, como instalador (APK) nas releases do GitHub, sem Play Store. iOS fica de fora: publicar exige um Mac e a conta paga da Apple, e o projeto não tem custos.
- **Criador de sistemas mais fácil** (decidido: entra na 1.0; ver abaixo), com os dados do sistema e o ícone pelo editor.
- **Importar sistemas mais fácil.** Já dá para importar o arquivo `.json` de um sistema (Sistemas → Importar sistema), mas só no formato exportado pelo app (com o "envelope"). Falta aceitar também o sistema puro, colar o JSON direto e mostrar os erros de um jeito que quem escreve o arquivo entenda.
- **Guia de uso.** Curto e com imagens: para o Mestre, para o jogador e para quem cria sistemas. E uma página do projeto para quem chega pelo link.

### Depois da 1.0

Soundboard, YouTube ou Spotify na música, textura dos dados, resultado da dualidade e outras ideias abaixo.

### Decisões tomadas

- Desktop e Android; o site deixa de ser distribuído; sem iOS.
- Sem retransmissão (TURN): só conexão direta, com a falha bem explicada.
- Custo zero também para o projeto: Android pelo APK nas releases, sem Play Store.
- O criador de sistemas mais fácil e a importação de sistemas entram na 1.0.

## Depois (sem data)

Ideias levantadas em 2026-10, ainda sem desenho. A ordem não é de prioridade.

### Criador de sistemas mais fácil

O criador está completo, mas ainda é difícil para quem não está acostumado com campos, fórmulas e seções. Caminhos possíveis: começar de um modelo pronto (atributos, perícias, recursos), assistentes por etapa e exemplos ao lado das fórmulas.

### Dados 3D: o que falta

Os dados 3D e os dados com faces do sistema já existem. Faltam: criar os dados do sistema pelo editor (hoje, só no arquivo do sistema), textura e mostrar o resultado dos dados de dualidade ("com Esperança" ou "com Medo").

### Ícone do sistema

O retrato do personagem e a capa da campanha já existem (v0.3.2). Falta o ícone do sistema, que iria junto do arquivo do sistema (e do catálogo da comunidade).

### Ferramentas do Mestre

- **Soundboard:** efeitos curtos disparados pelo Mestre, no mesmo esquema da música (que já existe).
- **Links do YouTube ou Spotify** na música: dependem dos termos e dos players oficiais de cada serviço, e o Spotify exige conta.

## Já existe

- **Notas e diário da campanha** (v0.3.0): notas só do Mestre e entradas compartilhadas com a mesa.
- **Cutscene** (v0.3.0): imagens do Mestre em tela cheia para a mesa.
- **Retrato do personagem** (v0.3.2): imagem na ficha, que vai junto ao Mestre e na exportação.
- **Configurações** (v0.4.2): uma página com as preferências do aparelho (nome, tema, sons, dados, música, armazenamento).
- **Dados do sistema** (v0.4.2): faces próprias (`4dF`, Esperança e Medo), na ficha, no chat e em 3D.
- **Dados 3D** (v0.4.1): rolagens em 3D que param na face sorteada; a mesa vê os dados de todos.
- **Música do Mestre** (v0.4.0): trilhas MP3/OGG tocadas para a mesa, com volume por aparelho.
- **Imprimir a ficha** (v0.4.0): folha para papel ou PDF, pelo menu da ficha.
- **Convite curto** (v0.4.0): código de 20 caracteres para digitar, com a sessão do Mestre aberta.
- **Sussurro entre jogadores** (v0.4.0): cifrado de ponta a ponta; o Mestre repassa sem ler.
- **Sons** (v0.3.3): sua vez, rolagens, mensagens e sussurros, com volume e opção de desligar.
- **Capa da campanha** (v0.3.2): escolhida pelo Mestre, chega aos jogadores na sessão.
- **Chat da sessão** (v0.3.0): falar como o personagem, ações com `/me`, rolagens com `/r` e sussurros entre o Mestre e um jogador.

- **Alterar a ficha com a sessão fechada:** a ficha é local-first. O jogador edita fora da sessão e, ao entrar de novo, só as diferenças vão ao Mestre; alterações dos dois lados se combinam (CRDT), sem perder nenhuma.
