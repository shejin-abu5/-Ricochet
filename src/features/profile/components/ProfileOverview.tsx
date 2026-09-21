import { Avatar } from '../../../shared/components/Avatar'
import { positionLabels, type PlayerProfile } from '../types'

interface ProfileOverviewProps {
  profile: PlayerProfile
}

/** "Member since March 2026". */
function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * Who you are. Presentational only, so a future "someone else's profile" screen
 * can reuse it untouched.
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
            <dd className="text-content">{positionLabels[profile.position]}</dd>
          </div>

          <div className="flex gap-2">
            <dt className="text-content-muted">Based in</dt>
            {/* New accounts have no location until onboarding exists; an empty
                gap here looks broken. */}
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
