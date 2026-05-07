/** Postgres `numeric` may deserialize as string in the browser client. */
export function coerceNumber(n: number | string): number {
  return typeof n === 'number' ? n : Number.parseFloat(n)
}
