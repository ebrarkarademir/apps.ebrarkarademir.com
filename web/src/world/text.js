// Small helpers for the world's words

export const fmt = (str, vars = {}) => String(str ?? '').replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')

/** An item's name in the player's language: "Hoodie · Lilac". */
export const itemName = (item, t) => `${t.worldModels?.[item.model] ?? item.model} · ${t.worldColors?.[item.color] ?? item.color}`

/** How far along to the next level (0 to 1), with the same curve as the server. */
export function levelProgress (xp) {
  const level = Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2)
  const from = 50 * level * (level - 1)
  const to = 50 * (level + 1) * level
  return (xp - from) / (to - from)
}
