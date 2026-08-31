import type { AvatarColour } from '../../shared/components/avatarColours'

/**
 * Knockout tournaments. Single elimination only, for now.
 *
 * Scope decisions, all deliberate (see docs/12):
 *   - slots are always 4, 8 or 16  → a power of two → NO BYES to handle
 *   - pairings are a random draw   → no seeding UI
 *   - no 3rd-place match, no two-legged ties, no group stage
 *   - a knockout match must have a winner — draws are rejected
 *
 * Each of those is a real feature on a mature product like score7.io. Leaving
 * them out is not laziness: byes and seeding are where bracket code gets hard,
 * and getting the simple loop working end to end first means there is
 * something correct to extend.
 */

/**
 * Why only powers of two: a knockout bracket halves every round. 8 → 4 → 2 → 1.
 * Any other number leaves someone unpaired in some round, which is what byes
 * exist to solve. Constraining the input removes the whole problem.
 */
export type TournamentSlots = 4 | 8 | 16

export const slotOptions: TournamentSlots[] = [4, 8, 16]

/**
 * 'open'        taking entries, bracket not drawn yet
 * 'in_progress' bracket drawn, matches being played
 * 'completed'   the final has a winner
 *
 * A status field rather than deriving it from "are all slots full" — because
 * full-but-not-yet-drawn and drawn are genuinely different states, and the
 * organiser decides when to move between them.
 */
export type TournamentStatus = 'open' | 'in_progress' | 'completed'

/**
 * When matches are played. Floodlights or not is a real question for a player
 * deciding whether to enter — an 8am Sunday kickoff and a 9pm one are very
 * different commitments.
 */
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
 * ---- ROUND AND SLOT ARE THE WHOLE STRUCTURE ----
 *
 * `round` counts from 1. `slot` is the position within that round, from 0.
 * With 8 teams:
 *
 *   round 1: slots 0,1,2,3   (4 matches)
 *   round 2: slots 0,1       (2 matches — semi-finals)
 *   round 3: slot  0         (1 match  — the final)
 *
 * And the rule that makes advancement work, in one line:
 *
 *   the winner of (round r, slot s) goes to (round r+1, slot ⌊s/2⌋)
 *   into side A if s is even, side B if s is odd
 *
 * That's it. No parent pointers, no tree structure to keep consistent — two
 * integers and a formula. Storing explicit `nextMatchId` links would work too
 * and would be one more thing that can be wrong.
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
   * Derived from the fields above, but sent by the server so every client
   * agrees. Recomputing it in three components is three chances to disagree.
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
   * Daily kickoff time, as a plain "HH:MM" string — NOT a Date.
   *
   * This is a WALL-CLOCK time, not an instant. "Matches start at 18:00" means
   * six in the evening wherever the pitch is, on each day of the tournament.
   * Turning it into a Date would force a date and a timezone onto it, and then
   * a viewer in another timezone would be shown a different number — which
   * would be actively wrong here, unlike a match's `dateTime`, which really is
   * one specific instant.
   *
   * Rule of thumb: if the answer to "when?" changes depending on where you're
   * standing, it's an instant (store ISO/UTC). If it doesn't, it's a wall-clock
   * time (store the string).
   */
  startTime: string

  playPeriod: PlayPeriod

  /**
   * Contact details, optional ON THE TYPE because the server only sends them
   * to logged-in viewers — a public bracket page shouldn't hand a scrapeable
   * phone number to anyone who loads it.
   *
   * Undefined therefore means "not shown to you", not "not provided". Same
   * shape caveat as `yourRequestStatus` on Team and `members` on the list
   * endpoint: the type says a field may be absent, and WHY it's absent is
   * something only the endpoint knows.
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
   * Which of MY teams could still enter this one. Server-computed, detail
   * only — the client would need every team's roster to work it out, and the
   * teams list endpoint strips rosters. Same reasoning as `alreadyMember` on
   * InvitableUser in the teams feature.
   */
  enterableTeams?: { teamId: string; teamName: string }[]
}

/** How many rounds a bracket of this size has. 8 teams → 3 rounds. */
export function roundCount(slots: TournamentSlots): number {
  return Math.log2(slots)
}

/**
 * "Final", "Semi-finals", "Quarter-finals", otherwise "Round 1".
 *
 * Named from the END backwards, which is how people actually talk about
 * knockouts: the last round is the final whether the bracket had 4 teams or
 * 64. Numbering from the start would call the same match "round 2" in one
 * tournament and "round 4" in another.
 */
export function roundName(round: number, slots: TournamentSlots): string {
  const total = roundCount(slots)
  const fromEnd = total - round

  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semi-finals'
  if (fromEnd === 2) return 'Quarter-finals'
  return `Round ${round}`
}
