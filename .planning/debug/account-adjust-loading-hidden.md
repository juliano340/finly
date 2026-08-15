---
status: awaiting_human_verify
trigger: "no ajuste de saldo, interface e toast atualizam na ordem correta, mas o loading não fica visível"
created: 2026-08-15
updated: 2026-08-15
---

## Symptoms

- expected: Durante ajuste e recarga da conta, botão deve ficar desabilitado e exibir Ajustando...
- actual: Botão permanece como Ajustar saldo; após conclusão formulário fecha/atualiza e toast aparece.
- errors: Nenhum erro visível relatado.
- timeline: Observado após ordenar atualização da interface antes do toast.
- reproduction: Abrir conta > Ajuste de saldo, informar novo valor e clicar Ajustar saldo.

## Current Focus

- hypothesis: O callback de action não aguarda handleAdjustment e desmonta o formulário imediatamente via setShowForm(null), ocultando o estado adjustSubmitting antes de qualquer render visível.
- test: Tornar o callback assíncrono e aguardar handleAdjustment antes de fechar/resetar o formulário; verificar lint/build e o fluxo de submissão.
- expecting: Botão permanece montado e mostra Ajustando... durante fetch e recarga; formulário fecha somente após conclusão.
- next_action: Usuário confirmar no navegador que botão mostra Ajustando... e permanece desabilitado durante ajuste/recarga.
- reasoning_checkpoint:
    hypothesis: "O callback síncrono da action inicia handleAdjustment sem await e fecha o formulário no mesmo evento; isso desmonta o botão que renderizaria adjustSubmitting=true."
    confirming_evidence:
      - "handleAdjustment chama setAdjustSubmitting(true) antes do primeiro await."
      - "action atual executa handleAdjustment(...); setShowForm(null); setAdjustTarget(\"\") sem aguardar a Promise."
      - "showForm === \"adjust\" controla a montagem do formulário e botão, portanto setShowForm(null) remove ambos imediatamente."
      - "Documentação bundled Next.js 16 recomenda manter o botão dentro do formulário durante estado pending para exibir loading."
    falsification_test: "Se, após aguardar handleAdjustment antes do fechamento, o botão ainda não renderizar Ajustando... enquanto fetch permanece pendente, a causa não é a desmontagem precoce."
    fix_rationale: "Aguardar a operação mantém o formulário montado durante toda a Promise, permitindo que estado existente renderize; fechamento e reset continuam ocorrendo na mesma ordem, apenas após conclusão."
    blind_spots: "Sem teste de componente existente para esta página; verificação automatizada cobre tipagem/lint/build, mas pintura visual final requer fluxo no navegador."
- tdd_checkpoint:

## Evidence

- timestamp: 2026-08-15
  checked: Implementação completa de src/app/(dashboard)/bank-accounts/page.tsx.
  found: handleAdjustment define adjustSubmitting=true antes do fetch e restaura false no finally.
  implication: Estado de loading existe e engloba ajuste mais recarga da lista.
- timestamp: 2026-08-15
  checked: Callback action do formulário de ajuste.
  found: Callback não retorna/aguarda handleAdjustment e chama setShowForm(null) imediatamente; showForm controla montagem do formulário.
  implication: Botão é desmontado no mesmo evento de submit, antes de loading poder ficar visível.
- timestamp: 2026-08-15
  checked: node_modules/next/dist/docs/01-app/02-guides/forms.md, seção Pending states.
  found: Next.js 16 documenta pending/useFormStatus com botão aninhado no formulário durante execução da action.
  implication: UI de pending precisa permanecer montada enquanto action está em execução.
- timestamp: 2026-08-15
  checked: git diff do componente antes da correção.
  found: Alterações preexistentes ordenam await fetchAccounts antes do toast no sucesso e mantêm recarga no erro.
  implication: Mudanças do usuário são independentes e devem ser preservadas.
- timestamp: 2026-08-15
  checked: Estado pending do botão antes da correção.
  found: useFormStatus não existia; botão dependia somente de adjustSubmitting manual.
  implication: Adicionado useFormStatus conforme documentação bundled, mantendo fallback do estado manual.
- timestamp: 2026-08-15
  checked: Verificações automatizadas.
  found: ESLint focado passou após correção async/await inicial; suíte Vitest não produziu saída e expirou em 124s; build e comando final lint+tsc foram interrompidos pelo timebox.
  implication: Nenhuma falha automatizada foi observada, mas suíte/build permanecem inconclusivos e fluxo visual requer verificação humana.

- timestamp: 2026-08-15
  checked: Final focused ESLint after useFormStatus addition.
  found: PASS with exit code 0.
  implication: Final pending-button implementation passes scoped lint validation.

## Eliminated

## Resolution

- root_cause: Callback action do ajuste dispara handleAdjustment sem await e fecha o formulário imediatamente, desmontando o botão antes do render de adjustSubmitting=true.
- fix: Callback action agora aguarda handleAdjustment antes de fechar/resetar o formulário; botão filho usa useFormStatus pending (com fallback adjustSubmitting) para mostrar Ajustando... e ficar desabilitado durante toda a action.
- verification: ESLint focado passou antes da adição final de useFormStatus. Vitest expirou sem saída; build e lint+tsc final interrompidos por timebox. Verificação visual humana pendente.
- files_changed: [src/app/(dashboard)/bank-accounts/page.tsx]
