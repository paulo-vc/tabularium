# Privacidade

O Tabularium RPG não tem conta, servidor próprio, anúncios nem rastreamento. Ninguém do projeto recebe seus dados.

## O que fica no seu aparelho

Tudo: fichas, campanhas, sistemas, diário, chat, rolagens, imagens, músicas e preferências ficam no banco local do app, no seu computador ou celular. Eles só saem dali quando você exporta um arquivo, faz uma cópia de segurança ou joga uma sessão.

## O que passa pela rede, e por onde

**Na sessão**, os aparelhos da mesa se falam direto, sem passar por servidor (WebRTC, conexão cifrada). Vai de um aparelho ao outro o que a mesa precisa: a ficha de cada jogador (para o Mestre), rolagens, mensagens do chat, imagens e músicas do Mestre. Os sussurros entre jogadores vão cifrados de ponta a ponta: o Mestre repassa, mas não consegue ler.

**Para os aparelhos se acharem**, o app usa serviços públicos de terceiros:

- **Relays Nostr públicos:** recebem o anúncio de que um aparelho quer entrar numa sala. O nome da sala vem da campanha e os dados de conexão vão cifrados com o segredo da campanha (que só está no convite).
- **Servidores STUN públicos** (do Google e da Cloudflare): veem o endereço de internet (IP) do aparelho, para descobrir o caminho da conexão direta.
- **Os outros participantes da mesa** também veem o seu endereço de internet: é assim que funciona uma conexão direta entre aparelhos.

**Fora da sessão:**

- **Atualizações:** o app consulta o GitHub para saber se há versão nova, e o app de computador baixa as atualizações de lá.
- **Catálogo da comunidade:** ao abrir "Explorar comunidade", a lista de sistemas vem do GitHub (pelo jsDelivr).
- **"Reportar um problema"** abre a página do projeto no GitHub, no seu navegador.

## Arquivos que você gera

Fichas e sistemas exportados, e a cópia de segurança, ficam onde você os salvar. A cópia de segurança leva a chave de Mestre das suas campanhas: quem tiver o arquivo pode abrir a sessão como você. Guarde-a só com você.

## Convites

O convite (link, código ou código curto) é o que dá acesso à mesa: quem o tiver entra na campanha. Mande-o só para os seus jogadores. O código curto só funciona com a sessão do Mestre aberta, e ninguém consegue se passar pelo Mestre só por ter o convite.
