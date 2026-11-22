# Pacotes de one-shot

Cada pasta aqui é uma one-shot com personagens prontos: a ficha e o histórico de cada um em
imagem, e um `pacote.json` (formato em `../pacote.ts`). O app embute os pacotes que
encontrar nesta pasta.

**Esta pasta fica fora do Git** (só este README é versionado): os pacotes costumam ter arte e
texto de terceiros, que não podem ir para o repositório público nem para as releases. Eles
entram só nos builds feitos na máquina que tem a pasta, e esses instaladores se mandam
diretamente para quem vai jogar.

Para gerar os instaladores com o pacote:

```
corepack pnpm --filter @tabula/desktop tauri build
```
