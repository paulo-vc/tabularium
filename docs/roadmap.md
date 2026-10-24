# Roteiro

O que está em andamento e as ideias para depois. As fases já entregues ficam em [`architecture.md`](architecture.md#roadmap); as mudanças de cada versão, no [CHANGELOG](../CHANGELOG.md).

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
- **Configurações** (próxima versão): uma página com as preferências do aparelho (nome, tema, sons, dados, música, armazenamento).
- **Dados do sistema** (próxima versão): faces próprias (`4dF`, Esperança e Medo), na ficha, no chat e em 3D.
- **Dados 3D** (v0.4.1): rolagens em 3D que param na face sorteada; a mesa vê os dados de todos.
- **Música do Mestre** (v0.4.0): trilhas MP3/OGG tocadas para a mesa, com volume por aparelho.
- **Imprimir a ficha** (v0.4.0): folha para papel ou PDF, pelo menu da ficha.
- **Convite curto** (v0.4.0): código de 20 caracteres para digitar, com a sessão do Mestre aberta.
- **Sussurro entre jogadores** (v0.4.0): cifrado de ponta a ponta; o Mestre repassa sem ler.
- **Sons** (v0.3.3): sua vez, rolagens, mensagens e sussurros, com volume e opção de desligar.
- **Capa da campanha** (v0.3.2): escolhida pelo Mestre, chega aos jogadores na sessão.
- **Chat da sessão** (v0.3.0): falar como o personagem, ações com `/me`, rolagens com `/r` e sussurros entre o Mestre e um jogador.

- **Alterar a ficha com a sessão fechada:** a ficha é local-first. O jogador edita fora da sessão e, ao entrar de novo, só as diferenças vão ao Mestre; alterações dos dois lados se combinam (CRDT), sem perder nenhuma.
