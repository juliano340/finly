# Guia de Formulários

Contrato de UI para formulários de criação/edição do Finly. Seguir este guia mantém os forms consistentes e acessíveis.

Referências vivas: `transaction-form.tsx`, `fixed-cost-form.tsx`, `card-form.tsx`, `category-form.tsx`, `invoices-tab.tsx`.

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
      onSubmit={handleSubmit}
    >
      <div className="space-y-6">
        <FormSection icon={Tag} title="Detalhes">
          <FormField label="Nome" required error={errors.name}>
            <Input value={name} onChange={...} placeholder="Ex: Alimentação" />
          </FormField>
          <FormField label="Tipo">
            <Select items={TYPE_ITEMS} value={type} onValueChange={...}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>...</SelectContent>
            </Select>
          </FormField>
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

- **Sem `mt-4`** no container do form. O espaçamento entre `SheetHeader` e o form vem do `gap-4` do `SheetContent` + padding do `px-4 pb-4` (fix v0.2.35). O `space-y-6` entre `FormSection`s já cuida do espaçamento interno.
- Seções agrupam campos relacionados com ícone + título (`<FormSection icon={} title="">`); use quando o form tiver 2+ grupos lógicos. Referência viva: `transaction-form.tsx`, `fixed-cost-form.tsx`, `card-form.tsx`, `category-form.tsx`.
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

- **Todo campo nasce dentro de `<FormField>` com `label`**. Nunca use `<Label>` cru em campo de form — o `FormField` injeta `id`, `aria-invalid` e `aria-describedby` no filho automaticamente.
- Hint curto vai em `hint` (prop do `FormField`); texto de apoio longo fica após o campo.
- Marque obrigatórios com `required` no `FormField` (asterisco) e valide via schema — não confie no `required` nativo do HTML para regras de negócio.
- Moeda sempre via `MoneyInput` + `parseAmount` no submit; nunca `type="number"` para dinheiro.
- Campos condicionais: mostre apenas o que se aplica à escolha atual (ex: cartão selecionado esconde conta prevista; término só aparece conforme o tipo). Evite desabilitar campos irrelevantes.
- Quando o efeito das escolhas não for óbvio, renderize um resumo em texto (ex: preview da recorrência).

## 4. Forms controlados vs. uncontrolled

**Controlados** (maioria dos forms): campos como `MoneyInput`, `DateInput`, `Select` e `Input` controlado usam `value` + `onValueChange`/`onChange` com `useState`. Exemplos: `transaction-form.tsx`, `category-form.tsx`, `fixed-cost-form.tsx`.

**Uncontrolled (FormData)**: forms que usam `action={handleX}` com `formData` submetido no server action mantêm `name=` nos `<Input>` nativos. Componentes controlados (`MoneyInput`, `DateInput`) **não se aplicam** nesse padrão — use `<Input>` com `name=` diretamente. Exemplo: invoices (`invoices-tab.tsx`).

> Preserve inputs hidden/controlados para estados que o componente gerencia (ex: `<input type="hidden" name="type" value={type} />`). Campos que precisam de máscara ou normalização no blur devem ser controlados mesmo em forms com `action`.

## 5. Validação

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

## 6. Empty-state guiado

Se o form depende de um item externo que pode não existir (ex: fatura precisa de cartão, transação precisa de categoria), mostre um empty-state com CTA antes de renderizar o form. Referência viva: `invoices-tab.tsx` (fatura sem cartão).

```tsx
{creating && items.length === 0 ? (
  <>
    <SheetHeader><SheetTitle>Nova fatura</SheetTitle></SheetHeader>
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-8 text-center">
      <CreditCard className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">Nenhum cartão cadastrado</p>
      <p className="text-xs text-muted-foreground">
        Cadastre um cartão com dia de vencimento para criar faturas.
      </p>
      <Button onClick={() => router.push("/cards?tab=cards")}>
        Cadastrar cartão
      </Button>
    </div>
  </>
) : creating ? (
  /* form normal */
) : null}
```

Regras:
- Ícone ilustrativo com `aria-hidden="true"`.
- Título curto e descritiva explicando o que falta.
- CTA levando à página de cadastro do item necessário.

## 7. Acessibilidade

- Erros visíveis: `role="alert"` (o `FormField`/`MoneyInput` já aplicam).
- `aria-invalid` automático via `FormField`; em campo sem `FormField`, setar manualmente.
- Todo input precisa de label associada (`getByLabelText` deve funcionar nos testes).
- Foco inicial: o container do Sheet/Dialog gerencia; não use `autoFocus` sem motivo.
- Botões icon-only: sempre `aria-label` descritivo (ex: `aria-label="Excluir fatura"`) e `title` quando fizer sentido seguir o padrão do arquivo.

## 8. Loading e submit

- Use `SubmitButton` com `loading` — ele aplica `disabled` e troca o texto ("Salvando...").
- Evite flags locais de submissão duplicadas; passe o estado de loading da chamada ao `SubmitButton`/`FormActions`.
- Em erro de submit, exiba o erro no form (`errors.submit` com `role="alert"`), não só toast.

## 9. Checklist de PR para forms

- [ ] Container correto (Sheet x Dialog)
- [ ] Sem `mt-4` no container do form
- [ ] Seções com `FormSection` quando fizer sentido
- [ ] Campos dentro de `FormField` com label
- [ ] Ações com `FormActions`/`SubmitButton`
- [ ] Campos monetários com `MoneyInput`
- [ ] Validação via schema zod + `mapZodErrors`
- [ ] Erros do servidor visíveis no form
- [ ] Empty-state guiado para dependências externas
- [ ] Botões icon-only com `aria-label`
- [ ] `npm run lint`, `npm run typecheck` e `npm test` verdes
