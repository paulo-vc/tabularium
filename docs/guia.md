# Guia de uso

Como jogar com o Tabularium RPG: para quem mestra, para quem joga e para quem cria sistemas. Tudo fica no seu aparelho, sem conta.

- [Primeiros passos](#primeiros-passos)
- [Para o Mestre](#para-o-mestre)
- [Para o jogador](#para-o-jogador)
- [Na sessão](#na-sessão)
- [Para quem cria sistemas](#para-quem-cria-sistemas)
- [Não perder nada](#não-perder-nada)
- [Quando a conexão não abre](#quando-a-conexão-não-abre)

## Primeiros passos

Baixe o instalador do computador (Windows ou Linux) ou o APK do Android na [página de versões](https://github.com/paulo-vc/tabularium/releases). Na primeira vez, o app pergunta o que você quer fazer: mestrar, jogar ou só montar uma ficha. Se quiser só conhecer, abra a ficha de exemplo.

![Boas-vindas, com os três caminhos](imagens/boas-vindas.png)

A ficha calcula sozinha o que depende de outros valores (modificadores, perícias, CA). Os botões de dado ao lado dos valores rolam o teste.

![Ficha de exemplo](imagens/ficha.png)

## Para o Mestre

1. Em **Campanhas**, toque em **Nova campanha**, dê um nome e escolha o sistema.
2. Mande o **convite** aos jogadores: o link, ou o **código curto** de 20 letras, bom para ditar ou digitar no celular (ele só funciona com a sessão aberta).
3. Quando o jogo começar, toque em **Iniciar sessão**. Os jogadores entram pela campanha deles, e você vê as fichas mudando ao vivo.

![O convite da campanha](imagens/convite.png)

![O Mestre com a sessão aberta](imagens/mestre-sessao.png)

Na sessão, o Mestre também tem: o **combate** (ordem de turno, com criaturas ocultas que só ele vê), as **rolagens** (inclusive secretas), **cutscene** (imagens em tela cheia para a mesa), **música** (trilhas que tocam no aparelho de todos), o **diário** (notas só suas e entradas para a mesa) e a ficha de cada jogador, que ele pode alterar.

![Combate com uma criatura](imagens/combate.png)

## Para o jogador

1. Abra o link do convite, ou em **Campanhas → Entrar com convite** cole o link ou digite o código curto.
2. Escolha uma ficha sua ou crie uma nova, do sistema da campanha.
3. Quando o Mestre abrir a sessão, toque em **Entrar na sessão**. A ficha vai junto: o que você mudar nela aparece para o Mestre na hora.

![A campanha do lado do jogador](imagens/jogador-campanha.png)

Quando chega a sua vez no combate, o app avisa com uma faixa grande na tela e um som (e, no computador, o ícone pisca na barra de tarefas).

## Na sessão

**Dados.** Toda rolagem cai na tela em 3D, à direita, e para na face sorteada; a mesa vê os dados de todos, cada um na cor de quem rolou (escolha a sua em Configurações). Tocar num resultado abre o histórico de rolagens.

![Dados e resultados à direita](imagens/dados.png)

**Chat.** Fale como você ou como o personagem, descreva ações com `/me`, role com `/r 1d20+3` e sussurre a uma pessoa só. Os sussurros entre jogadores vão cifrados: nem o Mestre lê.

![O chat da sessão](imagens/chat.png)

No celular, o app é o mesmo, com a ficha em uma coluna.

![A ficha no celular](imagens/celular.png)

## Para quem cria sistemas

Em **Sistemas → Criar sistema**, comece de um modelo pronto (d20 ou 2d6), em branco, ou de uma cópia de um sistema que você já tem. O editor mostra as etapas e a prévia da ficha ao lado.

![O criador de sistemas](imagens/criador.png)

- **Campos:** números, textos, recursos (como PV), listas (ataques, inventário), escolhas e campos calculados por [fórmulas](formulas.md). O campo de fórmula traz exemplos prontos.
- **Dados do sistema:** dados com faces próprias, como o dado Fate (`4dF`) ou Esperança e Medo.
- **Ícone:** uma imagem pequena que aparece nas listas.
- **Importar:** em Sistemas → Importar sistema, escolha o arquivo ou cole o JSON (o exportado pelo app ou só o sistema). Os problemas aparecem com o lugar de cada um.

Para dividir com outras pessoas, exporte o sistema ou publique na comunidade (Sistemas → Explorar comunidade).

## Não perder nada

Tudo fica no aparelho. Em **Configurações → Cópia de segurança**, "Fazer cópia" guarda fichas, campanhas, sistemas e preferências num arquivo. Para trocar de computador ou de celular, restaure a cópia no aparelho novo: você continua sendo o Mestre das mesmas campanhas. A cópia leva a sua chave de Mestre, então guarde o arquivo só com você.

## Quando a conexão não abre

Os aparelhos da mesa se conectam direto, sem servidor no meio. Na maioria das redes funciona; em algumas (redes de empresa, faculdade e, às vezes, o 4G) a conexão direta é bloqueada. Para saber antes do jogo, use **Configurações → Conexão → Testar minha rede**: em alguns segundos o app diz se a sua rede conecta direto, se é restritiva (comum no 4G) ou se bloqueia a conexão. Se alguém ficar em "procurando o Mestre":

- troque de rede (o Wi-Fi de casa costuma funcionar);
- no 4G, quem estiver nele pode tentar compartilhar a internet do celular com o computador;
- confira se todos estão na mesma versão do app.

Mais detalhes sobre o que passa pela rede em [Privacidade](privacidade.md).
