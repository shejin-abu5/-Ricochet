import type { AvatarColour } from '../../shared/components/avatarColours'

/**
 * Knockout tournaments. Single elimination only.
 *
 * Deliberately out of scope (docs/12): byes, seeding, third-place matches,
 * two-legged ties, group stages. Draws are rejected — a knockout match must
 * produce a winner.
 */

/**
 * Powers of two only. A bracket halves every round (8 → 4 → 2 → 1); any other
 * count leaves someone unpaired somewhere, which is what byes exist to solve.
 * Constraining the input removes the problem entirely.
 */
export type TournamentSlots = 4 | 8 | 16

export const slotOptions: TournamentSlots[] = [4, 8, 16]

/**
 * 'open'        taking entries, bracket not drawn yet
 * 'in_progress' bracket drawn, matches being played
 * 'completed'   the final has a winner
 *
 * Stored rather than derived from "are all slots full": full-but-not-drawn and
 * drawn are different states, and the organiser decides when to move between
 * them.
 */
export type TournamentStatus = 'open' | 'in_progress' | 'completed'

/** When matches are played — an 8am Sunday and a 9pm kickoff are different commitments. */
export type PlayPeriod = 'day' | 'night' | 'both'

export const playPeriodLabels: Record<PlayPeriod, string> = {
  day: 'Daytime',
  night: 'Night (floodlit)',
  both: 'Day and night',
}

/** A team that has entered. Name and colour are joined in by the server. */
export interface TournamentTeam {
  teamId: string
  teamName: string
  teamColour: AvatarColour
}

/**
 * One match in the bracket.
 *
 * `round` counts from 1, `slot` from 0 within that round. With 8 teams: round 1
 * has slots 0-3, round 2 slots 0-1, round 3 slot 0.
 *
 * Advancement is a formula rather than stored links — the winner of (round r,
 * slot s) goes to (round r+1, slot floor(s/2)), side A if s is even and side B
 * if odd. Explicit nextMatchId pointers would work too, and would be one more
 * thing that can be wrong.
 */
export interface TournamentMatch {
  id: string
  round: number
  slot: number

  /** Undefined until a previous round feeds this slot. */
  teamAId?: string
  teamAName?: string
  teamAColour?: AvatarColour
  teamBId?: string
  teamBName?: string
  teamBColour?: AvatarColour

  scoreA?: number
  scoreB?: number
  winnerTeamId?: string

  /**
   * 'pending'  waiting on earlier rounds — at least one side unknown
   * 'ready'    both teams known, result can be entered
   * 'played'   result recorded, winner advanced
   *
   * Derivable from the fields above, but sent by the server so three components
   * cannot disagree about it.
   */
  status: 'pending' | 'ready' | 'played'
}

export interface Tournament {
  id: string
  name: string
  organiserId: string
  organiserName: string
  location: string
  /** ISO 8601, like every other date in this app. */
  startDate: string
  /** ISO 8601. Same day as startDate for a one-day cup. */
  endDate: string

  /**
   * Daily kickoff as a plain "HH:MM" string, not a Date.
   *
   * This is a wall-clock time, not an instant: "matches start at 18:00" means
   * six in the evening at the pitch, on each day. A Date would force a timezone
   * onto it and show a viewer elsewhere a different number — wrong here, unlike
   * a match's `dateTime`, which really is one instant.
   */
  startTime: string

  playPeriod: PlayPeriod

  /**
   * Optional because the server only sends these to logged-in viewers — a
   * public bracket page should not hand out a scrapeable phone number.
   *
   * Undefined means "not shown to you", never "not provided".
   */
  contactPhone?: string
  contactEmail?: string

  slots: TournamentSlots
  status: TournamentStatus

  /** Entered teams. Stripped on the LIST endpoint, like team rosters. */
  teams: TournamentTeam[]
  teamCount: number

  /** Only on the DETAIL response, and only once the bracket is drawn. */
  matches?: TournamentMatch[]

  championTeamId?: string
  championTeamName?: string

  /**
   * Which of the caller's teams could still enter. Server-computed and detail
   * only: the client would need every team's roster, which the list endpoint
   * strips.
   */
  enterableTeams?: { teamId: string; teamName: string }[]
}

/** How many rounds a bracket of this size has. 8 teams → 3 rounds. */
export function roundCount(slots: TournamentSlots): number {
  return Math.log2(slots)
}

/**
 * "Final", "Semi-finals", "Quarter-finals", otherwise "Round N".
 *
 * Named backwards from the end, which is how knockouts are talked about: the
 * last round is the final whether the bracket held 4 teams or 64.
 */
export function roundName(round: number, slots: TournamentSlots): string {
  const total = roundCount(slots)
  const fromEnd = total - round

  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semi-finals'
  if (fromEnd === 2) return 'Quarter-finals'
  return `Round ${round}`
}
