import { Link } from 'react-router-dom'
import { MapPin } from '@phosphor-icons/react'
import { Card } from '../../../shared/components/Card'
import { Badge } from '../../../shared/components/Badge'
import { SlotDots } from './SlotDots'
import type { Match } from '../types'

interface MatchCardProps {
  match: Match
}

/**
 * Formats an ISO timestamp for a card header, e.g. "Today, 6:30 PM".
 *
 * Only today and tomorrow are special-cased — past that, a weekday reads more
 * clearly than "in 4 days". Intl covers this; a date library is only warranted
 * once real date math is needed.
 */
function formatMatchDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  if (date.toDateString() === today.toDateString()) return `Today, ${time}`
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`

  return `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}

export function MatchCard({ match }: MatchCardProps) {
  const spotsLeft = match.maxPlayers - match.playerCount
  const isFull = spotsLeft <= 0
  const isCancelled = match.status === 'cancelled'
  const isCompleted = match.status === 'completed'

  return (
    // The whole card is the link rather than a "view" button, for a tap target
    // that works on the mobile-first layout in docs/03.
    <Link to={`/matches/${match.id}`} className="block">
      <Card interactive className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <Badge tag variant="neutral">
            Pickup
          </Badge>
          {/* The reference puts the date in lime. Kept plain: eight lime dates
              in a grid is the "everything is shouting" problem. It still leads
              the header as text-content against muted metadata below. */}
          <span className="text-label font-medium text-content">
            {formatMatchDate(match.dateTime)}
          </span>
        </div>

        <h3 className="mt-3 text-title text-content">{match.title}</h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-meta text-content-muted">
          <MapPin size={14} weight="fill" className="shrink-0 text-content-faint" />
          {/* min-w-0 is required for truncate inside a flex row — flex items
              won't shrink below their content width without it. */}
          <span className="min-w-0 truncate">{match.location}</span>
        </p>

        <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
          <Badge>{match.format}</Badge>
          <Badge>{match.skillLevel}</Badge>
        </div>

        {/* mt-auto plus the hairline keeps footers aligned across a row of
            cards whose titles wrap to different heights. */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            {/* A completed match counts turnout against the roster, not seats
                against capacity — "can I get in" is no longer the question. */}
            {isCompleted ? (
              <>
                <SlotDots
                  filled={match.attendance?.length ?? 0}
                  total={match.playerCount}
                />
                <span className="tabular text-meta text-content-muted">
                  {match.attendance?.length ?? 0} of {match.playerCount} played
                </span>
              </>
            ) : (
              <>
                <SlotDots filled={match.playerCount} total={match.maxPlayers} />
                {/* `tabular` stops the count shifting width when an optimistic
                    join changes it under the cursor. */}
                <span className="tabular text-meta text-content-muted">
                  {match.playerCount}/{match.maxPlayers}
                </span>
              </>
            )}
          </div>

          {/* One badge covers all four states rather than stacking pills:
              two status pills at once makes the reader decide which wins.
              Semantic colours, not brand — lime is reserved for actions. */}
          {isCancelled ? (
            <Badge variant="danger">Cancelled</Badge>
          ) : isCompleted ? (
            <Badge variant="info">Played</Badge>
          ) : (
            <Badge variant={isFull ? 'danger' : 'success'}>
              {isFull ? 'Full' : `${spotsLeft} left`}
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  )
}
