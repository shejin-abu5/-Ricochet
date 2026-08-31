import type { SkillLevel } from '../matches/types'

/**
 * The player profile, mirroring the User entity in docs/01-PRD.md.
 *
 * ---- A CROSS-FEATURE IMPORT, ON PURPOSE ----
 *
 * `SkillLevel` is defined in features/matches/types.ts, and this file imports
 * it rather than declaring its own copy. "Beginner / intermediate / advanced"
 * is ONE scale — a match advertises the level it wants, a player states the
 * level they are, and the whole point is that those two are comparable.
 *
 * Two identical unions in two files would compile fine and drift the first time
 * someone adds 'semi-pro' to one of them.
 *
 * THE RULE FOR FEATURE-BASED FOLDERS: a feature may import from another
 * feature, as long as the dependency runs ONE WAY. profile → matches is fine;
 * matches → profile as well would be a cycle, and cycles are where "why does
 * changing this file break that unrelated one?" comes from.
 *
 * If a third feature needs it too, that's the signal to promote it to
 * shared/types — the same "second consumer" rule that moved Avatar to shared/.
 */
export type { SkillLevel }

/** Where you play. Standard football positions, per docs/02-app-flow.md flow 1. */
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD'

export type PreferredFoot = 'left' | 'right' | 'both'

/**
 * Self-rated attributes, 1–5.
 *
 * Deliberately a fixed set of four rather than a free-form list: a fixed shape
 * can be typed, validated and rendered without the UI having to cope with
 * whatever someone typed in. `Record<string, number>` would be more "flexible"
 * and would push that flexibility onto every component that reads it.
 */
export interface PlayerAttributes {
  pace: number
  passing: number
  shooting: number
  defending: number
}

export interface PlayerProfile {
  id: string
  name: string
  email: string
  position: PlayerPosition
  skillLevel: SkillLevel
  preferredFoot: PreferredFoot
  /** Where they usually play — matches the `location` on a team. */
  location: string
  attributes: PlayerAttributes
  /** ISO 8601. "Member since March 2026". */
  joinedAt: string
}

/** Human labels. The stored value stays terse; only the UI spells it out. */
export const positionLabels: Record<PlayerPosition, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
}

export const footLabels: Record<PreferredFoot, string> = {
  left: 'Left footed',
  right: 'Right footed',
  both: 'Two footed',
}

/**
 * Attribute keys in display order.
 *
 * `Object.keys(attributes)` would work but leaves the order at the mercy of
 * whatever the server happened to serialise — and a stats list that reshuffles
 * between renders is genuinely disorienting. An explicit array is the order.
 */
export const attributeOrder: { key: keyof PlayerAttributes; label: string }[] = [
  { key: 'pace', label: 'Pace' },
  { key: 'passing', label: 'Passing' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'defending', label: 'Defending' },
]
