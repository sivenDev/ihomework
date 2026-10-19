/** 本地自然日，格式 YYYY-MM-DD。所有按天计算的逻辑都用它，避免时区问题。 */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
