import { Link, useParams } from 'react-router-dom'
import {
  ArrowSquareOut,
  ArrowLeft,
  CheckCircle,
  Clock,
  MapPin,
  Prohibit,
  Quotes,
  type Icon,
} from '@phosphor-icons/react'
import pitchMarkings from '../../../assets/pitch-markings-bg.svg'
import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useMatch } from '../api/useMatch'
import { CancelMatchButton } from './CancelMatchButton'
import { JoinMatchButton } from './JoinMatchButton'
import { SlotDots } from './SlotDots'
import { VenuesNearby } from './VenuesNearby'
import type { Match } from '../types'

/** The three pieces the calendar tile needs, formatted for the user's locale. */
function dateParts(iso: string) {
  const date = new Date(iso)
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }),
    day: date.toLocaleDateString(undefined, { day: 'numeric' }),
    weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
  }
}

/** "6:30 PM" */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "6:30 PM – 7:30 PM". End time is derived from start + duration, never stored. */
function formatTimeRange(iso: string, durationMinutes: number): string {
  const start = new Date(iso)
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return `${formatTime(start)} – ${formatTime(end)}`
}

const formatLabels: Record<Match['format'], string> = {
  '5v5': '5-a-side',
  '7v7': '7-a-side',
  '11v11': '11-a-side',
}

