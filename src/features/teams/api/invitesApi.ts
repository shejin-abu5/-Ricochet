import { authHeaders } from '../../../shared/api/authHeaders'
import type { InvitableUser, JoinRequest, TeamInvite } from '../types'

/**
 * Raw fetch calls for invites and user search. Knows HTTP, knows nothing about
 * React — same split as matchesApi.ts and teamsApi.ts.
 */

/**
 * Search users to invite.
 *
 * `excludeTeamId` isn't a filter — everyone still comes back. It tells the
 * server WHICH team to answer "already a member?" and "already invited?"
 * against, so the picker can grey those rows out instead of letting you send
 * an invite that's guaranteed to fail.
 */
export async function searchUsers(
  q: string,
  excludeTeamId: string
): Promise<InvitableUser[]> {
  const params = new URLSearchParams({ q, excludeTeamId })
  const response = await fetch(`/api/users?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Could not search players. Please try again.')
  }

  return response.json()
}

/**
 * My pending invites.
 *
 * Note there's no userId argument. The recipient is whoever the token says —
 * a `?userId=` parameter would let anyone read anyone else's invites by
 * editing the URL.
 */
export async function fetchMyInvites(): Promise<TeamInvite[]> {
  const response = await fetch('/api/invites', { headers: authHeaders() })

  if (!response.ok) {
    throw new Error('Could not load your invites. Please try again.')
  }

  return response.json()
}

export async function sendInvite(teamId: string, userId: string): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    // The server's message is the useful one here: "Only the captain can
    // invite players", "already has a pending invite", "this squad is full".
    throw new Error(body?.message ?? 'Could not send the invite. Please try again.')
  }
}

/**
 * The join requests waiting on a captain's approval. Captain-only — the server
 * returns 403 to anyone else, whatever the UI chose to render.
 */
export async function fetchJoinRequests(teamId: string): Promise<JoinRequest[]> {
  const response = await fetch(`/api/teams/${teamId}/requests`, {
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error('Could not load join requests. Please try again.')
  }

  return response.json()
}

/**
 * Answer a pending membership — an invite you received, OR a join request
 * someone sent your team.
 *
 * ONE function for both, because it is one endpoint for both: the server works
 * out who is allowed to answer from the row's `kind`. The caller only has to
 * know the id and whether they're saying yes.
 *
 * (This was `respondToInvite` and hit `/api/invites/:id/respond`. Renamed when
 * join requests arrived — a name that describes half of what a function does
 * is worse than no name at all, because it reads as correct.)
 */
export async function respondToMembership(
  membershipId: string,
  action: 'accept' | 'decline'
): Promise<void> {
  const response = await fetch(`/api/membership/${membershipId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not respond. Please try again.')
  }
}
