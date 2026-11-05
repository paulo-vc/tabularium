# Sistemas para o repositório da comunidade

Arquivos prontos para publicar no repositório `tabula-templates`. Eles **não** vêm embutidos
no app, porque a licença do sistema não cobre claramente apps de ficha. No repositório da
comunidade, cada pessoa decide instalar.

| Arquivo              | Sistema                               | Licença                                   |
| -------------------- | ------------------------------------- | ----------------------------------------- |
| `dualidade.json`     | Compatível com Daggerheart™ (SRD 1.0) | Darrington Press Community Gaming License |
| `pathfinder-2e.json` | Pathfinder 2e (fã), antes Lendas d20  | Política de uso da Paizo e ORC            |

Regras da DPCGL seguidas: o nome "Daggerheart" não aparece no título, só como
"compatível com" na descrição, que traz a atribuição exigida. Antes de publicar, confira a
versão atual da licença em https://darringtonpress.com/license.

O Pathfinder 2e mantém o `id` `lendas-d20-orc` do sistema que vinha no app, para as fichas antigas
receberem a versão nova como atualização. Ele segue a política de uso da Paizo (Community Use
Policy, paizo.com/licenses/communityuse): gratuito, não oficial e com o aviso exigido na descrição.

Os testes em `src/community.test.ts` passam cada arquivo pelas mesmas regras da publicação
(`prepareSubmission`).
