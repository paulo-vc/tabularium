# Novidades

As mudanças de cada versão, para quem usa o Tabularium RPG. Detalhes técnicos ficam nos PRs e em [`docs/`](docs/).

## Próxima versão

- **Ajustes de um ensaio com uma mesa nova** (Mestre e jogador do zero, no celular): ao abrir o app, quem só mestra vê a campanha na tela inicial em vez de uma lista de fichas vazia; a ficha do jogador volta para a campanha (não para a lista de fichas); com o jogador conectado, o quadro da sessão diz que a ficha vai junto, em vez de pedir para entrar; o lembrete da cópia de segurança espera uma semana de uso antes de aparecer pela primeira vez; e textos que tratavam o Mestre ou o jogador no masculino ("Você foi convidado", "aparece para ele") ficaram neutros.
- **Feito para o dedo:** em telas de toque (celular e tablet), botões, campos, caixas de marcar, abas e controles deslizantes ficam maiores, assim como as bolinhas de marcar da ficha (como Exaustão), as etiquetas de estado e as alças de arrastar do criador de sistemas. No computador, nada muda. No celular, o cabeçalho cabe inteiro com a sessão aberta, o nome do sistema aparece completo no editor e o botão do chat não cobre mais o rodapé.
- **Testar minha rede:** em Configurações → Conexão, um botão testa em alguns segundos se a rede em que você está deixa a conexão direta abrir, sem conectar a ninguém, e diz o que fazer: rede comum (deve conectar), restritiva (comum no 4G: conecta com quem está numa rede comum; se falhar, tente um Wi-Fi) ou bloqueada (rede de empresa ou faculdade: use outra). Quando a conexão da sessão falha, o aviso aponta para esse teste.
- **Guia de uso:** um guia curto, com imagens, para quem mestra, quem joga e quem cria sistemas, mais o que fazer quando a conexão não abre. Fica no link "Guia de uso", no rodapé do app. A página do projeto foi refeita, com os downloads de Windows, Linux e Android.
- Ao rolar a iniciativa no combate (as criaturas do Mestre ou a do jogador), o resultado aparece só na bandeja dos dados, sem um aviso repetido embaixo.
- **App para Android:** o Tabularium passa a ter um instalador (APK) para Android, o mesmo app do computador, publicado de graça junto de cada versão. No celular, a atualização não é automática: o app avisa quando há versão nova e leva à página para baixar o APK.
- **Criador de sistemas mais fácil:** "Criar sistema" oferece modelos prontos, que já vêm com campos, fórmulas e seções funcionando: **Atributos e perícias (d20)** (seis atributos com modificador, nível, proficiência, perícias, PV, CA, iniciativa e ataques) e **Simples (2d6)** (três atributos pequenos, vida, inventário e anotações). No editor, as **etapas** do sistema (nome e dado, campos, seções, prévia e salvar) se marcam sozinhas e levam à aba certa. No campo de fórmula, **exemplos** prontos (modificador, soma, soma se marcado, cresce com o nível…) já usam os campos do próprio sistema.
- **Dados do sistema e ícone pelo editor:** na aba Informações do criador de sistemas, a seção "Dados do sistema" cria dados com faces próprias sem mexer no arquivo: nome, notação (`4dF`), número de faces, o que cada face mostra e quanto soma, e uma cor fixa opcional. Dá para começar de um modelo pronto: o dado Fate, Esperança e Medo, ou um em branco. O sistema também ganha um **ícone** (uma imagem reduzida a 128 px), que aparece nas listas de sistemas, fichas e campanhas; sem ícone, vale a inicial do nome.
- **Importar sistema mais fácil:** em Sistemas, "Importar sistema" abre uma janela para escolher o arquivo ou colar o JSON. Além do arquivo exportado pelo app, vale o sistema puro (só o template, como quem escreve um sistema à mão costuma ter). Se algo estiver errado, a janela lista cada problema em português, com o lugar dele (ex.: "nome do sistema: esperava um texto, recebeu um número"), e continua aberta para corrigir.
- **Privacidade e segurança:** em Configurações, a seção Privacidade resume o que fica no aparelho e o que passa pela rede, com link para a política completa. Na sessão, o Mestre descarta o que passar de um limite por jogador (mensagens, sussurros e rolagens), para ninguém conseguir inundar a mesa. Restaurar uma cópia de segurança agora confere tudo o que entra: diário, chat, rolagens, imagens e músicas também, além de fichas, campanhas e sistemas.
- **Mestre sempre verificado:** o jogador só aceita como Mestre quem prova ter a chave da campanha. Antes, com um convite sem chave (de campanha criada nas primeiras versões), alguém que só tivesse o convite podia se apresentar como Mestre sem prova. As campanhas antigas do Mestre ganham a chave ao abrir o app, e todo convite passa a levá-la. Convites no formato antigo (das versões 0.1 e 0.2) não valem mais: peça um novo ao Mestre.
- **Cara nova, "Noite arcana":** o app ganhou identidade própria. O tema escuro passa a ser o padrão, num azul-tinta quase preto com um único destaque cobalto e um brilho leve no alto da tela; o claro vira um cinza-azulado frio com o mesmo cobalto. Títulos numa fonte condensada, em caixa alta, como um letreiro; números das fichas, totais e rolagens em fonte mono, que alinham e se leem de relance; cantos mais retos. Em Configurações → Aparência, o claro e o "do sistema" continuam à escolha. No celular, o indicador da sessão do jogador vira só o ícone, para não encavalar no menu.
- **Primeira vez no app:** um aparelho vazio abre nas boas-vindas, com o que é o Tabularium e três caminhos: "Vou mestrar" (criar a campanha), "Vou jogar" (entrar com o convite) e "Só quero uma ficha". Também dá para abrir uma **ficha de exemplo** já preenchida (Thorin, anão guerreiro de nível 3, D&D 5e), para ver como uma ficha funciona; o link aparece também na tela de fichas vazia. Na campanha, uma dica curta explica como a mesa funciona, para o Mestre e para o jogador; fechada, não volta.
- **Cópia de segurança:** em Configurações, "Fazer cópia" guarda tudo o que está no aparelho num arquivo: fichas, campanhas, sistemas criados, diário, preferências e, se quiser, as suas imagens e músicas. "Restaurar uma cópia" mostra o que o arquivo tem e, confirmado, substitui o conteúdo do aparelho por ele. É assim que se troca de computador ou de celular sem perder nada, inclusive sendo o Mestre das mesmas campanhas no aparelho novo. A tela inicial lembra, discretamente, de fazer a cópia quando faz mais de um mês (ou nunca houve); dá para adiar por um mês.

