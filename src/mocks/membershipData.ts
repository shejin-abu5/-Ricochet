import type { MembershipKind, MembershipStatus } from '../features/teams/types'
import { teams } from './teamData'
import { users, TEST_USER } from './userData'

/**
 * ============================================================
 *  ONE TABLE, TWO DIRECTIONS
 * ============================================================
 *
 * Was `inviteData.ts` in Phase 3b. Renamed because it now holds two things
 * that turn out to be the same thing:
 *
 *   kind: 'invite'   the CAPTAIN asked a player to join  → the PLAYER decides
 *   kind: 'request'  a PLAYER asked to join the team     → the CAPTAIN decides
 *
 * Identical fields, identical statuses, identical lifecycle. The only
 * difference is who started it — and therefore who is allowed to answer it.
 * The rule is pleasingly symmetric:
 *
 *   THE PERSON WHO DID NOT START IT IS THE PERSON WHO APPROVES IT.
 *
 * ---- WHY NOT TWO TABLES? ----
 *
 * A separate `joinRequests` table was the obvious first instinct, and it would
 * have meant a second copy of every rule: is the squad full, is this person
 * already a member, is there already something pending, has this already been
 * answered. Two copies of validation is how one path ends up missing a check —
 * and the one that's missing is always the one nobody clicks in testing.
 *
 * The question to ask when you're about to duplicate a table: *is this a
 * genuinely different thing, or the same thing seen from the other side?*
 * Here it is plainly the second.
 */
export interface StoredMembershipRequest {
  id: string
  teamId: string
  /** The player. Whether they were invited or asked, this is who would join. */
  userId: string
  /** Who initiated it — the captain for an invite, the player for a request. */
  initiatedById: string
  kind: MembershipKind
  status: MembershipStatus
  createdAt: string
}

function hoursAgo(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

/**
 * Seeded so every screen is reachable from a fresh page load.
 *
 * You only ever log in as u1, and u1 is captain of Kochi United — so u1 needs
 * to be on BOTH sides at once: holding invites to answer, and holding join
 * requests to approve. If a screen can't be reached without a second login,
 * the seed data is incomplete.
 */
export const membershipRequests: StoredMembershipRequest[] = [
  // ---- Invites TO u1: the inbox at /invites ----
  {
    id: 'mr1',
    teamId: teams[2].id, // Marine Drive FC
    userId: TEST_USER.id,
    initiatedById: teams[2].captainId,
    kind: 'invite',
    status: 'pending',
    createdAt: hoursAgo(3),
  },
  {
    id: 'mr2',
    teamId: teams[5].id, // Kaloor Kings
    userId: TEST_USER.id,
    initiatedById: teams[5].captainId,
    kind: 'invite',
    status: 'pending',
    createdAt: hoursAgo(26),
  },
  {
    id: 'mr3',
    // Already answered, so it must NOT appear in the inbox. Proves the status
    // filter actually runs rather than assuming it does.
    teamId: teams[4].id, // Panampilly Panthers
    userId: TEST_USER.id,
    initiatedById: teams[4].captainId,
    kind: 'invite',
    status: 'declined',
    createdAt: hoursAgo(50),
  },

  // ---- An invite u1 already SENT as captain ----
  // Makes the "Invited" state visible the first time the picker is opened.
  {
    id: 'mr4',
    teamId: teams[0].id, // Kochi United
    userId: users[7].id,
    initiatedById: TEST_USER.id,
    kind: 'invite',
    status: 'pending',
    createdAt: hoursAgo(5),
  },

  // ---- Join requests TO u1's team: the captain's approval queue ----
  {
    id: 'mr5',
    teamId: teams[0].id, // Kochi United
    userId: users[12].id,
    initiatedById: users[12].id, // the player asked
    kind: 'request',
    status: 'pending',
    createdAt: hoursAgo(1),
  },
  {
    id: 'mr6',
    teamId: teams[0].id,
    userId: users[15].id,
    initiatedById: users[15].id,
    kind: 'request',
    status: 'pending',
    createdAt: hoursAgo(9),
  },
]
