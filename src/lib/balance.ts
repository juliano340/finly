export function isAccountNegative(balance: number, overdraftLimit: number): boolean {
  return balance < -overdraftLimit
}

export function getAvailableBalance(balance: number, overdraftLimit: number): number {
  return balance + overdraftLimit
}

export function canWithdraw(balance: number, overdraftLimit: number, amount: number): boolean {
  return balance - amount >= -overdraftLimit
}
