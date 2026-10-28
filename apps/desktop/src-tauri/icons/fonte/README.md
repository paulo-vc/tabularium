# Fonte do ícone

O ícone "Vinte" (o d20 sobre o azul-tinta do app) sai destes arquivos. Os PNG, `.ico` e `.icns` da pasta de cima e os ícones da web (`apps/web/public/icon*.png` e `icon.svg`) são gerados a partir deles.

- `icone.svg`: o ícone com cantos arredondados (computador e app).
- `android-fundo.svg` e `android-frente.svg`: as camadas do ícone adaptável do Android. O aparelho mostra só os 2/3 centrais e corta no próprio formato (círculo ou quadrado arredondado), por isso o fundo não tem cantos e o d20 fica dentro da zona segura.
- `android-monocromatico.svg`: o d20 numa cor só, para os ícones temáticos do Android 13+.
- `manifesto.json`: liga os arquivos acima para o `tauri icon`.

Depois de mudar o desenho, na raiz do repositório:

```bash
pnpm --filter @tabula/desktop exec tauri icon "$(pwd)/apps/desktop/src-tauri/icons/fonte/manifesto.json"
```

Apague as pastas `android/` e `ios/` que o comando cria em `icons/`: o ícone do Android é gerado a cada build pelo workflow Android, e não há app para iOS. Para a web, copie `icone.svg` para `apps/web/public/icon.svg` e gere os PNG de 192 e 512 com `tauri icon icone.svg -p 192 -p 512 -o <pasta>`.
