import { Avatar } from '../../../shared/components/Avatar'
import { Badge } from '../../../shared/components/Badge'
import { isTeamFull, type Team } from '../types'

interface RosterListProps {
  team: Team
  /** Id of the logged-in user, so their own row can be marked. */
  currentUserId?: string
}

/**
 * The team roster.
 *
 * Takes the WHOLE team rather than just `team.members`, which looks like it
 * breaks the "pass the smallest thing" rule PlayerList follows. It doesn't —
 * this component needs `captainId` as well, and passing
 * `members={...} captainId={...}` as two props invites a caller to pass a
 * roster from one team and a captainId from another.
 *
 * PASS THINGS THAT BELONG TOGETHER, TOGETHER. Splitting a coherent object into
 * loose props creates combinations that should be impossible.
 */
export function RosterList({ team, currentUserId }: RosterListProps) {
  const full = isTeamFull(team)
  // Math.max(0, …) guards against a negative count if the server ever reports
  // more members than the cap (an old team from before the cap was lowered,
  // say). Array.from({ length: -3 }) doesn't throw — it silently gives you an
  // empty array, so this bug would just be missing UI with no error anywhere.
  const openSpots = Math.max(0, team.maxMembers - team.members.length)

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-meta font-medium text-content">
          Roster{' '}
          <span className="font-normal text-content-muted">
            {team.members.length} / {team.maxMembers}
          </span>
        </h2>

        {/* Status in one glance, per the "readable in under a second" rule in
            docs/03-uiux-design-brief.md. */}
        <Badge variant={full ? 'danger' : 'success'}>
          {full ? 'Squad full' : `${openSpots} open`}
        </Badge>
      </div>

      {full && (
        <p className="mt-2 rounded-control bg-raised px-3 py-2 text-meta text-content-muted">
          This squad has all {team.maxMembers} members. Nobody else can join
          until someone leaves.
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {/**
         * Sorting a COPY with [...team.members]. `.sort()` mutates the array it
         * is called on — and this array lives in the TanStack Query cache, so
         * sorting it in place would silently reorder cached server data for
         * every other component reading it.
         *
         * This is the same immutability rule as the optimistic update in
         * Phase 2c, showing up somewhere much less obvious. `.sort()`,
         * `.reverse()` and `.splice()` all mutate; `.map()`, `.filter()` and
         * `.slice()` all return new arrays. Worth memorising which is which.
         */}
        {[...team.members]
          .sort((a, b) => {
            // Captain first, everyone else in their existing order.
            if (a.id === team.captainId) return -1
            if (b.id === team.captainId) return 1
            return 0
          })
          .map((member) => {
            // Both derived from data already on screen. Nothing stored, so
            // nothing can fall out of sync.
            const memberIsCaptain = member.id === team.captainId
            const isYou = member.id === currentUserId

            return (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar name={member.name} colour={memberIsCaptain ? team.colour : 'slate'} />

                <span className="truncate text-meta text-content">{member.name}</span>

                {memberIsCaptain && <Badge variant="warning">Captain</Badge>}
                {isYou && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label font-medium text-primary">
                    You
                  </span>
                )}
              </li>
            )
          })}

        {/* Open spots, drawn as dashed circles — the same device PlayerList
            uses for a match. Seeing the shape of what's missing reads faster
            than the number alone: you can tell at a glance whether this squad
            needs one more player or eight. */}
        {Array.from({ length: openSpots }).map((_, i) => (
          <li key={`open-${i}`} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-8 w-8 shrink-0 rounded-full border border-dashed border-border-strong"
            />
            <span className="text-meta text-content-faint">Open spot</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
