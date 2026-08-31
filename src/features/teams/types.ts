import type { AvatarColour } from '../../shared/components/avatarColours'

/**
 * The shape of a team, mirroring the data model in docs/01-PRD.md.
 *
 * Type-only file, same as features/matches/types.ts — no JavaScript is
 * produced here, it exists purely so the editor can catch mistakes.
 */

export interface TeamMember {
  id: string
  name: string
}

export interface Team {
  id: string
  name: string
  /**
   * The broad AREA the team is based in — "Kakkanad", "Vyttila". Used for
   * search and for the subtitle on a card.
   */
  location: string
  /**
   * The specific pitch they actually play on — "Greenfield Turf, Kakkanad".
   *
   * Deliberately separate from `location` rather than replacing it. They
   * answer different questions: location is "is this team near me?" (broad,
   * searchable, one word), home ground is "where do I turn up?" (exact, and
   * it can change without the team moving areas). Cramming both into one
   * field means neither works properly.
   */
  homeGround: string
  /** How many times a week the squad usually plays. 1–7. */
  playsPerWeek: number
  /** Which colour the badge is drawn in. See shared/components/Avatar.tsx. */
  colour: AvatarColour

  /**
   * ============================================================
   *  HOW ROLES ARE MODELLED — read this one carefully
   * ============================================================
   *
   * Notice what TeamMember does NOT have: a `role` field.
   *
   * The obvious modelling instinct is:
   *
   *   interface TeamMember { id, name, role: 'captain' | 'member' }
   *
   * Don't. You would then have TWO places recording who runs this team —
   * `captainId` here, and a `role` on one of the members — and nothing
   * stopping them from disagreeing. Transfer the captaincy, update one and
   * forget the other, and your app now has two captains, or none. Every bug
   * of this shape starts with data stored twice.
   *
   * Instead there is exactly one fact, `captainId`, and role is a QUESTION
   * you answer from it:
   *
   *   const isCaptain = member.id === team.captainId
   *
   * Same instinct as `isMember` in JoinMatchButton.tsx and `spotsLeft` in
   * MatchCard.tsx. If you can calculate it, calculate it.
   */
  captainId: string

  /**
   * The roster. This is what "nested data" means: a team is not a flat row,
   * it CONTAINS a list of other entities.
   *
   * That matters for the cache. When Phase 3b adds a member, the mutation has
   * to reach inside this array and produce a new team object with a new
   * members array — you cannot just replace a top-level field. Nested data is
   * where immutable updates start to take real thought.
   */
  members: TeamMember[]

  /** Count for list views, full array for detail views — same split as Match. */
  memberCount: number

  /**
   * Squad cap. Once memberCount reaches this, nobody else can join.
   *
   * Comes from the SERVER, exactly like maxPlayers on a match — a client that
   * could set its own cap could set it to 500. Same rule as Phase 2b.
   */
  maxMembers: number

  /** Nested object rather than three loose fields, so it can be passed around
   *  as one thing (e.g. to a future <RecordBadge record={team.record} />). */
  record: {
    wins: number
    losses: number
    draws: number
  }

  /**
   * Do I have a join request sitting with this captain?
   *
   * Optional because only the DETAIL endpoint fills it in — it depends on who
   * is asking, and the list endpoint answers the same way for everyone.
   * Undefined therefore means "not answered here", never "no".
   *
   * Computed server-side rather than by the client digging through a requests
   * list, for the same reason as `alreadyMember` on InvitableUser: the server
   * has both tables in front of it, and the answer is one string.
   */
  yourRequestStatus?: 'none' | 'pending'
}

/** Filters the teams list supports. Only search for now. */
export interface TeamFilters {
  /** free-text search across name and location */
  q?: string
}

/**
 * Is this user the captain of this team?
 *
 * A plain function rather than a hook, because it needs no React features at
 * all — it is just a comparison. Plain functions are easier to test, can be
 * called from anywhere (including inside a `.map()`), and never trip the
 * rules-of-hooks lint.
 *
 * "Reach for a hook only when you need React" is a good default. A surprising
 * amount of what people write as custom hooks are really just functions.
 */