## v0.4.2

Configurações num lugar só, com tema claro ou escuro; dados à direita, girando, com histórico de rolagens; e dados com faces próprias do sistema.

- **Configurações:** a engrenagem no cabeçalho abre uma página com as preferências deste aparelho, num lugar só: seu nome (o que vem preenchido nas próximas campanhas), o **tema** (do sistema, claro ou escuro, novo), sons e avisos, notificações fora do app, dados 3D (cor e animação), música da mesa (volume e "Baixar músicas") e o armazenamento, com quanto o app ocupa e um botão para apagar as músicas recebidas. O ícone de som do cabeçalho deu lugar à engrenagem.
- **Dados à direita, girando:** os dados 3D caem no lado direito da tela, logo abaixo do cabeçalho, e os resultados se empilham embaixo deles: os seus e os da mesa, com quem rolou, a conta e o total. Com o chat aberto, os dados ficam ao lado dele; no celular, aparece só o resultado mais recente. Os dados agora giram sempre, mesmo com as animações do sistema desligadas (era por isso que apareciam parados em alguns computadores); quem preferir pode desligar em "Animar os dados", nas Configurações.
- **Histórico de rolagens:** o chat da sessão ganhou a aba **Rolagens**, com tudo o que a mesa rolou na campanha, com o horário. Tocar num resultado à direita abre o histórico direto.
- **Dados do sistema:** um sistema pode ter dados com faces próprias, como o dado Fate (−, −, 0, 0, +, +) ou os dados de dualidade, com Esperança e Medo em cores diferentes. Rola-se com `d` e o nome do dado, com a quantidade na frente: `4dF`, `1dEsperanca+1dMedo`. Funciona na ficha, no chat (`/r 4dF+2`), no painel do Mestre e na iniciativa. Os dados 3D mostram as faces do sistema, e a mesa confere o resultado como nas outras rolagens. Por enquanto, os dados são definidos no arquivo do sistema (`dice`); no editor, fica para depois.

