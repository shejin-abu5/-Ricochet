import { http, HttpResponse, delay } from 'msw'
import { matches, RACE_DEMO_MATCH_ID, durationByFormat } from './matchData'
import { teams, MAX_TEAM_MEMBERS } from './teamData'
import { users, createUser, toPublicUser, toProfile, type MockUser } from './userData'
import { membershipRequests } from './membershipData'
import { tournaments, type StoredMatch, type StoredTournament } from './tournamentData'
import type { PlayPeriod, TournamentSlots } from '../features/tournaments/types'
import type { Match, MatchPlayer } from '../features/matches/types'
import type { AvatarColour } from '../shared/components/avatarColours'

/**
 * In-memory "database" for the mock backend. Resets on every page reload
 * (module re-evaluates), which is fine here — we are testing
 * the request/response contract, not building persistence.
 *
 * The tables themselves now live in their own files (userData, teamData,
 * matchData, membershipData) because several handlers need each of them.
 */

/**
 * ============================================================
 *  WHO IS ASKING? — identity comes from the token, never the body
 * ============================================================
 *
 * The client sends `Authorization: Bearer mock-jwt-u1`, and we look the user
 * up from that. It would have been less code to let the client just POST
 * `{ userId: 'u1', name: 'Test User' }` in the request body — and it would
 * have been a serious security hole, because then ANYONE could join a match
 * as anyone else simply by editing the request in devtools.
 *
 * THE RULE: the client says WHAT it wants to do. The server decides WHO is
 * doing it. Never take an actor's identity from data the actor supplied.
 *
 * (Our "token" is a fake string, so this is theatre — but it is the right
 * shape. A real JWT is signed, and the server verifies that signature here.)
 */
function getUserFromRequest(request: Request): MockUser | null {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null

  const token = header.slice('Bearer '.length)
  return users.find((u) => `mock-jwt-${u.id}` === token) ?? null
}

/** Trim a MockUser down to the small shape a roster actually needs. */
function toMatchPlayer(user: MockUser): MatchPlayer {
  return { id: user.id, name: user.name }
}

/**
 * ============================================================
 *  TOURNAMENT HELPERS
 * ============================================================
 */

/** Look up a team's display fields by id. */
function teamBadge(teamId: string | undefined) {
  if (!teamId) return {}
  const team = teams.find((t) => t.id === teamId)
  return { name: team?.name ?? 'Unknown team', colour: team?.colour ?? 'slate' }
}

/**
 * A match is 'played' once it has a winner, 'ready' when both sides are known,
 * 'pending' while an earlier round still owes it a team.
 *
 * DERIVED here on the server rather than stored on the row. Storing it would
 * mean remembering to update it every time a score is entered — one more field
 * that can contradict the others. Sending it (rather than deriving it in each
 * component) means every screen agrees.
 */
function matchStatus(match: StoredMatch): 'pending' | 'ready' | 'played' {
  if (match.winnerTeamId) return 'played'
  return match.teamAId && match.teamBId ? 'ready' : 'pending'
}

/** Join names and colours onto a stored match for the client. */
function toApiMatch(match: StoredMatch) {
  const a = teamBadge(match.teamAId)
  const b = teamBadge(match.teamBId)

  return {
    id: match.id,
    round: match.round,
    slot: match.slot,
    teamAId: match.teamAId,
    teamAName: a.name,
    teamAColour: a.colour,
    teamBId: match.teamBId,
    teamBName: b.name,
    teamBColour: b.colour,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    winnerTeamId: match.winnerTeamId,
    status: matchStatus(match),
  }
}

/**
 * Shape a stored tournament for the client.
 *
 * `includeDetail` is the list-vs-detail split again: the list needs a count and
 * a status, the detail page needs the entered teams and the whole bracket.
 * Sending brackets for every tournament in a list would be a lot of rows
 * nobody draws.
 */
function toApiTournament(
  tournament: StoredTournament,
  options: { includeDetail: boolean; viewerId?: string }
) {
  const organiser = users.find((u) => u.id === tournament.organiserId)
  const champion = tournament.championTeamId ? teamBadge(tournament.championTeamId) : undefined

  const base = {
    id: tournament.id,
    name: tournament.name,
    organiserId: tournament.organiserId,
    organiserName: organiser?.name ?? 'Unknown organiser',
    location: tournament.location,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    startTime: tournament.startTime,
    playPeriod: tournament.playPeriod,
    slots: tournament.slots,
    status: tournament.status,
    teamCount: tournament.teamIds.length,
    championTeamId: tournament.championTeamId,
    championTeamName: champion?.name,

    /**
     * ---- CONTACT DETAILS ARE GATED BEHIND LOGIN ----
     *
     * A tournament page is public — anyone can watch a bracket. But a public
     * page that prints a phone number and an email address is a page that gets
     * scraped, and the organiser did not agree to that when they filled in a
     * form asking how entrants could reach them.
     *
     * So the fields are simply ABSENT for a logged-out viewer. Note the
     * difference from hiding them in the UI: there is nothing in the response
     * to un-hide in devtools. That is the whole distinction this codebase keeps
     * coming back to — the UI decides what to SHOW, the server decides what to
     * SEND.
     *
     * (A real product would go further: rate-limit the endpoint, and probably
     * only reveal contact details to captains who have actually entered.)
     */
    ...(options.viewerId
      ? {
          contactPhone: tournament.contactPhone,
          contactEmail: tournament.contactEmail,
        }
      : {}),
  }

  if (!options.includeDetail) {
    return { ...base, teams: [] }
  }

  const enteredTeams = tournament.teamIds.map((teamId) => {
    const badge = teamBadge(teamId)
    return { teamId, teamName: badge.name!, teamColour: badge.colour! }
  })

  /**
   * Which of the viewer's teams could still enter.
   *
   * The client cannot work this out: it would need to know which teams the
   * viewer captains, which needs every team's captainId — and then cross-check
   * against the entered list. The server has both tables, so it answers.
   */
  const enterableTeams =
    options.viewerId && tournament.status === 'open'
      ? teams
          .filter(
            (team) =>
              team.captainId === options.viewerId && !tournament.teamIds.includes(team.id)
          )
          .map((team) => ({ teamId: team.id, teamName: team.name }))
      : []

  return {
    ...base,
    teams: enteredTeams,
    matches: tournament.matches.map(toApiMatch),
    enterableTeams,
  }
}

/**
 * Fisher–Yates shuffle, for the random draw.
 *
 * Worth using the real algorithm rather than `sort(() => Math.random() - 0.5)`,
 * which is the popular one-liner and is genuinely biased — comparison sorts
 * assume a consistent comparator, and a random one produces distributions
 * that are measurably not uniform. For a prize draw that matters.
 */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Draw the bracket.
 *
 * Round 1 is filled from the shuffled entry list, two teams per match. Every
 * later round is created EMPTY — the matches exist so the bracket can be drawn
 * in full from the start, and results fill them in as they come.
 *
 * Creating the whole skeleton up front (rather than generating the next round
 * when the previous one finishes) means the client never has to guess what the
 * bracket will look like, and "the final" has an id before anyone has reached
 * it.
 */
