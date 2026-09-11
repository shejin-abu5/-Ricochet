/**
 * The shape of a match, mirroring the data model in docs/01-PRD.md.
 *
 * This is a TYPE-ONLY file — it produces no JavaScript at all. Types are
 * erased when the code runs; they exist purely so your editor can catch
 * mistakes while you write (e.g. typing `match.lcoation`).
 *
 * Why a separate file: both the API layer (api/) and the components/ need
 * this shape. Putting it in either one would make the other import from a
 * weird place.
 */

// A "union type" — a Format can ONLY be one of these three strings.
// Typing '6v6' anywhere is now a compile error, which is much safer than
// using plain `string` and hoping everyone spells it the same way.
export type MatchFormat = '5v5' | '7v7' | '11v11'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

/**
 * ============================================================
 *  THE MATCH LIFECYCLE — V1
 * ============================================================
 *
 * Until now a match had no end. One created for last Tuesday sat in Discover
 * forever, still looking joinable, because nothing in the data could say
 * otherwise. These three words are what close that loop.
 *
 *   scheduled  it is going to happen (or it was supposed to, and nobody has
 *              said what happened yet)
 *   cancelled  the host called it off. Terminal.
 *   completed  it was played and the host recorded who turned up. Terminal.
 *
 * ---- WHY THREE VALUES AND NOT FOUR ----
 *
 * The obvious fourth is `full`, and it must NOT be stored. "Full" is exactly
 * `playerCount === maxPlayers` — so storing it creates a SECOND place recording
 * the same fact, and the two will disagree the first time an optimistic join
 * gets rolled back (see api/useJoinMatch.ts, which changes playerCount in the
 * cache before the server has agreed).
 *
 * Same rule as `spotsLeft` in MatchCard.tsx and `captainId` in teams/types.ts:
 * DERIVE what can be derived; STORE only what cannot. `isFull` is a helper.
 *
 * A union of string literals rather than a boolean pair (`isCancelled`,
 * `isCompleted`) for the same reason: two booleans can express `{ cancelled:
 * true, completed: true }`, which is nonsense the type system would happily
 * allow. A union makes the impossible states unrepresentable, and this is
 * the smallest honest example of it.
 */
export type MatchStatus = 'scheduled' | 'cancelled' | 'completed'

/**
 * One person who has joined a match.
 *
 * Deliberately TINY — just enough to draw a row in the roster. The full
 * User entity in docs/01-PRD.md has email, position, skillLevel and more,
 * but a match roster doesn't need any of that, and sending it would leak
 * every player's email address to everyone who opens a match page.
 *
 * "Return the smallest shape the screen actually needs" is a real API
 * design habit, not a shortcut.
 */
export interface MatchPlayer {
  id: string
  name: string
}

export interface Match {
  id: string
  title: string
  location: string
  /** ISO 8601 string, e.g. "2026-08-22T18:30:00.000Z" — JSON has no Date type,
   *  so dates always travel over HTTP as strings and get parsed on arrival. */
  dateTime: string
  format: MatchFormat
  maxPlayers: number
  /**
   * How many have joined so far. When this equals maxPlayers the match is full.
   *
   * NOTE: this is always exactly `players.length`. Keeping both is technically
   * duplicated data — normally a bad idea. It's here because a LIST endpoint
   * that returned every roster for every match would send a lot of data the
   * cards never draw. Real APIs do this constantly: a count for list views, the
   * full array for detail views.
   *
   * The important consequence for Phase 2c: when you optimistically add
   * yourself to `players`, you MUST bump `playerCount` too, or the card and the
   * roster will disagree with each other on screen.
   */
  playerCount: number
  /** Who has joined. The list endpoint returns this too, so the optimistic
   *  update has one consistent shape to patch everywhere. */
  players: MatchPlayer[]
  skillLevel: SkillLevel
  creatorId: string

  /**
   * The host's display name, joined in by the server.
   *
   * Stored NORMALISED (creatorId only); returned DENORMALISED (name too), so
   * the detail page can render "Hosted by ..." without a second request per
   * match. Same trade as teamName on an invite — see docs/09.
   */
  creatorName: string

  /**
   * How long the match runs, in minutes. The SERVER derives it from the
   * format — a 5-a-side is an hour, an 11-a-side is ninety minutes — which is
   * why it is not a field on the create form. Same rule as maxPlayers: if the
   * client cannot choose it, do not ask.
   *
   * Kept as a DURATION rather than an endDateTime because it survives a change
   * to the start time without needing to be recalculated, and because "90
   * minutes" is the fact people actually state about a football match.
   */
  durationMinutes: number

  /** Optional note from the host, per docs/01-PRD.md flow 3. */
  notes?: string

  /**
   * Where this match is in its lifecycle. See MatchStatus above.
   *
   * NOT optional, deliberately. Making it `status?:` would have been a smaller
   * change — every existing match would keep working and we'd treat `undefined`
   * as "scheduled". But then every single reader in the app has to remember
   * that rule, and the day one forgets, a cancelled match renders as joinable.
   * A required field makes the compiler point at every place that needs
   * updating, which is the entire reason to have a compiler.
   */
  status: MatchStatus

  /**
   * Player ids who actually turned up. Present ONLY when status is 'completed'.
   *
   * ---- WHY AN ID ARRAY AND NOT A FLAG ON EACH MatchPlayer ----
   *
   * The tempting shape is `MatchPlayer { id, name, attended?: boolean }`. But
   * that field would be `undefined` for every player of every scheduled match
   * — which is most of them, most of the time — so the shape would spend its
   * life lying about when the data exists.
   *
   * Attendance is written ONCE, as a whole set, by ONE person, after the match.
   * A single array that appears at that moment models exactly that. Anyone
   * absent is simply `players` minus `attendance`, derived on demand.
   */
  attendance?: string[]
}

/**
 * The filters the Discover screen supports. These come from the URL
 * (see DiscoverPage.tsx) and become part of the TanStack Query cache key.
 *
 * All optional: no filter means "don't narrow by this".
 */
export interface MatchFilters {
  format?: MatchFormat
  /** 'today' = today only, 'week' = next 7 days, undefined = any upcoming date */
  date?: 'today' | 'week'
  /** free-text search across title and location */
  q?: string
  /**
   * The quick-filter dropdown (see components/MatchQuickFilter.tsx).
   *
   * Only the two NARROWING values live here. The control's third option,
   * "Any match", is `undefined` — same convention as every other field above.
   * Storing 'all' would give us two ways to spell "no filter", and the URL
   * would carry a pointless ?show=all.
   */
  show?: 'available' | 'night'
  /**
   * Which side of the lifecycle to list. Defaults to 'upcoming' on the server,
   * so an old caller that doesn't send it keeps getting exactly what it used to.
   *
   *   upcoming  still scheduled AND kickoff hasn't passed
   *   past      everything else — cancelled, completed, or kicked off already
   *             without the host recording attendance yet
   *
   * Deliberately NOT `status?: MatchStatus`. "Past" is not one status: a match
   * whose kickoff was yesterday and is still `scheduled` is over in every sense
   * a person cares about, and it's precisely the one the host needs to find in
   * order to mark attendance. The filter names what the USER is asking for; the
   * server works out which rows that means.
   */
  when?: 'upcoming' | 'past'
}
