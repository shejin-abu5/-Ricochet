import { Badge } from '../../../shared/components/Badge'
import {
  attributeOrder,
  footLabels,
  positionLabels,
  type PlayerProfile,
} from '../types'

interface SkillsCardProps {
  profile: PlayerProfile
}

/**
 * How you play.
 *
 * Attributes render as plain "4 / 5" text rather than bars or a chart — the
 * data is in the right shape, so the visual pass (docs/03) is styling and not
 * a rewrite.
 */
export function SkillsCard({ profile }: SkillsCardProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Badge>{positionLabels[profile.position]}</Badge>
        <Badge>{profile.skillLevel}</Badge>
        <Badge>{footLabels[profile.preferredFoot]}</Badge>
      </div>

      <dl className="mt-4 flex flex-col gap-1 text-meta">
        {/* A fixed order array, not Object.keys — see attributeOrder in
            ../types.ts. */}
        {attributeOrder.map(({ key, label }) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="text-content-muted">{label}</dt>
            <dd className="text-content">{profile.attributes[key]} / 5</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-label text-content-faint">
        Self-rated. Editing your profile arrives with the onboarding screen &mdash;
        docs/02-app-flow.md flow 1.
      </p>
    </div>
  )
}
