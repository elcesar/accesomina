export const WORKER_RATINGS = [
  { value: 1, label: 'Insuficiente' },
  { value: 2, label: 'En desarrollo' },
  { value: 3, label: 'Suficiente' },
  { value: 4, label: 'Bueno' },
  { value: 5, label: 'Destacado' },
]

export function workerRatingLevel(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric >= 7) return 5
  if (numeric >= 5) return 4
  if (numeric >= 3) return 3
  return Math.max(1, Math.min(5, numeric))
}
