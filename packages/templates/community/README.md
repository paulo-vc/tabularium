# Sistemas para o repositório da comunidade

Arquivos prontos para publicar no repositório `tabula-templates`. Eles **não** vêm embutidos
no app, porque a licença do sistema não cobre claramente apps de ficha. No repositório da
comunidade, cada pessoa decide instalar.

| Arquivo                       | Sistema                               | Licença                                   |
| ----------------------------- | ------------------------------------- | ----------------------------------------- |
| `dualidade.json`              | Compatível com Daggerheart™ (SRD 1.0) | Darrington Press Community Gaming License |
| `ordem-paranormal-fan.json`   | Ordem Paranormal RPG                  | Ficha de fã, não oficial                  |
| `chamado-cthulhu-7e-fan.json` | Call of Cthulhu 7ª edição             | Ficha de fã, não oficial                  |
| `tormenta20-fan.json`         | Tormenta20                            | Ficha de fã, não oficial                  |

Regras da DPCGL seguidas: o nome "Daggerheart" não aparece no título, só como
"compatível com" na descrição, que traz a atribuição exigida. Antes de publicar, confira a
versão atual da licença em https://darringtonpress.com/license.

Os testes em `src/community.test.ts` passam cada arquivo pelas mesmas regras da publicação
(`prepareSubmission`).

As fichas de fã (`*-fan.json`) só trazem a estrutura da ficha e as fórmulas; nenhum texto
dos livros. A descrição de cada uma deixa claro que é não oficial.
