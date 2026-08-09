import { Prisma } from "@/generated/prisma/client"

export type MoneyValue = number | string | { toString(): string }

export function toMoney(value: MoneyValue) {
  return new Prisma.Decimal(value.toString()).toDecimalPlaces(2)
}

export function moneyToNumber(value: MoneyValue): number {
  return toMoney(value).toNumber()
}

export function sumMoney(values: MoneyValue[]): number {
  return values
    .reduce<Prisma.Decimal>((total, value) => total.plus(value.toString()), new Prisma.Decimal(0))
    .toNumber()
}

export function subtractMoney(value: MoneyValue, ...subtrahends: MoneyValue[]): number {
  return subtrahends
    .reduce<Prisma.Decimal>((total, item) => total.minus(item.toString()), toMoney(value))
    .toNumber()
}