## v0.4.1

Dados 3D: as rolagens caem na tela e param na face sorteada, e a mesa vê os dados de cada um na cor dele.

- **Dados 3D:** as rolagens agora caem na tela em 3D: d4, d6, d8, d10, d12, d20 e o d100 (dois d10, dezenas e unidades). Os dados giram e param exatamente na face do resultado, que já foi sorteado e conferido, então ninguém vê um número diferente do registrado. Na sessão, cada um vê os dados de todo mundo, como numa torre de dados: as rolagens da mesa aparecem na bandeja, com o resultado embaixo, no lugar do aviso de antes. Nas preferências do ícone de som, dá para desligar os dados 3D ou escolher a cor (marfim, rubi, safira, esmeralda, ametista ou ônix). Com "reduzir movimento" ligado no sistema, os dados aparecem já parados. A parte 3D só carrega na primeira rolagem.
- **Cada um com a sua cor de dados:** a cor escolhida vai junto das suas rolagens, e na sessão a mesa vê seus dados nela. Dá para saber de quem é a rolagem só de olhar. Rolagens de versões anteriores aparecem na cor de quem está vendo.

## v0.4.0

A mesa ganha som e privacidade: música do Mestre, sussurros entre jogadores e um convite curto para digitar. E a ficha agora sai impressa ou em PDF.

- **Convite curto:** além do link, o convite agora tem um código de 20 caracteres para ditar ou digitar no celular (ex.: `K7QM-2XPA-9DFR-WB3N-5T6H`), em Campanhas → Entrar com convite. Ele funciona enquanto a sessão do Mestre está aberta: o app busca com o Mestre o convite completo e confere que veio mesmo dele, então ninguém se passa pelo Mestre só por ter visto o código. Tanto faz maiúsculas, espaços ou trocar O por 0. O código longo, que funciona sem a sessão aberta, continua em "Código completo".
- **Sussurro entre jogadores:** no chat, o campo "Para" agora lista também os outros jogadores online. O sussurro vai cifrado de um aparelho ao outro: passa pelo Mestre, que só repassa e não consegue ler. Os sussurros com o Mestre continuam como antes.
- **Música do Mestre:** na aba Música do painel, o Mestre guarda trilhas (MP3 ou OGG, até 8 MB) e toca uma para a mesa, com pausar, repetir e parar. A trilha chega aos jogadores pela sessão e fica guardada no aparelho deles (tocar de novo não baixa outra vez). Um selo no canto da tela mostra o que toca, o download e o volume da música, que cada um ajusta no próprio aparelho. No 4G, dá para desligar "Baixar músicas" no selo: o aparelho mostra só o título, sem gastar dados. As trilhas recebidas ocupam no máximo 50 MB no aparelho (as mais antigas saem sozinhas).
- **Imprimir a ficha:** no menu de ações da ficha (⋮), "Imprimir ou PDF" abre a ficha como uma folha: todas as abas em sequência, com o retrato, os valores com bônus (ex.: "18 (16 +2)"), as perícias em linhas com as marcas de proficiência, as listas em tabela e os bônus ativos no fim. Textos vazios viram linhas para escrever à mão. Para PDF, escolha "Salvar como PDF" como impressora. Sai sempre em fundo branco, mesmo com o app no tema escuro, e os campos secretos do Mestre não aparecem.

## v0.3.6

Bônus num lugar só, mais fáceis de usar.

