# Guia de Formulários

Contrato de UI para formulários de criação/edição do Finly. Seguir este guia mantém os forms consistentes e acessíveis. Referência viva: `src/app/(dashboard)/transactions/_components/transaction-form.tsx`.

## 1. Escolha do container

| Situação | Container |
| --- | --- |
| Form com mais de 3 campos | `Sheet` (drawer à direita), `SheetContent className="w-full sm:max-w-md"` |
| Form com até 3 campos | `Dialog`, `DialogContent className="sm:max-w-[400px]"` |
| Confirmação destrutiva | `ConfirmDialog` ou `DeleteDialog` |
| Edição inline em página | `Card` com `<form>` |

## 2. Estrutura padrão (Sheet)

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent className="w-full sm:max-w-md">
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
    </SheetHeader>
    <form
      className="flex-1 overflow-y-auto px-4 pb-4"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <div className="mt-4 space-y-6">
        <FormSection icon={Tag} title="Detalhes">
          {/* campos */}
        </FormSection>
        <FormSection icon={CalendarDays} title="Quando">
          {/* campos */}
        </FormSection>
      </div>

      <FormActions onCancel={() => onOpenChange(false)} loading={loading} />
    </form>
  </SheetContent>
</Sheet>
```

Regras:

- Seções agrupam campos relacionados com ícone + título (`FormSection`); use quando o form tiver 2+ grupos lógicos.
- Ações sempre no final do `<form>`: `FormActions` (Sheet) ou `DialogFooter` + `SubmitButton` (Dialog).
- Nunca renderize botão único `w-full` como ação de submit; o par Cancelar/Salvar é o padrão.
- Formulários novos não devem reutilizar os mesmos `useState` para abrir/fechar: o estado de `open`/`editing` fica na página, o form recebe por props.

## 3. Campos

| Campo | Primitivo |
| --- | --- |
| Texto, número, data simples | `Input` dentro de `FormField` |
| Valor monetário | `MoneyInput` (máscara + prefixo R$ + normalização no blur) |
| Data | `DateInput` |
| Mês | `MonthInput` (use quando o dia não importa para a regra) |
| Seleção | `Select` com a prop `items` preenchida |
| Toggle binário (tipo) | `TypeToggle` ou `radiogroup` próprio |
| Escolha entre 2-3 modos | `SegmentedControl` |

Regras:

- Todo campo tem label; use `FormField` para label/erro/hint (ele injeta `id`, `aria-invalid` e `aria-describedby` no filho).
- Marque obrigatórios com `required` no `FormField` (asterisco) e valide via schema — não confie no `required` nativo do HTML para regras de negócio.
- Hint curto vai em `hint`; texto de apoio longo (explicação de comportamento) fica após o campo.
- Moeda sempre via `MoneyInput` + `parseAmount` no submit; nunca `type="number"` para dinheiro.
- Campos condicionais: mostre apenas o que se aplica à escolha atual (ex: cartão selecionado esconde conta prevista; término só aparece conforme o tipo). Evite desabilitar campos irrelevantes.
- Quando o efeito das escolhas não for óbvio, renderize um resumo em texto (ex: preview da recorrência).

## 4. Validação

1. Schema zod da feature (`src/features/<área>/<área>.schema.ts`) é a fonte única de verdade.
2. No submit: monte o payload e use `safeParse`.
3. Mapeie erros com `mapZodErrors` usando um mapa `path → campo`:

```tsx
const FIELD_ERROR_KEYS = {
  amount: "amount",
  categoryId: "category",
} satisfies Record<string, string>

const parsed = transactionSchema.safeParse(payload)
if (!parsed.success) {
  setErrors(mapZodErrors(parsed.error, FIELD_ERROR_KEYS))
  return
}
```

4. Regras que dependem de estado de tela (ex: destino exige conta) são checadas no client, depois do parse.
5. Mensagens de erro devem existir no schema (PT-BR) — evite mensagens genéricas.

## 5. Acessibilidade

- Erros visíveis: `role="alert"` (o `FormField`/`MoneyInput` já aplicam).
- `aria-invalid` automático via `FormField`; em campo sem `FormField`, setar manualmente.
- Todo input precisa de label associada (`getByLabelText` deve funcionar nos testes).
- Foco inicial: o container do Sheet/Dialog gerencia; não use `autoFocus` manual sem motivo.

## 6. Loading e submit

- Use `SubmitButton` com `loading` — ele aplica `disabled` e troca o texto ("Salvando...").
- Evite flags locais de submissão duplicadas; passe o estado de loading da chamada ao `SubmitButton`/`FormActions`.
- Em erro de submit, exiba o erro no form (`errors.submit` com `role="alert"`), não só toast.

## 7. Checklist de PR para forms

- [ ] Container correto (Sheet x Dialog)
- [ ] Seções com `FormSection` quando fizer sentido
- [ ] Ações com `FormActions`/`SubmitButton`
- [ ] Campos monetários com `MoneyInput`
- [ ] Validação via schema zod + `mapZodErrors`
- [ ] Erros do servidor visíveis no form
- [ ] Teste cobrindo validação e submit
- [ ] `npm run lint`, `npm run typecheck` e `npm test` verdes
