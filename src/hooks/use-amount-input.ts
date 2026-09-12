"use client"

import { useState } from "react"

export function useAmountInput(initialAmount?: number) {
  const [amount, setAmount] = useState(initialAmount != null ? initialAmount.toString() : "")

  function handleChange(raw: string) {
    setAmount(raw.replace(/[^\d,]/g, ""))
  }

  function handleBlur() {
    if (!amount) return
    const value = parseFloat(amount.replace(",", "."))
    if (!isNaN(value)) {
      setAmount(value.toFixed(2).replace(".", ","))
    }
  }

  const parsed = parseFloat(amount.replace(",", "."))

  return {
    amount,
    handleChange,
    handleBlur,
    parsedValue: Number.isFinite(parsed) ? parsed : 0,
  }
}
