import type { Match, MatchFilters } from '../types'
import type { CreateMatchFormValues } from '../schemas'
import { authHeaders } from '../../../shared/api/authHeaders'

/**
 * The raw fetch call. Same job as authApi.ts: turn a network response into
 * either data or a thrown Error, and know nothing about React.
 *
 * Keeping this separate from the useQuery hook means the hook stays about
 * CACHING and this file stays about HTTP. Two small things you can read in
 * one sitting, instead of one file doing both.
 */
export async function fetchMatches(filters: MatchFilters): Promise<Match[]> {
  /**
   * URLSearchParams builds "?format=5v5&q=turf" for us, and — importantly —
   * escapes special characters. If someone searches for "R&B Turf", the raw
   * "&" would otherwise look like the start of a new parameter and break the
   * request. Never hand-glue query strings together.
   */
  const params = new URLSearchParams()

  // Only add a param if it actually has a value. Sending "?format=" (empty)
  // would make the server think you filtered by a format called "".
  if (filters.format) params.set('format', filters.format)
  if (filters.date) params.set('date', filters.date)
  if (filters.q) params.set('q', filters.q)
  // Absent when the dropdown is on "Any match", because MatchFilters turns
  // that option back into `undefined` before it ever reaches here.
  if (filters.show) params.set('show', filters.show)
  // Only sent when it's 'past'. The server already defaults to 'upcoming', so
  // sending it explicitly would just make every ordinary URL longer for no
  // change in behaviour.
  if (filters.when === 'past') params.set('when', 'past')

  const queryString = params.toString()
  const url = queryString ? `/api/matches?${queryString}` : '/api/matches'

  const response = await fetch(url)

  // Same trap as in authApi.ts: fetch does NOT throw on a 404 or 500.
  // Without this check, a failed request would look like a successful one
  // returning undefined, and useQuery would report success.
  if (!response.ok) {
    throw new Error('Could not load matches. Please try again.')
  }

  return response.json()
}

/**
 * POST a new match.
 *
 * Note this is the same shape as authApi.ts's login/signup: a POST with a
 * JSON body, an ok-check, and a parsed result. Once you've seen the pattern
 * three times it stops being something you think about.
 *
 * The server responds with the CREATED match — including the `id` it
 * assigned. That matters: the client can't invent ids, only the server knows
 * what's unique. (In Phase 2c we'll use that returned id to navigate
 * straight to the new match's detail page.)
 */
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

/**
 * GET one match, for the detail page.
 *
 * Note the SEPARATE error message for 404. "Could not load the match" when
 * the match simply doesn't exist sends people off to check their wifi.
 * Distinguishing "it broke" from "it isn't there" is the same distinction
 * MatchList.tsx makes between its error state and its empty state.
 */
export async function fetchMatch(id: string): Promise<Match> {
  const response = await fetch(`/api/matches/${id}`)

  if (response.status === 404) {
    throw new Error('That match does not exist.')
  }

  if (!response.ok) {
    throw new Error('Could not load this match. Please try again.')
  }

  return response.json()
}

/**
 * ============================================================
 *  JOIN AND LEAVE
 * ============================================================
 *
 * Two things worth noticing about the pair below.
 *
 * 1. NO REQUEST BODY. Not even a user id. The server works out who you are
 *    from the Authorization header (see shared/api/authHeaders.ts and
 *    getUserFromRequest in mocks/handlers.ts). Sending `{ userId: 'u1' }`
 *    would let anyone join as anyone else by editing the request.
 *
 * 2. BOTH RETURN THE UPDATED MATCH, not just "ok". That gives the mutation
 *    the server's authoritative version of the truth to reconcile against
 *    after the optimistic update — see api/useJoinMatch.ts.
 *
 * Both also surface the server's error message rather than inventing one,
 * because the server knows things the client cannot: "someone just took the
 * last spot" is far more useful than a generic "could not join".
 */
export async function joinMatch(id: string): Promise<Match> {
  const response = await fetch(`/api/matches/${id}/join`, {
    method: 'POST',
    headers: authHeaders(),
  })

  if (!response.ok) {
    // `.catch(() => null)` guards against a response with no JSON body at all
    // (a 500 from a crashed server often returns HTML). Without it, the JSON
    // parse error would replace the real error and you'd debug the wrong thing.
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? 'Could not join this match. Please try again.')
  }

  return response.json()
}

/**
 * DELETE, not POST. Joining creates your membership of this match; leaving
 * deletes it. Same resource, opposite verbs — which is why both live at the
 * same URL, `/api/matches/:id/join`.
 */
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
 * ============================================================
 *  V1 — CANCEL
 * ============================================================
 *
 * PATCH, not DELETE. Cancelling does not remove the match: eleven people
 * joined it and every one of them needs to be able to open the link and see
 * that it's off. A cancelled match is a match in a new state, not an absent
 * one. (See the handler in mocks/handlers.ts for the full verb argument.)
 *
 * No request body — the URL says which match, the token says who is asking,
 * and there is nothing left to send. Same shape as join/leave above.
 *
 * The server's own message is surfaced rather than replaced, because the
 * server knows things this function cannot: "Only the host can cancel this
 * match" is a genuinely different problem from "the network is down", and the
 * user can only act on one of them.
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
