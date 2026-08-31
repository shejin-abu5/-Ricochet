import { authHeaders } from '../../../shared/api/authHeaders'
import type { PlayerProfile } from '../types'
import type { Team } from '../../teams/types'

/**
 * Raw fetch calls for the profile. Knows HTTP, knows nothing about React —
 * the same split as every other api/ file in this codebase.
 *
 * Neither function takes a user id. Both are "/me" endpoints: the server reads
 * the token and answers about whoever that is. No id in the URL means no id to
 * tamper with, and no id for the client to plumb around. See the handler
 * comment in mocks/handlers.ts for the full reasoning.
 */

export async function fetchMyProfile(): Promise<PlayerProfile> {
  const response = await fetch('/api/me', { headers: authHeaders() })

  if (!response.ok) {
    throw new Error('Could not load your profile. Please try again.')
  }

  return response.json()
}

/**
 * The teams I'm on.
 *
 * Returns `Team` — the same type the teams feature uses — because it is the
 * same entity, just filtered differently. Inventing a `MyTeam` type here would
 * mean TeamCard could not render these, and TeamCard is exactly what the
 * profile wants to render.
 */
export async function fetchMyTeams(): Promise<Team[]> {
  const response = await fetch('/api/me/teams', { headers: authHeaders() })

  if (!response.ok) {
    throw new Error('Could not load your teams. Please try again.')
  }

  return response.json()
}
