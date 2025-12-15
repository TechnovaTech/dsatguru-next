export const satScaleConfig = {
  linear: {
    min: 200,
    max: 800
  }
}

export function toScaledScore(raw, maxRaw) {
  const min = satScaleConfig.linear.min
  const max = satScaleConfig.linear.max
  const span = max - min
  if (!maxRaw || maxRaw <= 0) return min
  const ratio = Math.max(0, Math.min(1, raw / maxRaw))
  return min + Math.round(span * ratio)
}
