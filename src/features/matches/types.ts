/** Match data model. Mirrors docs/01-PRD.md. */

export type MatchFormat = '5v5' | '7v7' | '11v11'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

/**
 * Where a match is in its lifecycle.
 *
 *   scheduled  going to happen, or kicked off with no outcome recorded yet
 *   cancelled  the host called it off (terminal)
 *   completed  played, with attendance recorded (terminal)
 *
 * There is deliberately no `full` value: full is `playerCount === maxPlayers`,
 * and storing it would create a second copy of that fact which desyncs the
 * first time an optimistic join is rolled back (see api/useJoinMatch.ts).
 */
export type MatchStatus = 'scheduled' | 'cancelled' | 'completed'

/**
 * A player on a match roster.
 *
 * Intentionally minimal — the full User entity carries email, position and
 * skill level, none of which a roster row draws, and returning it would expose
 * every player's email to anyone who opens the match.
 */
export interface MatchPlayer {
  id: string
  name: string
}

export interface Match {
  id: string
  title: string
  location: string
  /** ISO 8601, e.g. "2026-08-22T18:30:00.000Z". */
  dateTime: string
  format: MatchFormat
  maxPlayers: number
  /**
   * Always equal to `players.length`. Duplicated on purpose so list endpoints
   * can return a count without every roster.
   *
   * Consequence for optimistic updates: patching `players` without also
   * bumping `playerCount` leaves the card and the roster disagreeing on screen.
   */
  playerCount: number
  players: MatchPlayer[]
  skillLevel: SkillLevel
  creatorId: string
  /** Denormalised by the server so the detail page needs no second request. */
  creatorName: string
  /**
   * Derived server-side from the format (5-a-side an hour, 11-a-side ninety),
   * so it isn't asked for on the create form.
   *
   * A duration rather than an end time: it survives a change to `dateTime`
   * without recalculation.
   */
  durationMinutes: number
  /** Optional note from the host, per docs/01-PRD.md flow 3. */
  notes?: string
  status: MatchStatus
  /**
   * Player ids who turned up. Present only when status is 'completed'.
   *
   * A whole-set array rather than a flag per MatchPlayer, because attendance is
   * written once, by one person, after the match — a per-player `attended?`
   * would be undefined for every player of every scheduled match. Absentees are
   * `players` minus `attendance`.
   */
  attendance?: string[]
}

/**
 * Discover's filters. Sourced from the URL (see DiscoverPage.tsx) and used as
 * part of the query cache key. All optional — absent means "don't narrow".
 */
export interface MatchFilters {
  format?: MatchFormat
  /** 'today' = today only, 'week' = next 7 days, undefined = any upcoming date */
  date?: 'today' | 'week'
  /** Free-text search across title and location. */
  q?: string
  /**
   * Which side of the lifecycle to list. Defaults to 'upcoming' on the server,
   * so an old caller that doesn't send it keeps getting exactly what it used to.
   *
   *   upcoming  still scheduled and kickoff hasn't passed
   *   past      cancelled, completed, or kicked off with no attendance recorded
   *
   * Not `status?: MatchStatus`, because "past" isn't one status — a yesterday
   * match still marked `scheduled` is over, and is exactly the one the host
   * needs to find to record attendance.
   */
  when?: 'upcoming' | 'past'
}
