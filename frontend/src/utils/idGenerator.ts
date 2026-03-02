export function generateShortId(length: number = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, length + 2)
}
