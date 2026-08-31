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
 * Section 2: how you play.
 *
 * NOTE ON STYLING: the attributes are plain "4 / 5" text rather than bars,
 * dots, or any chart. Functionality first; the visual pass happens once the
 * features are done (docs/03-uiux-design-brief.md, and the note in docs/11).
 * Everything here is real data in the right shape, so that pass is a styling
 * job and not a rewrite.
 */
export function SkillsCard({ profile }: SkillsCardProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Badge>{positionLabels[profile.position]}</Badge>
        {/* skillLevel is the SAME union a match uses for its required level —
            one scale, one definition, so the two are comparable. See the note
            at the top of features/profile/types.ts. */}
        <Badge>{profile.skillLevel}</Badge>
        <Badge>{footLabels[profile.preferredFoot]}</Badge>
      </div>

      <dl className="mt-4 flex flex-col gap-1 text-meta">
        {/* Iterating a fixed ORDER array rather than Object.keys(attributes).
            Object key order comes from however the server serialised the JSON;
            a stats list that reshuffles between renders is disorienting, and
            it's the kind of bug that only shows up after a backend change. */}
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
