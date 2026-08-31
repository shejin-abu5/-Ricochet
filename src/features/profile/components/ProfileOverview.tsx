import { Avatar } from '../../../shared/components/Avatar'
import { positionLabels, type PlayerProfile } from '../types'

interface ProfileOverviewProps {
  profile: PlayerProfile
}

/**
 * "Member since March 2026".
 *
 * Intl.DateTimeFormat again — no date library needed for formatting. Outside
 * the component so it isn't rebuilt each render.
 */
function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * Section 1 of the profile card: who you are.
 *
 * Presentational only — takes a profile, renders it, fetches nothing. Same
 * split as MatchList and RosterList, and the reason a future "someone else's
 * profile" screen can reuse this untouched.
 *
 * NOTE ON STYLING: plain and minimal on purpose. The visual pass comes once
 * the functionality is finished — see docs/11 and the design brief.
 */
export function ProfileOverview({ profile }: ProfileOverviewProps) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name={profile.name} size="lg" />

      <div className="min-w-0">
        <h2 className="truncate font-medium text-content">{profile.name}</h2>
        <p className="truncate text-meta text-content-muted">{profile.email}</p>

        <dl className="mt-3 flex flex-col gap-1 text-meta">
          <div className="flex gap-2">
            <dt className="text-content-muted">Position</dt>
            {/* The stored value is terse ('MID'); only the UI spells it out.
                Storing "Midfielder" would mean re-typing the label everywhere
                it's compared, and make translating it later much harder. */}
            <dd className="text-content">{positionLabels[profile.position]}</dd>
          </div>

          <div className="flex gap-2">
            <dt className="text-content-muted">Based in</dt>
            {/* New accounts have no location until onboarding exists, so this
                says so rather than rendering an empty gap that looks broken. */}
            <dd className="text-content">{profile.location || 'Not set'}</dd>
          </div>

          <div className="flex gap-2">
            <dt className="text-content-muted">Member since</dt>
            <dd className="text-content">
              <time dateTime={profile.joinedAt}>{memberSince(profile.joinedAt)}</time>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
