import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Badge } from '../../../shared/components/Badge'
import { Avatar } from '../../../shared/components/Avatar'
import type { Team } from '../types'

interface TeamCardProps {
  team: Team
  /** Marks the card when the logged-in user runs this team. */
  isYourTeam?: boolean
}

/**
 * The `TeamCard` from the component inventory in docs/03-uiux-design-brief.md.
 *
 * Same construction as MatchCard: the whole card is a Link (a bigger tap
 * target than a small "view" button, which matters on a phone), and it knows
 * about our domain — which is why it lives in features/teams/ and not in
 * shared/, while the Avatar and Badge it uses are the other way round.
 */
export function TeamCard({ team, isYourTeam = false }: TeamCardProps) {
  const { wins, losses, draws } = team.record

  return (
    <Link to={`/teams/${team.id}`} className="block">
      <Card interactive className="flex h-full flex-col">
        <div className="flex items-start gap-3">
          <Avatar name={team.name} colour={team.colour} size="md" />

          {/* min-w-0 lets the truncate below actually work inside a flex row —
              the same flexbox gotcha called out in MatchCard.tsx. */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-content">{team.name}</h3>
              {isYourTeam && <Badge variant="success">Your team</Badge>}
            </div>

            <p className="truncate text-meta text-content-muted">{team.location}</p>

            <p className="mt-2 text-label text-content-faint">
              {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
              {' · '}
              {/* W-L-D is how football records are written, and it's compact
                  enough to scan in the "under a second" the design brief asks
                  for. Spelling out "12 wins, 3 losses" would wrap on mobile. */}
              {wins}W {losses}L {draws}D
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
