import type { Match, MatchFilters } from '../types'
import type { CreateMatchFormValues } from '../schemas'
import { authHeaders } from '../../../shared/api/authHeaders'

export async function fetchMatches(filters: MatchFilters): Promise<Match[]> {
  // URLSearchParams rather than string concatenation so values are escaped —
  // a search for "R&B Turf" would otherwise split into two params.
  const params = new URLSearchParams()

  // Skipping empty values matters: "?format=" reads server-side as a filter on
  // a format named "".
  if (filters.format) params.set('format', filters.format)
  if (filters.date) params.set('date', filters.date)
  if (filters.q) params.set('q', filters.q)
  if (filters.show) params.set('show', filters.show)
  // The server defaults to 'upcoming', so only the narrowing value is sent.
  if (filters.when === 'past') params.set('when', 'past')

  const queryString = params.toString()
  const url = queryString ? `/api/matches?${queryString}` : '/api/matches'

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Could not load matches. Please try again.')
  }

  return response.json()
}

/** Resolves to the created match, including the id the server assigned. */
export async function createMatch(data: CreateMatchFormValues): Promise<Match> {
  const response = await fetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not create the match. Please try again.')
  }

  return response.json()
}

export async function fetchMatch(id: string): Promise<Match> {
  const response = await fetch(`/api/matches/${id}`)

  // "Doesn't exist" and "request failed" send the user to different places, so
  // they get different messages.
  if (response.status === 404) {
    throw new Error('That match does not exist.')
  }

  if (!response.ok) {
    throw new Error('Could not load this match. Please try again.')
  }

  return response.json()
}

/**
 * Join and leave send no body: the server identifies the caller from the
 * Authorization header, so there is no userId a client could forge. Both return
 * the updated match, which is what useJoinMatch reconciles against after its
 * optimistic update.
 */
export async function joinMatch(id: string): Promise<Match> {
  const response = await fetch(`/api/matches/${id}/join`, {
    method: 'POST',
    headers: authHeaders(),
  })

  if (!response.ok) {
    // A crashed server can return HTML, so parse defensively — otherwise the
    // JSON parse error masks the real one. The server's own message is
    // preferred: "someone just took the last spot" is actionable.
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not join this match. Please try again.')
  }

  return response.json()
}

// DELETE on the same URL as join: membership is the resource, and joining and
// leaving are opposite verbs on it.
export async function leaveMatch(id: string): Promise<Match> {
  const response = await fetch(`/api/matches/${id}/join`, {
    method: 'DELETE',
    headers: authHeaders(),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not leave this match. Please try again.')
  }

  return response.json()
}

/**
 * PATCH rather than DELETE: cancelling moves the match to a new state, it does
 * not remove it. Everyone who joined needs to open the link and see it's off.
 */
export async function cancelMatch(id: string): Promise<Match> {
  const response = await fetch(`/api/matches/${id}/cancel`, {
    method: 'PATCH',
    headers: authHeaders(),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not cancel this match. Please try again.')
  }

  return response.json()
}