- **Bônus mais simples e organizados:** a ficha tinha dois jeitos de fazer a mesma coisa, os "Efeitos temporários" do D&D e do Lendas d20 (em que "Perícias" somava em todas as perícias de uma vez) e o "Bônus" novo. Agora é um só: a seção **Bônus e efeitos**, na aba Combate, onde ficavam os efeitos. Cada bônus vale nos campos que você escolher, um por um: +2 em Furtividade muda só a Furtividade. A escolha do campo tem busca ("furt" acha Furtividade, sem precisar de acento) e vem agrupada pelas seções da ficha (Atributos, Perícias, Resistências…), sem opções que não fazem sentido. D&D 5e 1.6.0 e Lendas d20 1.5.0; os efeitos temporários antigos continuam guardados na ficha, mas não aparecem mais: recrie como bônus os que estiverem em uso.
- **Nome da ficha no celular:** não fica mais espremido ao lado do retrato e do sistema.

## v0.3.5

Mais recursos para a ficha: ataques com um clique, bônus de itens, maldições e bênçãos, e o som dos dados.

- **Som de dados:** rolar dados (pela ficha, pelo painel ou com `/r` no chat) toca o som de dois dados quicando na mesa, também fora da sessão. As rolagens de outras pessoas da mesa tocam o mesmo som. Várias rolagens de uma vez (como várias criaturas rolando a iniciativa) tocam um som só.
- **Ataques pela ficha:** na lista de ataques (aba Combate), cada arma ganha "Ataque", que rola o d20 com o bônus de ataque, e "Ataque + dano", que rola os dois e mostra num aviso só (ex.: "Machado de batalha: ataque 21 · dano 9"). O botão de rolar só o dano continua no campo de dano. Vale no D&D 5e (1.5.0) e no Lendas d20 (1.4.0); as fichas existentes se atualizam sozinhas. Quem cria sistemas pode ligar o mesmo recurso a qualquer lista (`attack` no arquivo do sistema).
- **Bônus de itens, maldições e bênçãos:** o botão "Bônus", no topo da ficha, guarda o que muda valores fixos: um item com +2 de Força, uma bênção com +1 no bônus de proficiência, uma maldição com −2 em Sabedoria e −1 na CA. Cada bônus tem nome, origem e um ou mais campos, e liga e desliga. Vale para qualquer número ou valor calculado de qualquer sistema, e o que depende dele acompanha: +2 de Força muda o modificador, as perícias e os testes de Força. O campo mostra o valor com bônus e, ao passar o mouse, de onde ele vem. Na sessão, o Mestre também aplica bônus na ficha do jogador (pela ficha que ele abre no painel), e chega na hora.

## v0.3.4

Melhorias pedidas depois do teste com o app desktop: o painel do Mestre reorganizado, o aviso da vez mais chamativo e o combate aceitando quem chega depois.

- **Jogadores no combate em andamento:** quem entra na sessão depois de o combate começar aparece em "Fora do combate", no painel do Mestre, e entra na ordem com um clique, sem encerrar o combate. A vez continua com quem estava, e o jogador que entrou vê o botão "Rolar iniciativa" enquanto a dele estiver em 0.
- **Sua vez, mais chamativo:** quando chega a vez do jogador, uma faixa grande aparece no topo de qualquer tela, com a rodada, até ele fechar ou a vez passar. Se o app estiver em outra janela ou aba, o título pisca "⚔ Sua vez!" até ele voltar; no app desktop, o ícone também pisca na barra de tarefas; na versão web, dá para ativar uma notificação do sistema no ícone de som do cabeçalho.
- **Painel do Mestre novo:** a página da campanha deixa de ser uma lista longa. No topo, a sessão (abrir e encerrar) fica sempre à mão. À esquerda, abas: Jogadores (com o convite, que se recolhe quando a mesa enche), Cutscene, Diário e Campanha (capa, convite e excluir). À direita, o combate e as rolagens ficam sempre à vista, acompanhando a página. No celular, o combate e as rolagens também viram abas.

## v0.3.3

- **Sons:** avisos curtos na sessão: a sua vez no combate, rolagens de outras pessoas, mensagens e sussurros do chat. No ícone de som do cabeçalho dá para desligar, ajustar o volume e testar; a escolha fica guardada no aparelho.
- **"É a sua vez!" em qualquer tela:** o aviso da vez no combate aparecia só com a página da campanha aberta. Agora aparece também com a ficha (ou qualquer outra tela) aberta.

