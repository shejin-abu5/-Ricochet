import { authHeaders } from '../../../shared/api/authHeaders'
import type { PlayerProfile } from '../types'
import type { Team } from '../../teams/types'

// Both are "/me" endpoints: the server reads the token and answers about
// whoever that is. No id in the URL means no id to tamper with.

export async function fetchMyProfile(): Promise<PlayerProfile> {
  const response = await fetch('/api/me', { headers: authHeaders() })

  if (!response.ok) {
    throw new Error('Could not load your profile. Please try again.')
  }

  return response.json()
}

/**
 * The caller's teams.
 *
 * Returns `Team` rather than a narrower MyTeam, because it is the same entity
 * filtered differently — and TeamCard is exactly what the profile renders.
 */
export async function fetchMyTeams(): Promise<Team[]> {
  const response = await fetch('/api/me/teams', { headers: authHeaders() })

  if (!response.ok) {
    throw new Error('Could not load your teams. Please try again.')
  }

  return response.json()
}
