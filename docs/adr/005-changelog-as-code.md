# ADR-005: Changelog como Codigo Tipado

## Status

Accepted

## Context

Changelogs em Markdown sao difficeis de integrar na UI do app e ficam desatualizados rapido. O projeto precisa de um changelog que sirva tanto para humans (GitHub) quanto para a UI interna (pagina de releases).

## Decision

- `src/content/releases.ts` armazena releases como array tipado e readonly.
- Cada release tem: versao, data, categorias (Adicionado/Corrigido/Seguranca/etc.), e itens descritivos.
- A pagina `(public)/changelog` renderiza os dados diretamente.
- `scripts/generate-changelog.ts` gera `CHANGELOG.md` a partir dos dados tipados.
- `src/__tests__/release.test.ts` valida consistencia (versoes ordenadas, datas validas, duplicatas).

## Consequences

**Positivo:**
- Changelog sempre consistente (tipado, testado).
- Unica fonte de verdade para UI e Markdown.
- Releases sao versionados como codigo (revisaveis, revertiveis).

**Negativo:**
- Mais trabalho que Markdown puro (precisa de schema + gerador).
- Script de geracao precisa de manutencao.
