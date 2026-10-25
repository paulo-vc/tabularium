# Formatos estáveis

O que o Tabularium grava em arquivos, manda pela rede ou guarda no aparelho. A partir da 1.0, nenhum destes formatos pode quebrar: um arquivo exportado, uma cópia de segurança ou um convite de hoje tem que continuar valendo nas versões seguintes, e versões diferentes do app têm que conseguir jogar juntas.

Antes da 1.0 (em 2026-10), sem usuários a proteger, saiu o que existia só por compatibilidade com versões antigas:

- o convite em JSON (v0.1/v0.2): só vale o formato compacto;
- o Mestre "declarado", que entrava sem provar a chave: o jogador só aceita o Mestre que prova;
- a chave do Mestre opcional no convite: todo convite leva a chave (as campanhas antigas a ganham ao abrir o app).

## Os formatos

| Formato                              | Versão                                | Onde                                                                     |
| ------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------ |
| Arquivo exportado (ficha ou sistema) | `formatVersion: 1`                    | `domain/export/envelope.ts` (`tabula/sheet`, `tabula/template`)          |
| Sistema (template)                   | schema `SystemTemplateSchema`         | `domain/template/schema.ts` (`minAppVersion` opcional)                   |
| Cópia de segurança                   | `format: tabula/backup`, `version: 1` | `storage/backup.ts`                                                      |
| Convite (link e código)              | formato binário `2`, convite `v: 1`   | `app/invite-codec.ts`, `app/invite-link.ts`                              |
| Código curto do convite              | 20 caracteres (base32 de Crockford)   | `sync/invite-lobby.ts`                                                   |
| Protocolo da sessão                  | `PROTOCOL_VERSION = 1`                | `sync/protocol.ts` (mensagens 0 a 19) e sala do convite (`0xC8`, `0xC9`) |
| Banco local (IndexedDB)              | versão 11                             | `storage/database.ts`                                                    |

`apps/web/src/app/formats.test.ts` trava os bytes do convite e do código curto: se um deles mudar, o teste quebra.

## Regras depois da 1.0

- **Acrescentar, não mudar.** Campos novos entram como opcionais; quem não os conhece os ignora (os schemas descartam chaves desconhecidas). Mensagens novas do protocolo ganham um número novo, e quem não as conhece as ignora.
- **Mudança incompatível pede versão nova** (`formatVersion`, `version`, `PROTOCOL_VERSION` ou o número do formato do convite), e a versão nova continua lendo a anterior. Quem recebe uma versão mais nova do que conhece mostra "atualize o app", nunca um erro genérico.
- **Banco local:** cada mudança é uma chamada nova a `this.version(n)`, com a migração dos dados; versões anteriores nunca são editadas.
- **Rolagens com dados do sistema** (`custom` no termo) são recusadas pelas versões anteriores à v0.4.2; a mesa deve estar toda numa versão que as conheça.