// A lookup rather than a CSS `capitalize`, which uppercases every word and
// would turn the "5-a-side" beside it into "5-A-Side". Also where i18n lands.
const skillLabels: Record<Match['skillLevel'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

/**
 * The calendar tile — the page's visual anchor.
 *
 * Large numerals are the one near-graphic shape a text-only page can produce,
 * so the most decision-relevant fact gets it. It is also the only element using
 * `bg-raised`, since in a dark theme depth comes from lightness.
 *
 * aria-hidden because the <time> element in the row below announces the full
 * date; "Aug 24 Sat" as three loose fragments would be worse.
 */
function DateTile({ iso }: { iso: string }) {
  const { month, day, weekday } = dateParts(iso)

  return (
    <div
      aria-hidden="true"
      className="flex w-[4.5rem] shrink-0 flex-col items-center rounded-card bg-raised px-2 py-3"
    >
      <span className="text-label uppercase text-content-muted">{month}</span>
      <span className="tabular text-display text-content">{day}</span>
      <span className="text-label uppercase text-content-muted">{weekday}</span>
    </div>
  )
}

/**
 * One row of the details list: icon in the gutter, value beside it.
 *
 * The glyph is aria-hidden and paired with an sr-only label — a clock icon
 * means "time" only to someone who can see it, so an icon-only <dt> leaves a
 * screen reader with three unlabelled values.
 */
function Row({
  icon: IconComponent,
  label,
  children,
}: {
  icon: Icon
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      {/* pt-0.5 optically centres an 18px glyph against a 24px first line. */}
      <dt className="shrink-0 pt-0.5">
        {/* text-content, not muted: a thin 18px glyph carries far less ink than a
            word of the same height, so it needs a step MORE contrast to read
            level with the text beside it. */}
        <IconComponent size={18} aria-hidden="true" className="text-content" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

/**
 * One bento tile: a small uppercase caption over its content.
 *
 * The caption is what pays for splitting the old single card up — a free-standing
 * card reading "6:00 PM – 7:00 PM" has no parent to inherit its meaning from.
 *
 * content-muted rather than content-faint: index.css marks faint (4.0:1) as
 * decorative only, and a caption that names the card is information. An h2
 * rather than a styled <p>, so heading navigation can reach it.
 */
function Panel({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex flex-col rounded-card border border-border bg-surface p-5 sm:p-6 ${className}`}
    >
      <h2 className="text-label uppercase text-content-muted">{label}</h2>
      {children}
    </section>
  )
}

/**
 * One cell of the GAME DETAILS strip. The value carries the emphasis, not the
 * label — someone scanning is looking for answers, the questions are obvious.
 *
 * Identical styling across the three cells is honest here: format, skill and
 * duration really are equally weighted attributes of the same fixture. The rule
 * in docs/13 is "don't claim things are equal when they aren't", not "never
 * repeat a cell".
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-meta text-content-muted">{label}</dt>
      <dd className="mt-1 text-heading text-content">{value}</dd>
    </div>
  )
}

/**
 * The full-bleed banner for a match that is cancelled or played.
 *
 * Sits above the title rather than among the small badges: someone arriving
 * from a shared link is here to learn when to turn up, and "don't" outranks
 * everything else on the page.
 *
 * Danger red, not lime — docs/13 splits the palettes by meaning, not volume:
 * lime is for the one action you can take, semantic colours are for
 * information. The word carries the signal; the colour and glyph only
 * reinforce it, since neither survives colour blindness or an unfamiliar icon.
 */
function ClosedBanner({ match }: { match: Match }) {
  const isCancelled = match.status === 'cancelled'

  const turnout = match.attendance?.length ?? 0

  return (
    <div
      className={`flex items-start gap-3 rounded-card border px-5 py-3.5 sm:px-6 ${
        isCancelled
          ? 'border-danger/30 bg-danger-surface text-danger'
          : 'border-info/30 bg-info-surface text-info'
      }`}
    >
      <span className="shrink-0 pt-0.5">
        {isCancelled ? (
          <Prohibit size={18} weight="fill" aria-hidden="true" />
        ) : (
          <CheckCircle size={18} weight="fill" aria-hidden="true" />
        )}
      </span>

      <p className="text-meta">
        <span className="font-medium">
          {isCancelled ? 'This match was cancelled' : 'This match has been played'}
        </span>
        <span className="opacity-80">
          {isCancelled
            ? ' — the host called it off.'
            : ` — ${turnout} ${turnout === 1 ? 'player' : 'players'} turned up.`}
        </span>
      </p>
    </div>
  )
}

/**
 * Loading placeholder. Keep its grid in step with the real layout below — a
 * skeleton only beats a spinner if nothing jumps when the data lands.
 */
function MatchDetailSkeleton() {
  return (
    // aria-busy on the container so a screen reader hears "busy" once.
    <div aria-busy="true" className="flex flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-4 w-28" />

      {/* Hero */}
      <div className="flex gap-4 rounded-card border border-border bg-surface p-5 sm:gap-5 sm:p-6">
        <Skeleton className="h-[5.5rem] w-[4.5rem] shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-9 w-3/4" />
          <Skeleton className="mt-3 h-5 w-44" />
        </div>
      </div>

      {/* Mirroring the real grid matters more than the exact bar widths. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-5 w-44" />
          <Skeleton className="mt-4 h-5 w-40" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-8 w-24" />
          </div>
          <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * /matches/:id — the match detail screen.
 *
 * Laid out as a bento of differently-weighted tiles rather than a grid of equal
 * cards, because equal styling asserts equal importance: the hero spans the full
 * width because the title is what the page is about, WHEN & WHERE gets a full
 * column because it carries the decision, and SQUAD and GAME DETAILS share the
 * other column as supporting facts.
 *
 * The roster is deliberately absent. The decision made here is "do I want this
 * game?", which eighteen unfamiliar names do not help with — the count does, and
 * that is the SQUAD tile. PlayerList.tsx is unused but kept, since a "who's
 * playing" view is a reasonable thing to bring back.
 */
export function MatchDetailPage() {
  const { id = '' } = useParams()
  const { data: match, isPending, isError, error, refetch } = useMatch(id)

  if (isPending) return <MatchDetailSkeleton />

  if (isError) {
    const notFound = error.message.includes('does not exist')

    return (
      <div className="p-4 lg:p-6">
        <EmptyState
          title={notFound ? 'Match not found' : "Couldn't load this match"}
          description={
            notFound
              ? 'It may have been cancelled, or the link is wrong.'
              : 'Something went wrong on our end.'
          }
          action={
            notFound ? (
              <Link to="/">
                <Button variant="secondary">Back to matches</Button>
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            )
          }
        />
      </div>
    )
  }

  const spotsLeft = match.maxPlayers - match.playerCount
  const isFull = spotsLeft <= 0

  // `!== 'scheduled'` rather than naming the two terminal values: a fourth
  // status is far likelier to be another way of being over than another way of
  // being open. Named once so the four readers below cannot drift apart.
  const isOver = match.status !== 'scheduled'

  // A plain search link — no API key, no map SDK, no bundle cost.
  // encodeURIComponent matters: an unescaped "&" in a venue name would end the
  // query parameter early.
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    match.location
  )}`

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-meta text-content-muted hover:text-content"
      >
        <ArrowLeft size={16} />
        All matches
      </Link>

      {/* No `items-start` here on purpose: grid items stretch to the row height
          by default, which is what the sticky sidebar needs. Shrinking the
          <aside> to its contents would leave the card nowhere to travel and it
          would silently never stick. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
        {/* gap-4 between tiles rather than the page's gap-5: tiles inside one
            composition should sit closer to each other than the composition
            sits to what surrounds it, or the bento reads as four unrelated
            cards that happen to be adjacent. */}
        <div className="flex flex-col gap-4">
          {isOver && <ClosedBanner match={match} />}

          {/* Title and host only — the date tile belongs with the time, down in
              WHEN & WHERE, rather than split across two cards for the reader to
              reassemble.

              overflow-hidden is what clips the pitch texture to the radius. */}
          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-5 sm:p-6">
            {/* A crop of pitch markings, not venue-placeholder.svg scaled up: that
                asset draws a WHOLE pitch, which at full bleed reads as a picture
                of something the eye tries to decode. Every line here runs off an
                edge, so it stays texture.

                A background rather than an <img> so bg-cover handles any card
                shape with no aspect-ratio maths and it stays out of the
                accessibility tree. Inline style because Vite hashes the filename.

                Opacity is 0.15, not the 0.14 first guessed from "large area
                needs less": this is 2.6px strokes on an empty field, and
                perceived presence follows ink on the surface, not box size. At
                0.14 it was invisible at 3x zoom. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.15]"
              style={{ backgroundImage: `url(${pitchMarkings})` }}
            />

            {/* `relative` with no z-index is enough to lift this above the
                absolute background — positioned elements paint after
                non-positioned siblings, in DOM order. */}
            <div className="relative">
              {/* 36px only from sm up: a three-word title at 36px on a 375px
                  screen wraps to three lines and stops being a title. */}
              <h1 className="text-display text-content sm:text-hero">{match.title}</h1>

              <p className="mt-2 text-meta text-content-muted">
                Hosted by <span className="font-medium text-content">{match.creatorName}</span>
              </p>
            </div>
          </div>

          {/* sm, not lg: at 640px there is already room for two columns inside
              this one, and a tablet showing four stacked full-width tiles is
              just the old single card with gaps in it.

              The default stretch is load-bearing — the left tile grows to match
              the two stacked on the right, which is what makes the row read as
              one composition. */}
          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              {/* Everything needed in order to physically turn up, in one tile —
                  splitting date from venue would claim they answer different
                  questions. */}
              <Panel label="When & where">
                <div className="mt-4 flex gap-4">
                  <DateTile iso={match.dateTime} />

                  <dl className="flex min-w-0 flex-1 flex-col gap-4">
                    <Row icon={Clock} label="Time">
                      {/* The accessible source for the date, since DateTile is
                          aria-hidden. */}
                      <time dateTime={match.dateTime} className="tabular text-body text-content">
                        {formatTimeRange(match.dateTime, match.durationMinutes)}
                      </time>
                    </Row>

                    <Row icon={MapPin} label="Venue">
                      <p className="text-body text-content">{match.location}</p>

                      {/* Inside the venue row, because it belongs to the venue
                          rather than being an action on the card — parked at the
                          bottom next to Join it read as a competing action.

                          A text link, not an outlined button: a border would put
                          it in the same class as Join, the only pressable thing
                          in this tile. */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        // Without noreferrer the opened page gets a handle on
                        // this one via window.opener. Modern browsers imply it,
                        // older ones do not.
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 text-meta text-content-muted transition-colors hover:text-primary"
                      >
                        Show in map
                        <ArrowSquareOut size={14} aria-hidden="true" />
                      </a>
                    </Row>
                  </dl>
                </div>

                {/* Join lives at the end of the "when and where do I turn up"
                    sentence rather than detached in a page-wide bar, and mt-auto
                    fills the slack this stretch-grid tile always had.

                    Full width comes from the column flex container stretching
                    its children, not from `w-full` inside JoinMatchButton where
                    it would decide the width for every caller. This also covers
                    the "Log in to join" branch, which is an <a> and would
                    otherwise size differently. */}
                <div className="mt-auto flex flex-col pt-5">
                  {/* Hidden, not disabled: disabled means "not right now" and
                      invites people to work out what would re-enable it.
                      Nothing will. */}
                  {!isOver && <JoinMatchButton match={match} />}
                </div>
              </Panel>

            {/* The inner wrapper is flex-1 justify-center so the lone number
                centres in the height this tile borrows from the two beside it,
                while the caption stays pinned to the top doing its naming job. */}
            <Panel label="Squad">
                {/* This tile answers a different question per lifecycle state:
                    scheduled "can I still get in?", completed "who played?",
                    cancelled "how many were affected?" — and no spots badge,
                    since there is nothing to join. Leaving "2 spots left" on a
                    finished match is exactly the bug the status field exists to
                    fix. */}
              <div className="flex flex-1 flex-col justify-center py-4">
                {match.status === 'completed' ? (
                  <>
                    <p className="tabular text-hero text-content">
                      {match.attendance?.length ?? 0}
                      <span className="text-heading text-content-muted">
                        {' '}
                        of {match.playerCount}
                      </span>
                    </p>
                    <p className="mt-1 text-meta text-content-muted">turned up</p>
                    {/* Dots mean turnout against the roster here, not seats
                        against capacity. */}
                    <div className="mt-4">
                      <SlotDots
                        filled={match.attendance?.length ?? 0}
                        total={match.playerCount}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* `tabular` stops the number shifting sideways when an
                        optimistic join changes it — very visible at 36px.

                        Capacity is a step down in size and contrast: "8" is the
                        answer, "/ 10" is the context. */}
                    <p className="tabular text-hero text-content">
                      {match.playerCount}
                      <span className="text-heading text-content-muted">
                        {' '}
                        / {match.maxPlayers}
                      </span>
                    </p>

                    <div className="mt-4">
                      <SlotDots filled={match.playerCount} total={match.maxPlayers} />
                    </div>

                    {/* Semantic palette, not brand: this is information, and lime
                        stays on the one action. */}
                    {!isOver && (
                      <div className="mt-4 self-start">
                        <Badge variant={isFull ? 'danger' : 'success'}>
                          {isFull
                            ? 'Match full'
                            : `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`}
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Panel>
          </div>

          {/* Full width, not stacked against another tile. Both stacked
              arrangements produced a void: grid items stretch to the row height,
              so pairing one tile against a column of two forces it to grow by
              roughly 250px of empty card. Three short label/value pairs across a
              wide strip look composed; the same three stretched down a half-width
              column look abandoned.

              These are the format/skill badges that used to sit under the title —
              facts about the fixture, not decoration on the heading. */}
          <Panel label="Game details">
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Format" value={formatLabels[match.format]} />
              <Stat label="Skill level" value={skillLabels[match.skillLevel]} />
              <Stat label="Duration" value={`${match.durationMinutes} min`} />
            </dl>
          </Panel>

          {match.notes && (
            /**
             * A lime tint, which docs/13 allows for anything that is not the one
             * solid action. It earns it by being the only thing on the page
             * written by a person rather than generated from the record.
             *
             * figure/blockquote/figcaption because this is a quotation with an
             * attribution — a styled <p> pair would not carry that to a screen
             * reader.
             */
            <div className="flex gap-4 rounded-card border border-primary/20 bg-primary/5 p-5 sm:p-6">
              <Quotes
                size={20}
                weight="fill"
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-primary"
              />
              <figure className="min-w-0">
                <blockquote className="text-body text-content">{match.notes}</blockquote>
                <figcaption className="mt-2 text-meta text-content-muted">
                  {/* not-italic: <cite> defaults to italic, which fights Inter at
                      this size. The element is here for meaning, not styling. */}
                  — <cite className="not-italic">{match.creatorName}</cite>
                </figcaption>
              </figure>
            </div>
          )}

          {/* Deliberately far from Join and deliberately quiet: a destructive
              action separated from the primary one cannot be hit by muscle
              memory aimed at the button beside it.

              CancelMatchButton renders nothing unless you are the host, so the
              permission rule sits in one file next to the mutation that asks the
              server the same question. */}
          {!isOver && (
            <div className="mt-1 flex self-start">
              <CancelMatchButton match={match} />
            </div>
          )}
        </div>

        <aside>
          {/* top-6 matches the page's lg:p-6 so the card parks level with the
              content padding rather than the viewport edge. */}
          <div className="lg:sticky lg:top-6">
            <VenuesNearby currentLocation={match.location} />
          </div>
        </aside>
      </div>
    </div>
  )
}
