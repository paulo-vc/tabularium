# 0010 — Distribuição da 1.0: desktop e Android, sem site

- **Status:** Aceita
- **Data:** 2026-10-28
- **Substitui em parte:** [0005](0005-distribuicao.md) (a versão web publicada como site)

## Contexto

A [0005](0005-distribuicao.md) previa publicar a mesma build web como site, para quem não quisesse instalar e para macOS e celular. Com o app Android pronto (APK nas releases, assinado) e a 1.0 voltada a grupos que instalam o app, manter o site no ar dividia a atenção: mais uma plataforma para testar a cada versão, dados presos à origem do navegador e uma versão que o usuário não escolhe atualizar (o navegador troca o app sem aviso, e a mesa pode ficar com versões diferentes).

## Decisão

- A 1.0 é distribuída como **app desktop** (Windows e Linux, pelo Tauri) e **app Android** (APK nas releases do GitHub, sem Play Store, para manter o custo zero).
- O site (`paulo-vc.github.io/tabularium`, publicado pelo workflow `pages.yml`) foi desligado em 2026-10-28: o workflow saiu do repositório e o GitHub Pages foi desativado.
- O app web continua sendo a base dos dois apps e é onde rodam os testes (`pnpm dev`, `pnpm e2e`), só não é publicado.

## Consequências

- Os apps instalados não dependem do site: o convite deles é o código e o código curto, sem link (`publicAppUrl` devolve `null` fora do navegador).
- Convites em forma de link gerados pelo site deixam de abrir. Como os convites do formato antigo já não valem na 1.0, a mesa precisa de convites novos de qualquer forma.
- macOS e iOS ficam sem app (exigem conta paga da Apple). Se houver procura, o site pode voltar: basta restaurar o `pages.yml` do histórico do Git.
