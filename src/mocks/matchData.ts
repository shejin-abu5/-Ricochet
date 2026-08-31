import type {
  Match,
  MatchFormat,
  MatchPlayer,
  MatchStatus,
  SkillLevel,
} from '../features/matches/types'
import { TEST_USER as TEST_ACCOUNT } from './userData'

/**
 * Seed data for the fake backend.
 *
 * Dates are generated RELATIVE to right now (see daysFromNow below) rather
 * than hardcoded. If we hardcoded "2026-08-22", every match would silently
 * drift into the past and the "today"/"this week" filters would stop
 * returning anything a few days later.
 */

/** Returns an ISO date string N days from now, at the given hour (local time). */
function daysFromNow(days: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

/**
 * A pool of made-up players to fill rosters with. Deliberately longer than
 * the biggest format (11v11 = 22 players) so no roster ever runs out of names.
 */
const playerNames = [
  'Arjun Nair', 'Sooraj Menon', 'Fahad Rahman', 'Nikhil Das', 'Vishnu Prasad',
  'Aravind Kumar', 'Jithin Joseph', 'Sandeep Varma', 'Rahul Pillai', 'Anoop Thomas',
  'Manu Krishnan', 'Sreejith Babu', 'Ashiq Ali', 'Vivek Raj', 'Deepak Suresh',
  'Tom Mathew', 'Hari Govind', 'Basil Jacob', 'Akhil Menon', 'Praveen Nath',
  'Sarath Chandran', 'Nithin Roy', 'Alan Sebastian', 'Rohit Pai', 'Melvin George',
]

/**
 * The logged-in test account, as a match-roster entry.
 *
 * Seeding this person into SOME matches is what makes both buttons reachable
 * the moment you open the app: matches you're in show "Leave", matches you're
 * not in show "Join". Without it you'd have to join something before you could
 * ever test leaving.
 *
 * PHASE 3B: this used to be a hand-written `{ id: 'u1', name: 'Test User' }`,
 * duplicating the real user record in userData.ts. Two copies of one fact —
 * change the name in one place and the rosters silently disagree with the
 * login. Now it's derived from the single source, which is the same rule as
 * `captainId` and `playerCount` elsewhere in this codebase.
 */
export const TEST_USER: MatchPlayer = { id: TEST_ACCOUNT.id, name: TEST_ACCOUNT.name }

/**
 * The match wired up to demonstrate an optimistic update being ROLLED BACK.
 * See the join handler in handlers.ts — it always rejects this one, on purpose.
 * Exported as a named constant so the handler doesn't contain a magic string.
 */
export const RACE_DEMO_MATCH_ID = 'm10'

interface Seed {
  title: string
  location: string
  /** Negative = in the past. See daysFromNow above. */
  days: number
  hour: number
  format: MatchFormat
  playerCount: number
  skillLevel: SkillLevel
  /** Is the logged-in test user already on this roster? */
  youAreIn?: boolean
  /** Defaults to 'scheduled' — most matches are. */
  status?: MatchStatus
  /**
   * V1: how many of the roster did NOT turn up, counted from the END of the
   * list. Only meaningful when status is 'completed'.
   *
   * A COUNT rather than a list of ids, because the ids don't exist yet at the
   * point a seed is written — buildRoster invents them below. Expressing it as
   * "the last two didn't show" keeps the seed readable and lets the real ids be
   * derived once they exist.
   */
  absentees?: number
}

const seeds: Seed[] = [
  { title: 'Sunday Turf Kickabout', location: 'Greenfield Turf, Kakkanad', days: 0, hour: 18, format: '5v5', playerCount: 8, skillLevel: 'beginner' },
  { title: 'Evening 5s',            location: 'Sportz Arena, Edappally',   days: 0, hour: 20, format: '5v5', playerCount: 10, skillLevel: 'intermediate' },
  { title: 'Morning Warmup',        location: 'Marine Drive Ground',       days: 1, hour: 7,  format: '7v7', playerCount: 6,  skillLevel: 'beginner', youAreIn: true },
  { title: 'Midweek 7s',            location: 'Panampilly Nagar Turf',     days: 2, hour: 19, format: '7v7', playerCount: 12, skillLevel: 'intermediate' },
  { title: 'Competitive 11s',       location: 'Maharajas College Ground',  days: 3, hour: 16, format: '11v11', playerCount: 18, skillLevel: 'advanced' },
  { title: 'Friday Night Lights',   location: 'Turf Park, Vyttila',        days: 4, hour: 21, format: '5v5', playerCount: 10, skillLevel: 'intermediate' },
  { title: 'Weekend Warmup 7s',     location: 'Kaloor Stadium Annexe',     days: 5, hour: 8,  format: '7v7', playerCount: 9,  skillLevel: 'beginner' },
  { title: 'Saturday Showdown',     location: 'Greenfield Turf, Kakkanad', days: 6, hour: 17, format: '11v11', playerCount: 22, skillLevel: 'advanced' },
  { title: 'Casual Sunday 5s',      location: 'Sportz Arena, Edappally',   days: 7, hour: 18, format: '5v5', playerCount: 4,  skillLevel: 'beginner', youAreIn: true },
  // m10 — the race-condition demo. One seat left, and the server will always
  // claim someone else took it. See RACE_DEMO_MATCH_ID above.
  { title: 'Rainy Day Indoor',      location: 'Indoor Arena, Palarivattom', days: 8, hour: 19, format: '5v5', playerCount: 9, skillLevel: 'intermediate' },
  { title: 'Next Week 7s',          location: 'Panampilly Nagar Turf',     days: 9, hour: 20, format: '7v7', playerCount: 11, skillLevel: 'intermediate' },
  { title: 'League Practice',       location: 'Maharajas College Ground',  days: 10, hour: 16, format: '11v11', playerCount: 20, skillLevel: 'advanced' },
  { title: 'Beginners Welcome',     location: 'Turf Park, Vyttila',        days: 11, hour: 18, format: '5v5', playerCount: 3,  skillLevel: 'beginner' },
  { title: 'Thursday Regulars',     location: 'Kaloor Stadium Annexe',     days: 12, hour: 19, format: '7v7', playerCount: 14, skillLevel: 'intermediate' },
  { title: 'Big Match Prep',        location: 'Greenfield Turf, Kakkanad', days: 13, hour: 17, format: '11v11', playerCount: 16, skillLevel: 'advanced', youAreIn: true },
  { title: 'Chill 5s',              location: 'Indoor Arena, Palarivattom', days: 14, hour: 21, format: '5v5', playerCount: 10, skillLevel: 'beginner' },

  /**
   * ============================================================
   *  V1 — matches that have actually finished
   * ============================================================
   *
   * APPENDED, never inserted. Ids are positional (`m${index + 1}`), so adding a
   * seed anywhere above would silently renumber everything after it — and
   * RACE_DEMO_MATCH_ID is a hardcoded 'm10' that would then point at the wrong
   * match. Append-only is the rule for any positionally-keyed seed list.
   *
   * These four exist to make every new state reachable the moment you log in,
   * rather than something you have to manufacture by hand:
   */

  // m17, m18 — COMPLETED, with the test user present. These are what make the
  // "appearances" number on the profile a real derived count instead of a zero.
  { title: 'Thursday Regulars',     location: 'Kaloor Stadium Annexe',      days: -7, hour: 19, format: '7v7', playerCount: 14, skillLevel: 'intermediate', youAreIn: true, status: 'completed', absentees: 2 },
  { title: 'Turf Tuesday',          location: 'Sportz Arena, Edappally',    days: -3, hour: 20, format: '5v5', playerCount: 10, skillLevel: 'beginner',     youAreIn: true, status: 'completed', absentees: 1 },

  // m19 — the ATTENDANCE demo. Kickoff was yesterday, but it is still
  // 'scheduled' because nobody has said what happened. youAreIn puts the test
  // user first on the roster, and first on the roster is the host (see the map
  // below) — so this is the match where the host's attendance panel appears.
  { title: 'Yesterday Evening 5s',  location: 'Turf Park, Vyttila',         days: -1, hour: 19, format: '5v5', playerCount: 8,  skillLevel: 'intermediate', youAreIn: true },

  // m20 — CANCELLED, and dated in the FUTURE on purpose. A cancelled match is
  // "past" in the only sense that matters (you cannot join it) even though its
  // kickoff hasn't happened, which is exactly why the list filter keys off
  // status and date together rather than date alone.
  { title: 'Washed Out 7s',         location: 'Marine Drive Ground',        days: 4,  hour: 17, format: '7v7', playerCount: 11, skillLevel: 'beginner',     status: 'cancelled' },
]

/** How many players each format needs — used to derive maxPlayers. */
const maxPlayersByFormat: Record<MatchFormat, number> = {
  '5v5': 10,
  '7v7': 14,
  '11v11': 22,
}

/**
 * Build a roster of exactly `count` people, putting the test user first when
 * they're supposed to be on it.
 *
 * `offset` shifts which names get picked so two matches with the same size
 * don't end up with identical rosters — cosmetic, but it makes the app look
 * real enough that you notice when something's wrong.
 */
function buildRoster(count: number, offset: number, youAreIn: boolean): MatchPlayer[] {
  const roster: MatchPlayer[] = []

  if (youAreIn) roster.push(TEST_USER)

  // `%` (modulo) wraps the index back to 0 when it runs past the end of the
  // array, so the pool can never be exhausted no matter how big the roster.
  while (roster.length < count) {
    const name = playerNames[(offset + roster.length) % playerNames.length]
    roster.push({ id: `p${offset}-${roster.length}`, name })
  }

  return roster
}

/**
 * How long a match of each format runs, in minutes.
 *
 * Server-owned, like maxPlayersByFormat — the client never sends it. A
 * 5-a-side is an hour; a full 11-a-side is two 45-minute halves.
 *
 * Declared ABOVE `matches` on purpose: the map below reads it while the module
 * is still evaluating, and a `const` referenced before its own initialiser has
 * run throws a ReferenceError (the "temporal dead zone"). Function
 * declarations hoist; const bindings do not.
 */
export const durationByFormat: Record<MatchFormat, number> = {
  '5v5': 60,
  '7v7': 75,
  '11v11': 90,
}

/**
 * Host notes, keyed by match id. Only SOME matches have one — that is the
 * point: the detail page has to render correctly both with and without.
 *
 * A separate map rather than another column on the Seed interface, because
 * only three of sixteen matches use it and threading `notes: undefined`
 * through the other thirteen adds noise for nothing.
 */
const matchNotes: Record<string, string> = {
  m1: 'Bibs and balls provided. Turf shoes only, no metal studs. We usually head to the cafe next door afterwards, all welcome.',
  m5: 'Competitive game — please only join if you can commit for the full 90. Two subs max per side.',
  m13: 'Absolute beginners very welcome, half of us only started this year. Come as you are, we have spare bibs.',
}

export const matches: Match[] = seeds.map((seed, index) => {
  const players = buildRoster(seed.playerCount, index * 3, seed.youAreIn ?? false)
  const status = seed.status ?? 'scheduled'

  /**
   * Turn "the last N didn't show" into the id array the API actually returns.
   *
   * `slice` with a negative-safe end: absentees defaults to 0, so a completed
   * match with nobody marked absent gets the whole roster. And note the whole
   * expression collapses to `undefined` unless the match is completed — the
   * field is absent, not empty. An empty array would mean "completed, and
   * literally nobody turned up", which is a different and much sadder fact.
   */
  const attendance =
    status === 'completed'
      ? players.slice(0, players.length - (seed.absentees ?? 0)).map((p) => p.id)
      : undefined

  return {
    id: `m${index + 1}`,
    title: seed.title,
    location: seed.location,
    dateTime: daysFromNow(seed.days, seed.hour),
    format: seed.format,
    maxPlayers: maxPlayersByFormat[seed.format],
    // DERIVED, not typed by hand — playerCount can never drift out of sync
    // with the roster because it's calculated from it. Same instinct as
    // `spotsLeft` in MatchCard.tsx: if you can calculate it, calculate it.
    playerCount: players.length,
    players,
    // Whoever is first on the roster organised it. This means the matches
    // you're on are the ones you "created" — convenient for testing later.
    creatorId: players[0].id,
    skillLevel: seed.skillLevel,
    creatorName: players[0].name,
    durationMinutes: durationByFormat[seed.format],
    notes: matchNotes[`m${index + 1}`],
    status,
    attendance,
  }
})