export function isCaptain(team: Team, userId: string | undefined): boolean {
  // The `!!userId` guard matters: if userId is undefined and captainId were
  // ever also undefined, `undefined === undefined` would make a logged-out
  // guest the captain of a broken team. Cheap check, nasty bug.
  return !!userId && team.captainId === userId
}

/**
 * Is this user on the roster?
 *
 * Reads `members`, which the LIST endpoint strips — so this only gives a true
 * answer on a team fetched through useTeam (the detail endpoint). Anywhere
 * else it will confidently say "no" for someone who is in fact a member.
 *
 * A sharp edge worth naming out loud rather than discovering later: when two
 * endpoints return the same TYPE with different amounts of data filled in,
 * TypeScript cannot warn you. It sees a valid `Team` either way.
 */
export function isMember(team: Team, userId: string | undefined): boolean {
  return !!userId && team.members.some((member) => member.id === userId)
}

/** Squad full — nobody else can join. Safe on list data; uses only counts. */
export function isTeamFull(team: Team): boolean {
  return team.memberCount >= team.maxMembers
}

/**
 * ============================================================
 *  INVITES — Phase 3b
 * ============================================================
 */

export type MembershipStatus = 'pending' | 'accepted' | 'declined'

/**
 * Which direction the ask went.
 *
 *   'invite'   captain → player   the PLAYER approves
 *   'request'  player  → captain  the CAPTAIN approves
 *
 * One rule covers both: THE PERSON WHO DID NOT START IT APPROVES IT.
 */
export type MembershipKind = 'invite' | 'request'

/**
 * A user the captain could invite. Comes from GET /api/users?q=…
 *
 * `alreadyMember` is computed BY THE SERVER, not by the client filtering the
 * roster itself. Two reasons:
 *
 *   1. The client would need the full roster to check, and the teams LIST
 *      endpoint strips it — so a search on a screen that only has list data
 *      would quietly get it wrong.
 *   2. The server already has both sides in front of it. Sending the answer
 *      costs one boolean; sending the raw material costs a roster.
 *
 * General habit: when a screen needs a QUESTION answered, consider answering
 * it server-side rather than shipping the data to work it out client-side.
 */
export interface InvitableUser {
  id: string
  name: string
  email: string
  alreadyMember: boolean
  alreadyInvited: boolean
}

/**
 * An invitation, as the RECIPIENT sees it.
 *
 * Note what's embedded: `teamName` and `teamColour`, not just `teamId`. The
 * inbox has to draw "Kochi United invited you", and with only an id it would
 * need a second request per invite to find out the name — the N+1 query
 * problem, on the client.
 *
 * The cost is duplication: if a team is renamed, invites already sent carry
 * the old name until refetched. That trade — one round trip versus slightly
 * stale embedded copies — is exactly what people mean by "denormalising for
 * reads", and it's a normal, deliberate API design choice rather than a
 * mistake.
 */
export interface TeamInvite {
  id: string
  teamId: string
  teamName: string
  teamColour: AvatarColour
  /** Who sent it — "Test User invited you to…". */
  invitedByName: string
  status: MembershipStatus
  /** ISO 8601, like every other date in this app. */
  createdAt: string
}

/**
 * A join request, as the CAPTAIN sees it.
 *
 * ---- ONE STORED ROW, TWO READ SHAPES ----
 *
 * `TeamInvite` above and `JoinRequest` here come from the SAME table
 * (mocks/membershipData.ts). They look different because the two screens ask
 * different questions of it:
 *
 *   the player's inbox  → "which TEAM wants me?"    → teamName, teamColour
 *   the captain's queue → "which PLAYER wants in?"  → playerName, playerEmail
 *
 * Nobody needs their own team's name printed on a row inside their own team's
 * page, and nobody in the inbox needs their own email read back to them.
 *
 * Storing one shape and returning several is normal and good. The mistake to
 * avoid is the reverse — STORING both shapes, which is two copies of one fact
 * waiting to disagree.
 */
export interface JoinRequest {
  id: string
  teamId: string
  playerId: string
  playerName: string
  playerEmail: string
  status: MembershipStatus
  createdAt: string
}