## v0.3.2

Imagens para a mesa: o retrato de cada personagem e a capa da campanha. Quem estiver numa versão anterior continua jogando normalmente, só não vê os retratos e a capa (o app desktop se atualiza sozinho).

- **Capa da campanha:** o Mestre escolhe uma imagem em "Adicionar capa", no topo da página da campanha. Ela aparece ali e na lista de campanhas, e chega aos jogadores quando eles entram na sessão (fica guardada no aparelho deles). Trocar ou remover com a sessão aberta chega à mesa na hora.
- **Retrato do personagem:** toque no círculo ao lado do nome da ficha para escolher uma imagem (PNG, JPEG ou WebP). Ela é reduzida no aparelho e fica guardada na própria ficha: aparece na lista de fichas, vai junto ao exportar e chega ao Mestre na sessão, no card do jogador e na ficha que ele abre. Pelo mesmo círculo dá para trocar ou remover.

## v0.3.1

- **Corrigido:** no app desktop (Windows e Linux), as imagens da cutscene não apareciam: a galeria do Mestre mostrava miniaturas quebradas e o jogador não via a imagem em tela cheia. Na versão web já funcionava.

## v0.3.0

A mesa ganha ferramentas de narração: chat, imagens em tela cheia e o diário da campanha. Para usar, todos da mesa precisam estar na v0.3.0: quem estiver numa versão anterior continua jogando (fichas, rolagens e combate), mas não vê o chat, as imagens nem o diário (o app desktop se atualiza sozinho).

- **Chat da sessão:** com a sessão aberta, o botão "Chat" no canto abre a conversa da mesa, em qualquer tela do app. Fale como você ou **como o seu personagem** (o Mestre, como qualquer NPC), descreva ações com `/me` e role dados no meio da conversa com `/r 1d20+3`. **Sussurros:** o Mestre sussurra a um jogador e o jogador ao Mestre; ninguém mais vê. A conversa fica guardada no aparelho, e quem entra no meio da sessão recebe as mensagens recentes.
- **Cutscene:** o Mestre guarda imagens na campanha (NPCs, criaturas, cenários) e as mostra em tela cheia para a mesa, com nome e legenda. Os jogadores veem a imagem em qualquer tela do app; cada um pode fechar a sua, e o Mestre fecha para todos. A imagem é reduzida no aparelho do Mestre e só vai a quem ainda não a tem: mostrar de novo não baixa outra vez.
- **Diário e notas da campanha:** o Mestre escreve entradas com título e texto. Cada uma é uma **nota** (só dele) ou fica **compartilhada com a mesa**, como o diário das sessões. As compartilhadas chegam aos jogadores quando a sessão está aberta e ficam guardadas no aparelho deles, para ler mesmo fora da sessão. Editar, deixar de compartilhar ou apagar também chega à mesa.

## v0.2.2

O app passa a se chamar **Tabularium RPG** na janela, no site e no app instalado pelo navegador. Nada muda no que você já tem: fichas, campanhas e instalação continuam as mesmas (no Windows, o atalho e a lista de aplicativos ainda mostram "Tabularium").

### Combate

- **Rolar a iniciativa pela ficha:** quando o Mestre inicia o combate, cada jogador vê o botão "Rolar iniciativa" (ex.: 1d20+2, já com o modificador da ficha), e o resultado entra direto na ordem de turno. O Mestre continua podendo corrigir. No D&D 5e usa a Iniciativa; no Lendas d20, a Percepção. No criador de sistemas, escolha o campo da iniciativa em Informações.
- **Criaturas rolam a iniciativa:** ao adicionar uma criatura ao combate, o Mestre pode digitar um número (`15`), um modificador (`+2`, que rola o dado do sistema com ele) ou uma rolagem (`2d6+1`). Com **Qtd.**, várias criaturas iguais entram de uma vez ("Goblin 1", "Goblin 2"…), cada uma com a sua rolagem. As rolagens ficam no registro só para o Mestre.

## v0.2.1

### Mesa ao vivo