function drawBracket(tournament: StoredTournament): StoredMatch[] {
  const drawnTeams = shuffle(tournament.teamIds)
  const rounds = Math.log2(tournament.slots)
  const matches: StoredMatch[] = []

  // Round 1 — every slot filled.
  for (let slot = 0; slot < tournament.slots / 2; slot++) {
    matches.push({
      id: `${tournament.id}-r1-s${slot}`,
      round: 1,
      slot,
      teamAId: drawnTeams[slot * 2],
      teamBId: drawnTeams[slot * 2 + 1],
    })
  }

  // Later rounds — empty shells, waiting to be fed.
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = tournament.slots / 2 ** round
    for (let slot = 0; slot < matchesInRound; slot++) {
      matches.push({ id: `${tournament.id}-r${round}-s${slot}`, round, slot })
    }
  }

  return matches
}

export const handlers = [
  http.post('/api/auth/signup', async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string; password: string }

    if (users.some((u) => u.email === body.email)) {
      return HttpResponse.json({ message: 'Email already registered' }, { status: 409 })
    }

    // createUser fills in the profile defaults a new account needs until the
    // onboarding screen exists (docs/02-app-flow.md flow 1, step 3).
    const newUser = createUser(body)
    users.push(newUser)

    return HttpResponse.json({
      // toPublicUser strips the password in ONE place — see userData.ts.
      user: toPublicUser(newUser),
      token: `mock-jwt-${newUser.id}`,
    })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    const user = users.find((u) => u.email === body.email && u.password === body.password)

    if (!user) {
      return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    return HttpResponse.json({
      user: toPublicUser(user),
      token: `mock-jwt-${user.id}`,
    })
  }),

  /**
   * ============================================================
   *  TOURNAMENTS — knockout only
   * ============================================================
   */

  http.get('/api/tournaments', async ({ request }) => {
    const user = getUserFromRequest(request)

    // Soonest first, but finished ones last — an archive shouldn't sit above
    // the tournament starting on Saturday.
    const sorted = [...tournaments].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (b.status === 'completed' && a.status !== 'completed') return -1
      return a.startDate.localeCompare(b.startDate)
    })

    await delay(500)
    return HttpResponse.json(
      sorted.map((t) => toApiTournament(t, { includeDetail: false, viewerId: user?.id }))
    )
  }),

  http.get('/api/tournaments/:id', async ({ request, params }) => {
    const tournament = tournaments.find((t) => t.id === params.id)
    if (!tournament) {
      return HttpResponse.json({ message: 'Tournament not found' }, { status: 404 })
    }

    // Read the token even though the endpoint is public: `enterableTeams`
    // depends on who is asking. A logged-out visitor still sees the bracket.
    const user = getUserFromRequest(request)

    await delay(400)
    return HttpResponse.json(
      toApiTournament(tournament, { includeDetail: true, viewerId: user?.id })
    )
  }),

  http.post('/api/tournaments', async ({ request }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const body = (await request.json()) as {
      name: string
      location: string
      startDate: string
      endDate: string
      startTime: string
      playPeriod: PlayPeriod
      contactPhone: string
      contactEmail: string
      slots: TournamentSlots
    }

    // The SERVER validates the slot count, not just the form. 4/8/16 is what
    // makes the bracket a clean power of two — a client sending 6 would produce
    // a bracket that cannot be drawn.
    if (![4, 8, 16].includes(body.slots)) {
      return HttpResponse.json({ message: 'Pick 4, 8 or 16 teams' }, { status: 400 })
    }

    // The same cross-field rule the Zod schema enforces in the browser, checked
    // again here. Not redundancy — the browser check is fast feedback, this one
    // is the rule. Anyone can POST straight past the form.
    if (new Date(body.endDate) < new Date(body.startDate)) {
      return HttpResponse.json(
        { message: 'The end date cannot be before the start date' },
        { status: 400 }
      )
    }

    if (!['day', 'night', 'both'].includes(body.playPeriod)) {
      return HttpResponse.json({ message: 'Pick when matches are played' }, { status: 400 })
    }

    const newTournament: StoredTournament = {
      id: `tn${Date.now()}`,
      name: body.name.trim(),
      // You created it, so you run it — same rule as team captains.
      organiserId: user.id,
      location: body.location.trim(),
      startDate: new Date(body.startDate).toISOString(),
      endDate: new Date(body.endDate).toISOString(),
      // Stored verbatim as "HH:MM". Not parsed into a Date — a daily kickoff
      // time is wall-clock, not an instant.
      startTime: body.startTime,
      playPeriod: body.playPeriod,
      contactPhone: body.contactPhone.trim(),
      contactEmail: body.contactEmail.trim().toLowerCase(),
      slots: body.slots,
      status: 'open',
      teamIds: [],
      matches: [],
    }

    tournaments.push(newTournament)

    await delay(500)
    return HttpResponse.json(
      toApiTournament(newTournament, { includeDetail: true, viewerId: user.id }),
      { status: 201 }
    )
  }),

  /**
   * POST /api/tournaments/:id/teams — enter one of your teams.
   *
   * Deliberately NOT an invite/accept round-trip like team membership. A
   * captain entering their own team is one person deciding one thing about
   * their own team — there is no second party whose consent is needed, so
   * adding an approval step would be ceremony for its own sake.
   *
   * (Organiser-issued invitations are the natural next step, and would reuse
   * the membership-table pattern from Phase 3b almost exactly.)
   */
  http.post('/api/tournaments/:id/teams', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const tournament = tournaments.find((t) => t.id === params.id)
    if (!tournament) {
      return HttpResponse.json({ message: 'Tournament not found' }, { status: 404 })
    }

    const body = (await request.json()) as { teamId: string }
    const team = teams.find((t) => t.id === body.teamId)
    if (!team) {
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    // Only the captain may commit a team to a tournament. The UI only offers
    // teams you captain — this is the line that actually enforces it.
    if (team.captainId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the captain can enter a team' },
        { status: 403 }
      )
    }

    await delay(700)

    if (tournament.status !== 'open') {
      return HttpResponse.json(
        { message: 'This tournament has already started' },
        { status: 409 }
      )
    }

    if (tournament.teamIds.includes(team.id)) {
      return HttpResponse.json({ message: `${team.name} is already entered` }, { status: 409 })
    }

    if (tournament.teamIds.length >= tournament.slots) {
      return HttpResponse.json({ message: 'This tournament is full' }, { status: 409 })
    }

    tournament.teamIds.push(team.id)

    return HttpResponse.json(
      toApiTournament(tournament, { includeDetail: true, viewerId: user.id })
    )
  }),

  /**
   * POST /api/tournaments/:id/draw — organiser draws the bracket.
   *
   * Requires EXACTLY a full field. That is the constraint that removes byes
   * entirely: with 4, 8 or 16 teams and no empty slots, every round halves
   * cleanly and nobody sits one out.
   */
  http.post('/api/tournaments/:id/draw', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const tournament = tournaments.find((t) => t.id === params.id)
    if (!tournament) {
      return HttpResponse.json({ message: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.organiserId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the organiser can draw the bracket' },
        { status: 403 }
      )
    }

    await delay(900)

    if (tournament.status !== 'open') {
      return HttpResponse.json(
        { message: 'The bracket has already been drawn' },
        { status: 409 }
      )
    }

    if (tournament.teamIds.length !== tournament.slots) {
      return HttpResponse.json(
        {
          message: `Needs all ${tournament.slots} teams — ${tournament.teamIds.length} entered so far`,
        },
        { status: 409 }
      )
    }

    tournament.matches = drawBracket(tournament)
    tournament.status = 'in_progress'

    return HttpResponse.json(
      toApiTournament(tournament, { includeDetail: true, viewerId: user.id })
    )
  }),

  /**
   * POST /api/tournaments/:id/matches/:matchId/result
   *
   * ---- THE ADVANCEMENT RULE, IN ONE PLACE ----
   *
   * Recording a result does three things: stores the score, works out the
   * winner, and pushes that winner into the next round's slot. All three
   * happen HERE, server-side, together.
   *
   * That last part is the important design call. The client could compute
   * where a winner goes — the formula is simple — but then every client would
   * have to agree, forever, and a bracket that disagrees with itself is a
   * tournament nobody trusts. Progression is a rule about the data, so it
   * lives with the data.
   */
  http.post('/api/tournaments/:id/matches/:matchId/result', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const tournament = tournaments.find((t) => t.id === params.id)
    if (!tournament) {
      return HttpResponse.json({ message: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.organiserId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the organiser can record results' },
        { status: 403 }
      )
    }

    const match = tournament.matches.find((m) => m.id === params.matchId)
    if (!match) {
      return HttpResponse.json({ message: 'Match not found' }, { status: 404 })
    }

    const body = (await request.json()) as { scoreA: number; scoreB: number }

    await delay(700)

    if (!match.teamAId || !match.teamBId) {
      return HttpResponse.json(
        { message: 'Both teams have to be decided first' },
        { status: 409 }
      )
    }

    if (match.winnerTeamId) {
      return HttpResponse.json(
        { message: 'That result has already been recorded' },
        { status: 409 }
      )
    }

    if (
      !Number.isInteger(body.scoreA) ||
      !Number.isInteger(body.scoreB) ||
      body.scoreA < 0 ||
      body.scoreB < 0
    ) {
      return HttpResponse.json({ message: 'Scores must be whole numbers' }, { status: 400 })
    }

    // No draws. A knockout round has to produce someone to send forward, so a
    // tie is not a result the bracket can accept — in a real cup this is what
    // extra time and penalties are for.
    if (body.scoreA === body.scoreB) {
      return HttpResponse.json(
        { message: 'A knockout match needs a winner — no draws' },
        { status: 400 }
      )
    }

    match.scoreA = body.scoreA
    match.scoreB = body.scoreB
    match.winnerTeamId = body.scoreA > body.scoreB ? match.teamAId : match.teamBId

    const totalRounds = Math.log2(tournament.slots)

    if (match.round === totalRounds) {
      // That was the final.
      tournament.championTeamId = match.winnerTeamId
      tournament.status = 'completed'
    } else {
      // Winner of (round r, slot s) → (round r+1, slot ⌊s/2⌋), into side A if
      // s is even and side B if s is odd. The whole bracket in one rule.
      const next = tournament.matches.find(
        (m) => m.round === match.round + 1 && m.slot === Math.floor(match.slot / 2)
      )

      if (next) {
        if (match.slot % 2 === 0) {
          next.teamAId = match.winnerTeamId
        } else {
          next.teamBId = match.winnerTeamId
        }
      }
    }

    return HttpResponse.json(
      toApiTournament(tournament, { includeDetail: true, viewerId: user.id })
    )
  }),

  /**
   * ============================================================
   *  PROFILE
   * ============================================================
   *
   * GET /api/me — my own profile.
   *
   * ---- WHY "/me" AND NOT "/users/u1" ----
   *
   * You could fetch your own profile from /api/users/:id with your own id. Two
   * reasons not to:
   *
   *   1. SECURITY. /users/:id has to decide, per field, what one person may see
   *      about another. /me has no such question — it is always you, taken from
   *      the token, and no id in the URL means no id to tamper with. Same
   *      reasoning as GET /api/invites in Phase 3b.
   *   2. THE CLIENT DOESN'T NEED TO KNOW ITS OWN ID. Anything that reads the
   *      profile just calls /api/me. No plumbing an id through, no bug where a
   *      component renders before the auth store has rehydrated and fetches
   *      /users/undefined.
   *
   * "/me" is a near-universal convention for exactly this.
   */
  http.get('/api/me', async ({ request }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    await delay(400)
    return HttpResponse.json(toProfile(user))
  }),

  /**
   * GET /api/me/teams — the teams I'm on.
   *
   * A dedicated endpoint rather than making the client fetch every team and
   * filter by "am I in the members array". That would need the full roster of
   * every team in the system — which the teams LIST endpoint deliberately
   * strips — so the client literally cannot answer this question from data it
   * already has.
   *
   * Rosters are stripped here too, for the same payload reason. The profile
   * only draws name, colour and member count.
   */
  http.get('/api/me/teams', async ({ request }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const mine = teams
      .filter((team) => team.members.some((member) => member.id === user.id))
      .map(({ members: _members, ...rest }) => ({ ...rest, members: [] }))

    await delay(400)
    return HttpResponse.json(mine)
  }),

  /**
   * GET /api/matches?format=5v5&date=week&q=turf
   *
   * IMPORTANT: the filtering happens HERE, on the "server", not in the browser.
   * That is deliberate, and it is the whole point of the query-key design:
   * because each filter combination is a different REQUEST, TanStack Query
   * stores each one as a separate cache entry. If we returned all matches and
   * filtered them in React instead, there'd be exactly one cache entry and
   * query keys would teach you nothing.
   *
   * A real backend would do this in SQL. Same idea, different tool.
   */
  http.get('/api/matches', async ({ request }) => {
    // request.url is a full string; the URL class gives us a searchParams
    // helper so we don't have to parse "?format=5v5&q=turf" by hand.
    const url = new URL(request.url)
    const format = url.searchParams.get('format')
    const date = url.searchParams.get('date')
    const q = url.searchParams.get('q')?.trim().toLowerCase()
    // Defaulting here, not on the client, is what keeps every caller that
    // predates V1 working unchanged: no param means the same "upcoming only"
    // list the endpoint has always returned.
    const when = url.searchParams.get('when') === 'past' ? 'past' : 'upcoming'

    const now = new Date()

    /**
     * ---- UPCOMING vs PAST, and why it isn't just a date comparison ----
     *
     * Before V1 this line was `new Date(m.dateTime) >= now` and that was the
     * whole lifecycle: a match was "on" if its kickoff hadn't happened. Two
     * things broke that.
     *
     *   A CANCELLED match can still be in the future. Its kickoff is next
     *   Friday and it is nevertheless over — you cannot join it.
     *
     *   A SCHEDULED match can be in the past. Kickoff was yesterday and nobody
     *   has recorded attendance yet. It is over in every sense a player cares
     *   about, and it is exactly the match the HOST needs to find in order to
     *   mark who turned up.
     *
     * So "upcoming" is the conjunction of both facts, and "past" is simply
     * everything else. Written as one predicate and its negation rather than
     * two independent filters, because two independent filters can drift into
     * overlapping (a match in both lists) or leaving a gap (a match in neither).
     */
    const isUpcoming = (m: Match) => m.status === 'scheduled' && new Date(m.dateTime) >= now

    // Each .filter() returns a NEW array rather than modifying the original —
    // important, because `matches` is our pretend database and a READ must
    // never mutate it.
    let results = matches.filter((m) => (when === 'past' ? !isUpcoming(m) : isUpcoming(m)))

    if (format) {
      results = results.filter((m) => m.format === format)
    }

    if (date === 'today') {
      results = results.filter(
        (m) => new Date(m.dateTime).toDateString() === now.toDateString()
      )
    } else if (date === 'week') {
      const weekFromNow = new Date(now)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      results = results.filter((m) => new Date(m.dateTime) <= weekFromNow)
    }

    if (q) {
      results = results.filter(
        (m) =>
          m.title.toLowerCase().includes(q) || m.location.toLowerCase().includes(q)
      )
    }

    /**
     * Soonest first for upcoming; most recent first for past.
     *
     * The two lists answer opposite questions — "what's next?" and "what just
     * happened?" — and in both cases the interesting end is the one nearest to
     * now. A single fixed sort would put the interesting end of one of them at
     * the bottom of the page.
     */
    results.sort((a, b) =>
      when === 'past'
        ? b.dateTime.localeCompare(a.dateTime)
        : a.dateTime.localeCompare(b.dateTime)
    )

    // A deliberate delay so you can actually SEE the loading skeletons.
    // Real networks are slow; localhost is not. Remove this and the loading
    // state flashes by too fast to notice you built it.
    //
    // `delay` is MSW's own helper — the same thing as the hand-rolled
    // `new Promise(resolve => setTimeout(...))` this file used to do, but
    // readable in one line.
    await delay(600)
    return HttpResponse.json(results)
  }),

  /**
   * GET /api/matches/:id — one match, for the detail page.
   *
   * `params.id` comes from the `:id` in the path above. MSW parses it for us,
   * the same way React Router's useParams() does on the client side.
   *
   * Note this returns the SAME object shape as the list endpoint. That is
   * deliberate: the optimistic update in useJoinMatch.ts patches both the
   * detail cache entry and the list cache entries, and it can only share one
   * patching function if both hold identically-shaped data.
   */
  http.get('/api/matches/:id', async ({ params }) => {
    const match = matches.find((m) => m.id === params.id)

    // 404 = "there is no such thing here". Returning 200 with `null` instead
    // is a classic API mistake — the client then has to check for null on a
    // response it was just told was successful.
    if (!match) {
      return HttpResponse.json({ message: 'Match not found' }, { status: 404 })
    }

    await delay(400)
    return HttpResponse.json(match)
  }),

  /**
   * POST /api/matches/:id/join
   *
   * Every rejection below is a case the UI has to survive. Write the server's
   * "no"s first and the client's optimistic update almost designs itself —
   * each 4xx here is one thing the rollback has to be able to undo.
   */
  http.post('/api/matches/:id/join', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    // 401 = "I do not know who you are". Distinct from 403, which means
    // "I know exactly who you are and you are still not allowed".
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const match = matches.find((m) => m.id === params.id)
    if (!match) {
      return HttpResponse.json({ message: 'Match not found' }, { status: 404 })
    }

    // Deliberately slow, so the optimistic update stays on screen long enough
    // to actually watch it happen (and watch it get rolled back).
    await delay(900)

    /**
     * V1 — you cannot join a match that is over.
     *
     * This check has to live HERE and not only in the UI. The client hides the
     * Join button on a cancelled match, but a hidden button is a suggestion,
     * not a rule: anyone can POST this URL directly. Every rule that actually
     * matters is enforced by the server — the same point as maxPlayers being
     * server-derived in the create handler below.
     */
    if (match.status !== 'scheduled') {
      return HttpResponse.json(
        {
          message:
            match.status === 'cancelled'
              ? 'This match was cancelled'
              : 'This match has already been played',
        },
        { status: 409 }
      )
    }

    /**
     * ---- THE RACE-CONDITION DEMO ----
     *
     * Optimistic UI is invisible when the server always says yes. So one
     * seeded match (see RACE_DEMO_MATCH_ID in matchData.ts) simulates the
     * exact scenario docs/01-PRD.md calls out: it had one seat left, and
     * during the 900ms your request spent in flight, somebody else took it.
     *
     * We add that somebody, then reject you. On screen: your name appears in
     * the roster instantly, then vanishes, and the match flips to "Full" once
     * the refetch lands. That whole sequence is the point of the fixture.
     *
     * It fires once per page load — afterwards the match is genuinely full and
     * the ordinary "match is full" branch below takes over. A real backend
     * would not have this block; it would just lose the race honestly.
     */
    if (match.id === RACE_DEMO_MATCH_ID && match.players.length === match.maxPlayers - 1) {
      match.players.push({ id: 'ghost', name: 'Someone Else' })
      match.playerCount = match.players.length
      return HttpResponse.json(
        { message: 'Too slow — someone just took the last spot' },
        { status: 409 }
      )
    }

    // 409 Conflict = "your request was fine, but it clashes with the current
    // state of the thing". The right status for both of these.
    if (match.players.some((p) => p.id === user.id)) {
      return HttpResponse.json({ message: 'You have already joined' }, { status: 409 })
    }

    if (match.players.length >= match.maxPlayers) {
      return HttpResponse.json({ message: 'This match is full' }, { status: 409 })
    }

    match.players.push(toMatchPlayer(user))
    match.playerCount = match.players.length

    // Return the whole updated match, not just "ok". The client then has the
    // authoritative version to drop straight into its cache — no second
    // request needed to find out what actually happened.
    return HttpResponse.json(match)
  }),

  /**
   * DELETE /api/matches/:id/join — leave a match.
   *
   * Why DELETE on the same path rather than POST /leave: joining CREATES your
   * membership, leaving DELETES it. Same resource ("my membership of this
   * match"), two different verbs. That is what HTTP verbs are for.
   */
  http.delete('/api/matches/:id/join', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const match = matches.find((m) => m.id === params.id)
    if (!match) {
      return HttpResponse.json({ message: 'Match not found' }, { status: 404 })
    }

    await delay(900)

    // Leaving a finished match is meaningless — and worse, leaving a COMPLETED
    // one would quietly rewrite history by removing you from a roster whose
    // attendance has already been recorded against it.
    if (match.status !== 'scheduled') {
      return HttpResponse.json(
        { message: 'This match is no longer open' },
        { status: 409 }
      )
    }

    if (!match.players.some((p) => p.id === user.id)) {
      return HttpResponse.json({ message: 'You are not in this match' }, { status: 409 })
    }

    match.players = match.players.filter((p) => p.id !== user.id)
    match.playerCount = match.players.length

    return HttpResponse.json(match)
  }),

  /**
   * ============================================================
   *  V1 — THE MATCH LIFECYCLE
   * ============================================================
   *
   * PATCH /api/matches/:id/cancel — the host calls it off.
   *
   * ---- WHY PATCH AND NOT POST OR DELETE ----
   *
   *   DELETE would mean "this match never existed". Wrong: eleven people
   *          joined it and they need to be told it's off. A cancelled match is
   *          a match with a new state, not an absent one. (This is the same
   *          reason real systems soft-delete: the row still has to be readable
   *          by everyone who cared about it.)
   *   POST   creates something. Nothing is created here.
   *   PATCH  "here are the fields that changed" — which is exactly one field,
   *          status. That's the verb.
   *
   * ---- WHY A NAMED SUB-PATH RATHER THAN PATCH /matches/:id ----
   *
   * A generic PATCH would accept `{ status: 'cancelled' }` in the body — and
   * then it also has to decide what to do about `{ status: 'completed' }`,
   * `{ maxPlayers: 500 }`, and every other field a client might send. A named
   * endpoint accepts one intention and nothing else, so there is no body to
   * validate and no field to accidentally leave writable. This is sometimes
   * called "RPC-flavoured REST"; the honest defence is that "cancel" is a verb
   * with rules, not a field assignment.
   */
  http.patch('/api/matches/:id/cancel', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const match = matches.find((m) => m.id === params.id)
    if (!match) {
      return HttpResponse.json({ message: 'Match not found' }, { status: 404 })
    }

    /**
     * 403, not 401. The distinction is worth being able to state out loud:
     *
     *   401 Unauthorized  "I don't know who you are."     → go and log in
     *   403 Forbidden     "I know exactly who you are,     → logging in again
     *                      and you still can't do this."      won't help
     *
     * Returning 401 here would send a perfectly well-authenticated player to
     * the login screen to fix a problem logging in cannot fix.
     */
    if (match.creatorId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the host can cancel this match' },
        { status: 403 }
      )
    }

    /**
     * 409 Conflict — the request is well-formed, it just clashes with the
     * state the thing is currently in. Cancelling twice is not an error in the
     * client's grammar; it is an error in the world.
     *
     * Note this also blocks cancelling a COMPLETED match. Both terminal states
     * are terminal: once attendance is recorded, "actually it never happened"
     * would orphan the appearances already counted against it.
     */
    if (match.status !== 'scheduled') {
      return HttpResponse.json(
        {
          message:
            match.status === 'cancelled'
              ? 'This match is already cancelled'
              : 'A completed match cannot be cancelled',
        },
        { status: 409 }
      )
    }

    await delay(700)

    match.status = 'cancelled'

    // The whole updated match, as everywhere else in this file — so the client
    // can drop the authoritative version straight into its cache rather than
    // making a second request to find out what happened.
    return HttpResponse.json(match)
  }),

  /**
   * POST /api/matches/:id/attendance — the host records who turned up, and the
   * match becomes 'completed'.
   *
   * POST rather than PATCH because this genuinely CREATES something that did
   * not exist before: the attendance record. That it also flips `status` is a
   * consequence, not the point.
   *
   * ---- ONE REQUEST, TWO EFFECTS, ON PURPOSE ----
   *
   * The alternative design is two endpoints: "save attendance", then "mark
   * completed". That would let the two get out of step — a match with
   * attendance that is somehow still scheduled, or completed with no record of
   * who played. Recording attendance IS what completing a match means here, so
   * it is one atomic operation with one chance to fail.
   */
  http.post('/api/matches/:id/attendance', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const match = matches.find((m) => m.id === params.id)
    if (!match) {
      return HttpResponse.json({ message: 'Match not found' }, { status: 404 })
    }

    if (match.creatorId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the host can record attendance' },
        { status: 403 }
      )
    }

    if (match.status !== 'scheduled') {
      return HttpResponse.json(
        {
          message:
            match.status === 'cancelled'
              ? 'This match was cancelled'
              : 'Attendance has already been recorded',
        },
        { status: 409 }
      )
    }

    /**
     * You cannot record who turned up to a match that hasn't happened.
     *
     * The UI hides the panel until kickoff has passed, but — same principle as
     * the join guard above — a hidden control is a suggestion and a server
     * check is a rule.
     */
    if (new Date(match.dateTime) > new Date()) {
      return HttpResponse.json(
        { message: "This match hasn't kicked off yet" },
        { status: 409 }
      )
    }

    const body = (await request.json()) as { present: string[] }

    /**
     * ---- SANITISE AGAINST THE ROSTER, DON'T TRUST THE LIST ----
     *
     * The client sends a list of ids. We do NOT store it as sent. Intersecting
     * it with the actual roster means:
     *
     *   - an id for someone who never joined is dropped, rather than becoming
     *     a phantom appearance on a stranger's profile
     *   - duplicates collapse, because we iterate the roster (each player
     *     appears once in it by construction) and test membership, rather than
     *     iterating what was sent
     *
     * Filtering the SOURCE OF TRUTH by the input, instead of filtering the
     * input, is the general shape of this. It makes the worst case "we ignored
     * something you sent" rather than "we stored something you invented".
     */
    const sent = new Set(body.present ?? [])
    const present = match.players.filter((p) => sent.has(p.id)).map((p) => p.id)

    await delay(700)

    match.attendance = present
    match.status = 'completed'

    return HttpResponse.json(match)
  }),

  /**
   * POST /api/matches — create a match.
   *
   * This pushes into the SAME `matches` array that GET reads from, which is
   * what makes cache invalidation demonstrable: create one, get sent back to
   * the list, and it's genuinely there.
   *
   * (It lives in memory, so a full page reload resets it back to the 16
   * seeded matches. A real backend would write to a database.)
   */
  http.post('/api/matches', async ({ request }) => {
    // Same identity rule as join/leave: the creator is whoever the token says,
    // not whoever the request body claims. This used to be hardcoded to 'u1'.
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const body = (await request.json()) as {
      title: string
      location: string
      dateTime: string
      format: '5v5' | '7v7' | '11v11'
      skillLevel: 'beginner' | 'intermediate' | 'advanced'
      notes?: string
    }

    // The SERVER decides maxPlayers, not the client. Anyone can edit a
    // request in devtools, so any rule that actually matters has to be
    // enforced here — the client-side Zod schema is only for fast feedback.
    const maxPlayersByFormat = { '5v5': 10, '7v7': 14, '11v11': 22 } as const

    const newMatch = {
      id: `m${Date.now()}`,
      title: body.title,
      location: body.location,
      // Normalise to a full ISO string; the form sends "2026-08-22T18:30"
      // with no timezone, and every other match in the list is ISO.
      dateTime: new Date(body.dateTime).toISOString(),
      format: body.format,
      maxPlayers: maxPlayersByFormat[body.format],
      // You created it, so you're the first one on the roster.
      players: [toMatchPlayer(user)],
      playerCount: 1,
      skillLevel: body.skillLevel,
      creatorId: user.id,
      creatorName: user.name,
      // Server-derived from the format, like maxPlayers — the client never
      // sends it, so it cannot be wrong.
      durationMinutes: durationByFormat[body.format],
      // Trimmed, and stored as undefined rather than '' when blank: an empty
      // string is truthy-adjacent noise that every reader then has to guard.
      notes: body.notes?.trim() || undefined,
      /**
       * V1: every match starts scheduled. Server-set, like maxPlayers and
       * durationMinutes — the create form has no status field and never will,
       * because "create a match that is already cancelled" is not a thing
       * anyone wants to do. If the client cannot choose it, do not ask.
       */
      status: 'scheduled' as const,
    }

    matches.push(newMatch)

    await delay(500)
    // 201 Created is the correct status for "I made a new thing", and the
    // body is the created resource including its server-assigned id.
    return HttpResponse.json(newMatch, { status: 201 })
  }),

  /**
   * ============================================================
   *  TEAMS — Phase 3a
   * ============================================================
   *
   * Deliberately the same three shapes as matches: list with a search param,
   * detail by id, create. Third time through, so it should read as boring —
   * that is what a convention feels like once it has settled.
   */

  http.get('/api/teams', async ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase()

    let results = teams

    if (q) {
      results = results.filter(
        (t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
      )
    }

    /**
     * THE LIST ENDPOINT STRIPS THE ROSTER.
     *
     * Six teams with a dozen members each is a lot of names to send for a
     * screen that only draws "9 members". So the list returns everything
     * EXCEPT `members`, and the detail endpoint returns the full team.
     *
     * This is why Team keeps both `members` and `memberCount` — and it is a
     * real API design decision, not mock-data convenience. Ask any backend
     * engineer about "list vs detail serializers" and this is what they mean.
     */
    // `{ members: _unused, ...rest }` is the standard "everything except this
    // key" trick. The underscore prefix tells the linter the binding is
    // deliberately unused — we only destructured it to keep it OUT of `rest`.
    const summaries = results.map(({ members: _unused, ...rest }) => ({
      ...rest,
      members: [],
    }))

    await delay(500)
    return HttpResponse.json(summaries)
  }),

  http.get('/api/teams/:id', async ({ request, params }) => {
    const team = teams.find((t) => t.id === params.id)

    if (!team) {
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    /**
     * The answer here depends on WHO is asking, so the token is read even
     * though the endpoint itself is public (a logged-out visitor still gets
     * the team, just without the personalised field).
     *
     * `yourRequestStatus` saves the client a second request to work out
     * whether it should draw "Request to join" or "Request sent" — same
     * instinct as `alreadyMember` on the user search: the server has the
     * tables, so let it answer the question.
     */
    const user = getUserFromRequest(request)
    const yourRequestStatus =
      user &&
      membershipRequests.some(
        (row) =>
          row.teamId === team.id &&
          row.userId === user.id &&
          row.kind === 'request' &&
          row.status === 'pending'
      )
        ? 'pending'
        : 'none'

    await delay(400)
    return HttpResponse.json({ ...team, yourRequestStatus })
  }),

  http.post('/api/teams', async ({ request }) => {
    // Identity from the token, as always. The creator becomes the captain, so
    // letting the client name the captain would let anyone create a team with
    // someone else in charge.
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const body = (await request.json()) as {
      name: string
      location: string
      homeGround: string
      playsPerWeek: number
      colour: AvatarColour
    }

    // Team names have to be unique — otherwise "which Kochi United?" becomes a
    // real question the moment invites exist. 409 Conflict, same as a duplicate
    // signup email in the auth handler above.
    if (teams.some((t) => t.name.toLowerCase() === body.name.trim().toLowerCase())) {
      return HttpResponse.json({ message: 'A team with that name already exists' }, { status: 409 })
    }

    const newTeam = {
      id: `t${Date.now()}`,
      name: body.name.trim(),
      location: body.location.trim(),
      homeGround: body.homeGround.trim(),
      playsPerWeek: body.playsPerWeek,
      colour: body.colour,
      // You made it, so you run it and you are the only one on the roster.
      captainId: user.id,
      members: [{ id: user.id, name: user.name }],
      memberCount: 1,
      // The SERVER sets the cap and the record. A client that could POST its
      // own win/loss record could invent a 50-0 team, and one that could set
      // its own cap could set it to 500 — the same "any rule that matters is
      // enforced server-side" point as maxPlayers in Phase 2b.
      maxMembers: MAX_TEAM_MEMBERS,
      record: { wins: 0, losses: 0, draws: 0 },
    }

    teams.push(newTeam)

    await delay(500)
    return HttpResponse.json(newTeam, { status: 201 })
  }),

  /**
   * PATCH /api/teams/:id — edit team settings. Captain only.
   *
   * ---- PATCH vs PUT ----
   *
   *   PUT    "here is the WHOLE resource, replace it"  — anything you omit is
   *          erased, so the client must send every field every time.
   *   PATCH  "here are the fields that CHANGED"        — everything else is
   *          left alone.
   *
   * PATCH is right for a settings form: the client has no business sending
   * `members`, `record` or `captainId` back, and with PUT it would have to —
   * giving a malicious client a chance to "replace" its own record with 50-0.
   *
   * Note which fields are accepted below. Not `record` (the server owns
   * results), not `members` (that's the join/invite flow), not `captainId`
   * (transferring captaincy is its own operation with its own rules). An
   * endpoint that accepts whatever it's handed is how privilege escalation
   * bugs happen — always name the editable fields explicitly.
   */
  http.patch('/api/teams/:id', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const team = teams.find((t) => t.id === params.id)
    if (!team) {
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    if (team.captainId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the captain can change team settings' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      name: string
      location: string
      homeGround: string
      playsPerWeek: number
      colour: AvatarColour
    }

    await delay(600)

    // Names stay unique — but compare against OTHER teams only, or saving the
    // form without touching the name would collide with itself.
    const nameTaken = teams.some(
      (t) => t.id !== team.id && t.name.toLowerCase() === body.name.trim().toLowerCase()
    )
    if (nameTaken) {
      return HttpResponse.json(
        { message: 'A team with that name already exists' },
        { status: 409 }
      )
    }

    team.name = body.name.trim()
    team.location = body.location.trim()
    team.homeGround = body.homeGround.trim()
    team.playsPerWeek = body.playsPerWeek
    team.colour = body.colour

    return HttpResponse.json(team)
  }),

  /**
   * POST /api/teams/:id/join — ASK to join. The captain decides.
   *
   * ---- THIS USED TO JOIN YOU IMMEDIATELY ----
   *
   * It was a straight "push you onto the roster and return the team". That was
   * wrong for a team, which is a group of people who get a say in who else is
   * in it — unlike a pickup match, where anyone can take an open slot.
   *
   * So the response changed shape entirely: it now returns a PENDING REQUEST,
   * not an updated team. Nobody is on any roster when this succeeds.
   *
   * That single change ripples all the way to the client. The old join was
   * optimistic — the client knew exactly what the result would be, so it drew
   * it instantly. It cannot do that any more, because the result is now
   * somebody else's decision. See the note at the top of useJoinTeam.ts.
   */
  http.post('/api/teams/:id/join', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const team = teams.find((t) => t.id === params.id)
    if (!team) {
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    await delay(800)

    if (team.members.some((m) => m.id === user.id)) {
      return HttpResponse.json({ message: 'You are already in this team' }, { status: 409 })
    }

    if (team.members.length >= team.maxMembers) {
      return HttpResponse.json({ message: 'This squad is full' }, { status: 409 })
    }

    // Already asked, or the captain already invited you — either way there is
    // a pending row for this pair, and a second one would be meaningless.
    // Note it checks BOTH kinds: if the captain has already invited you, the
    // right thing is to answer that invite, not to open a second conversation.
    const existing = membershipRequests.some(
      (row) => row.teamId === team.id && row.userId === user.id && row.status === 'pending'
    )
    if (existing) {
      return HttpResponse.json(
        { message: 'You already have something pending with this team' },
        { status: 409 }
      )
    }

    const newRequest = {
      id: `mr${Date.now()}`,
      teamId: team.id,
      userId: user.id,
      // YOU started this one, so the captain is the one who answers it.
      initiatedById: user.id,
      kind: 'request' as const,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }

    membershipRequests.push(newRequest)

    return HttpResponse.json(newRequest, { status: 201 })
  }),

  /**
   * GET /api/teams/:id/requests — the captain's approval queue.
   *
   * Captain-only, 403 otherwise. Same enforcement as the invite endpoint: the
   * UI hides this panel from members, and this line is what actually stops
   * anyone who goes around the UI.
   *
   * Returns the JoinRequest read-shape (player name and email), not the invite
   * shape (team name and colour) — same stored rows, different question. See
   * the comment on JoinRequest in features/teams/types.ts.
   */
  http.get('/api/teams/:id/requests', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const team = teams.find((t) => t.id === params.id)
    if (!team) {
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    if (team.captainId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the captain can see join requests' },
        { status: 403 }
      )
    }

    const pending = membershipRequests
      .filter(
        (row) => row.teamId === team.id && row.kind === 'request' && row.status === 'pending'
      )
      .map((row) => {
        const player = users.find((u) => u.id === row.userId)

        return {
          id: row.id,
          teamId: row.teamId,
          playerId: row.userId,
          playerName: player?.name ?? 'Unknown player',
          playerEmail: player?.email ?? '',
          status: row.status,
          createdAt: row.createdAt,
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    await delay(400)
    return HttpResponse.json(pending)
  }),

  /**
   * DELETE /api/teams/:id/join — leave a team.
   *
   * The captain cannot leave. A team with no captain has nobody who can invite
   * anyone or accept a challenge — it is a dead object in the database.
   * Handing the armband over first is Phase 3b's problem; refusing to create
   * the broken state is this handler's.
   *
   * 403, not 409: we know exactly who you are, and you specifically are not
   * allowed to do this.
   */
  http.delete('/api/teams/:id/join', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const team = teams.find((t) => t.id === params.id)
    if (!team) {
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    await delay(900)

    if (team.captainId === user.id) {
      return HttpResponse.json(
        { message: 'A captain cannot leave their own team' },
        { status: 403 }
      )
    }

    if (!team.members.some((m) => m.id === user.id)) {
      return HttpResponse.json({ message: 'You are not in this team' }, { status: 409 })
    }

    team.members = team.members.filter((m) => m.id !== user.id)
    team.memberCount = team.members.length

    return HttpResponse.json(team)
  }),

  /**
   * ============================================================
   *  INVITES — Phase 3b
   * ============================================================
   */

  /**
   * GET /api/users?q=arjun&excludeTeamId=t1
   *
   * Search for people to invite. Two things this handler does that a naive
   * version wouldn't:
   *
   *   1. Requires a query. Returning all 18 users for an empty search would
   *      mean the client fetching the entire user table every time the panel
   *      opens. Real user tables are not 18 rows.
   *   2. Answers "already a member?" and "already invited?" itself, rather
   *      than shipping the roster and the invite list to the client to work it
   *      out. It has both tables in front of it; the client has neither.
   */
  http.get('/api/users', async ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase()
    const excludeTeamId = url.searchParams.get('excludeTeamId')

    // Empty search = empty result, not "everyone".
    if (!q) return HttpResponse.json([])

    const team = excludeTeamId ? teams.find((t) => t.id === excludeTeamId) : undefined

    const results = users
      .filter(
        (user) =>
          user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      )
      // A search endpoint with no cap is a denial-of-service waiting to happen
      // on a real table. Ten is plenty for a picker.
      .slice(0, 10)
      .map((user) => ({
        ...toPublicUser(user),
        alreadyMember: team?.members.some((m) => m.id === user.id) ?? false,
        // Deliberately checks BOTH kinds. If this player has already ASKED to
        // join, the captain shouldn't be offered an "Invite" button — the
        // right action is to approve the request sitting in their queue.
        // Anything pending between these two parties blocks a new one.
        alreadyInvited: membershipRequests.some(
          (row) =>
            row.teamId === excludeTeamId &&
            row.userId === user.id &&
            row.status === 'pending'
        ),
      }))

    await delay(400)
    return HttpResponse.json(results)
  }),

  /**
   * GET /api/invites — the invites addressed to ME.
   *
   * Note there is no `?userId=` parameter, and there must not be one: that
   * would let anyone read anyone else's invites by changing a number in the
   * URL. The recipient is the token holder, full stop. (Idor — insecure direct
   * object reference — is one of the most common real-world API bugs, and it
   * is exactly this mistake.)
   *
   * The stored rows are normalised (teamId only); this handler JOINS in the
   * team name, colour and inviter name on the way out, so the inbox can render
   * without a follow-up request per invite.
   */
  http.get('/api/invites', async ({ request }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const mine = membershipRequests
      .filter(
        (row) =>
          row.userId === user.id &&
          row.status === 'pending' &&
          // Only INVITES belong in your inbox. Your own outgoing join requests
          // live in the same table but are not yours to answer — the captain
          // decides those. Forgetting this filter would put a request you
          // created in front of you with an "Accept" button, letting you
          // approve yourself into any team.
          row.kind === 'invite'
      )
      .map((row) => {
        const team = teams.find((t) => t.id === row.teamId)
        const invitedBy = users.find((u) => u.id === row.initiatedById)

        return {
          id: row.id,
          teamId: row.teamId,
          teamName: team?.name ?? 'Unknown team',
          teamColour: team?.colour ?? 'slate',
          invitedByName: invitedBy?.name ?? 'Someone',
          status: row.status,
          createdAt: row.createdAt,
        }
      })
      // Newest first.
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    await delay(400)
    return HttpResponse.json(mine)
  }),

  /**
   * POST /api/teams/:id/invites — captain invites someone.
   *
   * ---- THE 403 PROMISED IN PHASE 3A ----
   *
   * TeamProfilePage.tsx hides the Manage section from non-captains. That is UX
   * only — anyone can delete the condition in devtools, or skip the UI and
   * POST straight here. THIS check is the one that actually decides.
   *
   * 403, not 401: we know exactly who you are, and you specifically are not
   * allowed. 401 means "I don't know who you are" and would wrongly suggest
   * logging in again would help.
   */
  http.post('/api/teams/:id/invites', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const team = teams.find((t) => t.id === params.id)
    if (!team) {
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })
    }

    if (team.captainId !== user.id) {
      return HttpResponse.json(
        { message: 'Only the captain can invite players' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as { userId: string }
    const invitee = users.find((u) => u.id === body.userId)

    if (!invitee) {
      return HttpResponse.json({ message: 'That user does not exist' }, { status: 404 })
    }

    await delay(700)

    if (team.members.some((m) => m.id === invitee.id)) {
      return HttpResponse.json(
        { message: `${invitee.name} is already in the team` },
        { status: 409 }
      )
    }

    if (team.members.length >= team.maxMembers) {
      return HttpResponse.json({ message: 'This squad is full' }, { status: 409 })
    }

    // Again, BOTH kinds. If this player has already asked to join, the captain
    // should approve that request rather than start a parallel invite — two
    // pending rows for one pair is a state with no sensible resolution.
    const duplicate = membershipRequests.some(
      (row) =>
        row.teamId === team.id && row.userId === invitee.id && row.status === 'pending'
    )
    if (duplicate) {
      return HttpResponse.json(
        { message: `${invitee.name} already has something pending with this team` },
        { status: 409 }
      )
    }

    const newInvite = {
      id: `mr${Date.now()}`,
      teamId: team.id,
      userId: invitee.id,
      // The captain started this one, so the PLAYER answers it.
      initiatedById: user.id,
      kind: 'invite' as const,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }

    membershipRequests.push(newInvite)

    return HttpResponse.json(newInvite, { status: 201 })
  }),

  /**
   * POST /api/membership/:id/respond — accept or decline, in either direction.
   *
   * ---- ONE HANDLER, BOTH DIRECTIONS ----
   *
   * This was `/api/invites/:id/respond` and answered invites only. Adding join
   * requests did NOT need a second endpoint, because "resolve this pending
   * membership" is one operation. Only the permission check differs:
   *
   *   invite   → the PLAYER answers    (row.userId === me)
   *   request  → the CAPTAIN answers   (team.captainId === me)
   *
   * One rule covers both: THE PERSON WHO DID NOT START IT APPROVES IT. Every
   * other check below — already answered, squad full, team still exists — is
   * shared, which is exactly why one handler is right. A parallel
   * /api/requests/:id/respond would have meant a second copy of all of it, and
   * a second copy is where a missing check eventually hides.
   *
   * ---- ONE REQUEST, TWO ENTITIES CHANGED ----
   *
   * Accepting mutates the membership row (status → accepted) AND the team (a
   * new member on the roster). That is the client-side consequence from Phase 3b:
   * one mutation, two caches to invalidate.
   */
  http.post('/api/membership/:id/respond', async ({ request, params }) => {
    const user = getUserFromRequest(request)
    if (!user) {
      return HttpResponse.json({ message: 'You need to log in first' }, { status: 401 })
    }

    const row = membershipRequests.find((r) => r.id === params.id)
    if (!row) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const team = teams.find((t) => t.id === row.teamId)
    if (!team) {
      return HttpResponse.json({ message: 'That team no longer exists' }, { status: 404 })
    }

    // THE PERMISSION RULE, both directions in two lines.
    const mayAnswer =
      row.kind === 'invite' ? row.userId === user.id : team.captainId === user.id

    if (!mayAnswer) {
      return HttpResponse.json({ message: 'That is not yours to answer' }, { status: 403 })
    }

    const body = (await request.json()) as { action: 'accept' | 'decline' }

    await delay(800)

    // Already answered. Common in practice: two browser tabs, or a double tap.
    if (row.status !== 'pending') {
      return HttpResponse.json(
        { message: `That was already ${row.status}` },
        { status: 409 }
      )
    }

    if (body.action === 'decline') {
      row.status = 'declined'
      return HttpResponse.json(row)
    }

    // The squad may have filled up while this sat unanswered — the same race
    // as the match-join demo in Phase 2c, arising naturally here rather than
    // being staged.
    if (team.members.length >= team.maxMembers) {
      return HttpResponse.json(
        { message: `${team.name} filled up first` },
        { status: 409 }
      )
    }

    // NOTE: the person joining is `row.userId`, NOT `user.id`. Those are the
    // same person for an invite and DIFFERENT people for a join request, where
    // `user` is the captain doing the approving. Using `user.id` here would
    // put the captain on their own roster twice and never add the applicant —
    // a bug that only shows up in one of the two directions.
    const joiner = users.find((u) => u.id === row.userId)
    if (!joiner) {
      return HttpResponse.json({ message: 'That user no longer exists' }, { status: 404 })
    }

    row.status = 'accepted'
    team.members.push({ id: joiner.id, name: joiner.name })
    team.memberCount = team.members.length

    return HttpResponse.json(row)
  }),
]
