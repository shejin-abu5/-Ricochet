import type { AvatarColour } from '../../shared/components/avatarColours'

/** Team data model. Mirrors docs/01-PRD.md. */

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
   * The single source of truth for who runs the team. TeamMember deliberately
   * has no `role` field: two records of the same fact drift, and a half-finished
   * captaincy transfer would leave the team with two captains or none. Role is a
   * question you answer — see isCaptain() below.
   */
  captainId: string

  /**
   * The roster. Only the detail endpoint fills this — mutations that add or
   * remove a member have to rebuild both this array and the team around it.
   */
  members: TeamMember[]

  /** Count for list views, full array for detail views — same split as Match. */
  memberCount: number

  /** Squad cap, set server-side — a client-chosen cap could be 500. */
  maxMembers: number

  /** Nested object rather than three loose fields, so it can be passed around
   *  as one thing (e.g. to a future <RecordBadge record={team.record} />). */
  record: {
    wins: number
    losses: number
    draws: number
  }

  /**
   * Whether the caller has a join request pending with this captain.
   *
   * Optional because only the detail endpoint answers it — the answer depends
   * on who is asking. Undefined means "not answered here", never "no".
   */
  yourRequestStatus?: 'none' | 'pending'
}

/** Filters the teams list supports. Only search for now. */
export interface TeamFilters {
  /** free-text search across name and location */
  q?: string
}

/** Is this user the captain of this team? */
export function isCaptain(team: Team, userId: string | undefined): boolean {
  // The !!userId guard stops undefined === undefined making a logged-out guest
  // the captain of a team with no captainId.
  return !!userId && team.captainId === userId
}

/**
 * Is this user on the roster?
 *
 * Only valid on a team from useTeam. The list endpoint strips `members`, so on
 * list data this confidently returns false for an actual member — and since both
 * endpoints return the same `Team` type, TypeScript cannot warn you.
 */
export function isMember(team: Team, userId: string | undefined): boolean {
  return !!userId && team.members.some((member) => member.id === userId)
}

/** Squad full — nobody else can join. Safe on list data; uses only counts. */
export function isTeamFull(team: Team): boolean {
  return team.memberCount >= team.maxMembers
}

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
 * A user the captain could invite. From GET /api/users?q=…
 *
 * `alreadyMember` is answered server-side: the client would need the full
 * roster to work it out, and the teams list endpoint strips it, so a search on
 * a list-data screen would quietly get it wrong.
 */
export interface InvitableUser {
  id: string
  name: string
  email: string
  alreadyMember: boolean
  alreadyInvited: boolean
}

/**
 * An invitation, as the recipient sees it.
 *
 * teamName and teamColour are embedded rather than looked up from teamId, which
 * would cost the inbox one request per row. The trade is staleness: invites
 * already sent carry the old name until refetched if a team is renamed.
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
 * A join request, as the captain sees it.
 *
 * Same stored table as TeamInvite (mocks/membershipData.ts), read through a
 * different projection: the inbox asks "which team wants me?", the captain's
 * queue asks "which player wants in?".
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