- **Sair e entrar de novo na sessão é instantâneo.** Antes, voltar depois de sair podia levar uns 9 segundos; o mesmo vale para o Mestre encerrar e reabrir a sessão.
- **Progresso da conexão:** enquanto procura o Mestre, o jogador vê há quanto tempo; ao conectar, quanto levou e como ficou a conexão (direta ou via servidor, com o atraso). O Mestre vê a conexão de cada jogador no card. Se a entrada demorar, esses números ajudam a descobrir o porquê.
- **Convite menor:** o código do convite caiu de cerca de 460 para 190 caracteres. Convites antigos continuam valendo. Quem ainda estiver na v0.2.0 precisa atualizar para ler os convites novos (o app desktop se atualiza sozinho).

### Windows

- **Instalar remove o antigo "Tabula RPG"** (v0.1) que ficava instalado ao lado do Tabularium, sem tocar nas suas fichas.
- O executável passa a se chamar `tabularium.exe` (o que roda sem instalar, `tabularium_windows_x64.exe`; no Linux, `tabularium`). Os atalhos são atualizados sozinhos.

## v0.2.0

O Tabula RPG agora se chama **Tabularium**, com nome, ícone e visual novos. Fichas, campanhas e sistemas continuam onde estavam, e a mesa funciona com quem ainda está na v0.1.

### Ficha mais fácil de usar na mesa

- **Painel fixo no topo:** PV (com dano e cura em um toque), CA, iniciativa, condições e o que mais muda a cada turno ficam sempre à vista e são editados ali mesmo. Clicar no número do PV abre o ajuste de atual, máximo e temporários.
- **Abas** (Principal, Combate, Magias, Inventário, Personagem, Anotações): a ficha inteira sem rolar tanto.
- **Nada aparece duas vezes:** o que está no painel sai das abas.
- **Marcadores** (bolinhas clicáveis, como na ficha de papel) para testes contra a morte, exaustão, espaços de magia, Esperança, Estresse, Heroísmo e similares.
- Atributos em blocos, perícias em linhas e descrições longas que abrem por item.
- Condições: só as ativas ficam à vista; as outras, a um clique.

### Combate

- **Ordem de turno:** o Mestre monta o combate com os jogadores da sessão e as criaturas, define as iniciativas e passa a vez, com contador de rodadas.
- Criaturas podem ficar **ocultas** (só o Mestre vê); na vez delas, os jogadores veem "vez do Mestre".
- Os jogadores veem a ordem ao vivo e recebem o aviso **"É a sua vez!"**.

### Segurança da mesa

- **O Mestre prova quem é.** Antes, quem tivesse o convite podia se passar pelo Mestre e alterar fichas. Agora cada campanha tem uma chave, e o app do jogador só aceita como Mestre quem a possui.
- Campanhas da v0.1 ganham a chave na primeira sessão do Mestre.

### Outros

- **Desktop:** a partir desta versão, o app se atualiza sozinho (só aceita atualizações assinadas pelo projeto).
- **Versão web** em um endereço novo: [paulo-vc.github.io/tabularium](https://paulo-vc.github.io/tabularium/). O endereço antigo não abre mais.
- Criador de sistemas: abas e modos de exibição por seção, "mostrar junto" por campo e a opção de marcadores.
- Sistemas: D&D 5e 1.3.0 e Lendas d20 1.2.0 organizados na ficha nova.
- Corrigido: a mesa podia não se reconectar quando o Mestre recarregava a página.

### Para quem tem a v0.1 instalada

A v0.1 não tem a atualização automática: o app avisa que há versão nova e leva à página de download. Instale a v0.2.0: suas fichas e campanhas continuam lá. Daqui em diante, as atualizações chegam sozinhas.

**No Windows, o "Tabula RPG" (v0.1) continua instalado ao lado do Tabularium.** Os dois usam os mesmos dados: se for desinstalar o antigo, **não marque "Excluir dados do aplicativo"**, ou as fichas do Tabularium também serão apagadas. A próxima versão remove o app antigo sozinha, sem tocar nos dados.

## v0.1.0

Primeira versão pública: fichas de D&D 5e e Lendas d20, sessão ao vivo com o painel do Mestre, rolagens, campos secretos, criador de sistemas e sistemas da comunidade.
