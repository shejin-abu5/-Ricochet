import type { SkillLevel } from '../matches/types'

/**
 * The player profile, mirroring the User entity in docs/01-PRD.md.
 *
 * SkillLevel is re-exported from the matches feature rather than redeclared: a
 * match advertises the level it wants and a player states the level they are,
 * and the point is that the two are comparable. The dependency runs one way
 * (profile → matches) — a cycle is where "why does changing this file break
 * that one?" comes from. Promote it to shared/ if a third feature needs it.
 */
export type { SkillLevel }

/** Where you play. Standard football positions, per docs/02-app-flow.md flow 1. */
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD'

export type PreferredFoot = 'left' | 'right' | 'both'

/**
 * Self-rated attributes, 1-5.
 *
 * A fixed set of four rather than Record<string, number>: the loose version
 * pushes its flexibility onto every component that renders it.
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
 * Explicit rather than Object.keys, which would leave the order at the mercy of
 * the server's serialisation and let the stats list reshuffle between renders.
 */
export const attributeOrder: { key: keyof PlayerAttributes; label: string }[] = [
  { key: 'pace', label: 'Pace' },
  { key: 'passing', label: 'Passing' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'defending', label: 'Defending' },
]


