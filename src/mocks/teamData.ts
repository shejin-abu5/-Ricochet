import type { Team, TeamMember } from '../features/teams/types'
import type { AvatarColour } from '../shared/components/avatarColours'
import { users, TEST_USER } from './userData'

/**
 * Seed data for the fake teams backend. Same approach as matchData.ts.
 *
 * The important detail is which teams TEST_USER (u1) belongs to, because that
 * is what makes both halves of the role-based UI reachable the moment you open
 * the app:
 *
 *   Kochi United      → u1 is CAPTAIN  → sees the Manage section
 *   Backwater Rovers  → u1 is a MEMBER → does not
 *   everything else   → u1 is not on the roster at all
 *
 * Without seeding all three cases you end up building one branch, seeing it
 * work, and never noticing the other two are broken.
 */

/**
 * PHASE 3B CHANGE: rosters are now built from REAL users in userData.ts rather
 * than from a list of loose names.
 *
 * It matters for invites. Searching for someone to invite has to be able to
 * tell "already on this roster" from "not on it" — and that comparison is by
 * `id`. With invented member ids like "tm0-3", every real user always looked
 * invitable, including the ones already in the team.
 *
 * A small change with a general point: fake data that does not share IDENTITY
 * with the rest of the system stops being useful the moment a feature needs to
 * cross-reference it.
 */

/**
 * Squad cap for every team.
 *
 * A constant rather than a per-team field because nothing in the product lets
 * anyone choose it — and a value nobody can change should not be an input.
 * If teams ever pick their own cap, this becomes a column and the create form
 * grows a field; until then, one number in one place.
 */
export const MAX_TEAM_MEMBERS = 15

interface Seed {
  name: string
  location: string
  homeGround: string
  playsPerWeek: number
  colour: AvatarColour
  memberCount: number
  wins: number
  losses: number
  draws: number
  /** 'captain' | 'member' | undefined — how TEST_USER relates to this team. */
  you?: 'captain' | 'member'
}

/**
 * Note "Vyttila Vipers" is seeded at exactly MAX_TEAM_MEMBERS. That is the
 * team-is-full state, reachable the moment you open the app instead of only
 * after joining a team eight times to fill it.
 *
 * Same trick as seeding u1 as captain of one team and a member of another:
 * every branch of the UI should be one click away in the seed data, or you
 * will build branches you never actually look at.
 */
const seeds: Seed[] = [
  { name: 'Kochi United', location: 'Kakkanad', homeGround: 'Greenfield Turf, Kakkanad', playsPerWeek: 3, colour: 'emerald', memberCount: 9, wins: 12, losses: 3, draws: 2, you: 'captain' },
  { name: 'Backwater Rovers', location: 'Edappally', homeGround: 'Sportz Arena, Edappally', playsPerWeek: 2, colour: 'sky', memberCount: 11, wins: 8, losses: 6, draws: 4, you: 'member' },
  { name: 'Marine Drive FC', location: 'Marine Drive', homeGround: 'Marine Drive Ground', playsPerWeek: 1, colour: 'lime', memberCount: 7, wins: 5, losses: 9, draws: 1 },
  // Full squad — the "Team full" state.
  { name: 'Vyttila Vipers', location: 'Vyttila', homeGround: 'Turf Park, Vyttila', playsPerWeek: 4, colour: 'violet', memberCount: MAX_TEAM_MEMBERS, wins: 15, losses: 2, draws: 3 },
  { name: 'Panampilly Panthers', location: 'Panampilly Nagar', homeGround: 'Panampilly Nagar Turf', playsPerWeek: 2, colour: 'amber', memberCount: 6, wins: 2, losses: 11, draws: 0 },
  { name: 'Kaloor Kings', location: 'Kaloor', homeGround: 'Kaloor Stadium Annexe', playsPerWeek: 5, colour: 'slate', memberCount: 10, wins: 9, losses: 7, draws: 5 },
]

function buildRoster(count: number, offset: number, you: Seed['you']): TeamMember[] {
  const roster: TeamMember[] = []

  // The captain is always FIRST on the roster — captainId is taken from
  // members[0] below.
  if (you) roster.push({ id: TEST_USER.id, name: TEST_USER.name })

  // Everyone except the test account, so u1 can never appear on a roster twice.
  const pool = users.filter((user) => user.id !== TEST_USER.id)

  // `offset` shifts the starting point so two teams of the same size don't end
  // up with identical rosters. The modulo wraps back to the start of the pool.
  let i = 0
  while (roster.length < count && i < pool.length) {
    const user = pool[(offset + i) % pool.length]
    if (!roster.some((member) => member.id === user.id)) {
      roster.push({ id: user.id, name: user.name })
    }
    i++
  }

  // If u1 is only a MEMBER, they should not be sitting in the captain's slot.
  // Swap them to second place so members[0] is reliably the captain.
  if (you === 'member' && roster.length > 1) {
    ;[roster[0], roster[1]] = [roster[1], roster[0]]
  }

  return roster
}

export const teams: Team[] = seeds.map((seed, index) => {
  const members = buildRoster(seed.memberCount, index * 4, seed.you)

  return {
    id: `t${index + 1}`,
    name: seed.name,
    location: seed.location,
    homeGround: seed.homeGround,
    playsPerWeek: seed.playsPerWeek,
    colour: seed.colour,
    maxMembers: MAX_TEAM_MEMBERS,
    // First on the roster runs the team. ONE fact about who the captain is —
    // see the long comment on `captainId` in features/teams/types.ts.
    captainId: members[0].id,
    members,
    // Derived, never typed by hand, so it cannot drift from the array.
    memberCount: members.length,
    record: { wins: seed.wins, losses: seed.losses, draws: seed.draws },
  }
})
