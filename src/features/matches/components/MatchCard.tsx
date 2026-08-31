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
 * Formats an ISO date string into something human, e.g. "Sat, 6:30 PM".
 *
 * Intl.DateTimeFormat is built into the browser — no date library needed for
 * something this simple. (Reach for date-fns only once you need real date
 * MATH, like "3 days ago" or timezone conversion.)
 *
 * Defined outside the component on purpose: if it were inside, a new copy of
 * this function would be created on every single render, for no benefit.
 */
function formatMatchDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  // "Today, 6:30 PM" reads faster than a date you have to decode — and it's
  // what the reference does. Only worth special-casing the two days people
  // actually care about; beyond that a weekday is clearer than "in 4 days".
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`

  return `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}

export function MatchCard({ match }: MatchCardProps) {
  // DERIVED state: calculated from props during render, NOT stored in useState.
  // Storing this would mean keeping it in sync with playerCount forever — a
  // classic source of bugs. If you can calculate it, calculate it.
  const spotsLeft = match.maxPlayers - match.playerCount
  const isFull = spotsLeft <= 0

  // V1 — see the same derivation in MatchDetailPage.tsx.
  const isCancelled = match.status === 'cancelled'
  const isCompleted = match.status === 'completed'

  return (
    // The whole card is a link — a much bigger tap target than a small "view"
    // button, which matters on the mobile-first design the brief calls for.
    <Link to={`/matches/${match.id}`} className="block">
      <Card interactive className="flex h-full flex-col">
        {/* Row 1: category tag left, when-it-is right — the reference's
            card header. The date sits in the accent colour because "when" is
            the thing people scan a list of matches for. */}
        <div className="flex items-start justify-between gap-3">
          <Badge tag variant="neutral">
            Pickup
          </Badge>
          {/* The reference puts the date in the accent colour. Kept as plain
              light text instead: on a grid of eight cards, eight lime dates is
              exactly the "everything is shouting" problem. It's still the
              brightest thing in the card header because it's `text-content`
              against `text-content-muted` metadata below. */}
          <span className="text-label font-medium text-content">
            {formatMatchDate(match.dateTime)}
          </span>
        </div>

        <h3 className="mt-3 text-title text-content">{match.title}</h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-meta text-content-muted">
          <MapPin size={14} weight="fill" className="shrink-0 text-content-faint" />
          {/* truncate needs min-w-0 to work inside a flex row — a well-known
              flexbox gotcha: flex items refuse to shrink below their content
              width unless you explicitly allow it. */}
          <span className="min-w-0 truncate">{match.location}</span>
        </p>

        <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
          <Badge>{match.format}</Badge>
          <Badge>{match.skillLevel}</Badge>
        </div>

        {/* mt-auto pushes this footer to the bottom of the card, so cards of
            different heights in a grid still line their footers up. */}
        {/* A hairline above the footer separates "what this match is" from
            "how full it is" — the two questions the card answers. Cheaper on
            the eye than another gap, and it makes the footers line up across a
            row of cards even when titles wrap to different heights. */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            {/**
             * V1: what the dots COUNT changes with the lifecycle.
             *
             *   completed  turnout against the roster — "9 of 11 turned up"
             *   otherwise  seats filled against capacity — "8/10"
             *
             * A completed match still showing "14/14" would be answering a
             * question nobody is asking any more: whether you can get in.
             */}
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
                {/* `tabular` = fixed-width digits, so the number doesn't jump
                    around as it changes — which it does, optimistically, the
                    instant someone taps Join. */}
                <span className="tabular text-meta text-content-muted">
                  {match.playerCount}/{match.maxPlayers}
                </span>
              </>
            )}
          </div>

          {/**
           * Semantic colours, not brand colour: green = you can still join,
           * red = you can't. That's information, and information gets the
           * status palette. Lime is reserved for actions.
           *
           * V1 adds two more states to the same slot rather than a second
           * badge beside it. One badge, one answer to "what's the situation
           * with this match" — a card that can show two status pills at once
           * makes the reader work out which of them wins.
           */}
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
