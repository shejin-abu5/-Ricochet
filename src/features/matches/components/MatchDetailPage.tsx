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

/**
 * "6:30 PM – 7:30 PM"
 *
 * The end time is DERIVED from start + durationMinutes rather than stored.
 * Storing both would let them contradict each other the first time someone
 * edits a start time and forgets the end — the same "if you can calculate it,
 * calculate it" rule as playerCount and spotsLeft.
 */
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

/**
 * Skill levels, written out for display.
 *
 * A lookup rather than a `capitalize` utility class, because CSS capitalize
 * uppercases the first letter of EVERY word — which turns the perfectly good
 * "5-a-side" beside it into "5-A-Side". Presentation-layer text transforms
 * don't know what a word is; a lookup does, and it's also where a translation
 * would eventually go.
 */
const skillLabels: Record<Match['skillLevel'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

/**
 * The calendar tile — the page's visual anchor.
 *
 * ---- WHY THIS EXISTS ----
 *
 * The previous version of this page was, correctly, called flat. Part of the
 * reason was that every single element on it was a line of text at 14–28px in
 * one of two greys, so nothing could win. Large numerals are the one shape a
 * text-only page can produce that reads almost as a graphic, and putting the
 * most decision-relevant fact — when is this? — into that shape gives the eye
 * somewhere to land first.
 *
 * It is also the only thing on the page using `bg-raised`. index.css defines a
 * four-step elevation scale and this page was using two steps of it; in a dark
 * theme depth comes from LIGHTNESS, so an unused lightness scale is literally
 * unused depth.
 *
 * aria-hidden because the full, unambiguous date is announced by the <time>
 * element in the TIME row below. A screen reader hearing "Aug 24 Sat" as three
 * loose fragments would be worse, not better.
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
 * One row in the details list: an icon in the gutter, the value beside it.
 *
 * ---- THE ACCESSIBILITY CATCH WITH ICON-ONLY LABELS ----
 *
 * A clock glyph means "time" to someone who can see it and NOTHING to someone
 * who can't — an icon-only <dt> leaves a screen reader reading three values
 * with no idea what any of them is. So each row carries both: the glyph is
 * aria-hidden (it's decoration once the word exists), and an `sr-only` label
 * sits next to it, invisible on screen but present in the accessibility tree.
 *
 * That's the general rule for every icon-only control in a UI — a bare icon
 * button, a close X, a hamburger. Visible to one audience is not "labelled".
 *
 * ---- WHY THIS BEATS THE TEXT LABEL COLUMN IT REPLACED ----
 *
 * The labels used to be a 6rem column, which pushed every value a long way in
 * and needed an `sm:` branch to stack on phones. An icon gutter is ~30px, the
 * values start where the eye already is, and the row is identical at every
 * width — one layout instead of two.
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
      {/* pt-0.5 optically centres an 18px glyph against a 24px first line of
          text. Without it the icon sits fractionally high and every row looks
          very slightly off, in a way that's hard to name but easy to see. */}
      <dt className="shrink-0 pt-0.5">
        {/* `text-content`, not `text-content-muted`. An 18px glyph is mostly
            thin strokes — far less ink than a word of the same height — so at
            the muted grey it reads dimmer than text at the identical colour
            would. Matching the value's colour is what makes it look level with
            it. This is why icons often need a step more contrast than the text
            they sit beside, rather than the step less you'd expect. */}
        <IconComponent size={18} aria-hidden="true" className="text-content" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

/**
 * ============================================================
 *  ONE TILE OF THE BENTO
 * ============================================================
 *
 * A card with a small uppercase caption at the top, straight from
 * docs/SS/matchCardDetail.png (TODAY'S PLAN / CALORIES / MONTH PROGRESS).
 *
 * ---- WHY THE CAPTION EARNS ITS ROW OF SPACE ----
 *
 * When the whole match lived in ONE card, hairline dividers were enough to say
 * "a new kind of fact starts here" — everything below a line obviously still
 * belonged to the thing above it. Separate cards break that: a floating card
 * with "6:00 PM – 7:00 PM" in it has to announce what it is, because there's
 * no longer a parent to inherit meaning from.
 *
 * So the captions aren't decoration copied from the reference. They're what
 * pays for splitting the card up in the first place.
 *
 * ---- content-muted, NOT content-faint ----
 *
 * The obvious token for a small grey caption is content-faint (#6b7280), and
 * index.css is explicit that it measures 4.0:1 and is "decorative ONLY — never
 * body text". A caption that names the card is INFORMATION, not decoration —
 * remove it and you can't tell what the numbers mean. So it gets
 * content-muted (7.6:1).
 *
 * `h2` rather than a styled <p>: these are real section headings now, and a
 * screen reader user navigating by heading should be able to jump between
 * them. Small text is not the same thing as unimportant text.
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
 * One cell of the GAME DETAILS strip: a quiet label with its answer under it.
 *
 * The VALUE carries the emphasis, not the label. Someone scanning this strip
 * is looking for the answers; the questions are already obvious. Bolding both
 * would mean neither wins.
 *
 * ---- WHY THREE IDENTICAL CELLS ARE ALLOWED HERE ----
 *
 * docs/13 records "three identical cells asserted three equal facts" as one of
 * the causes of the old flat page — equal styling ENCODES equal importance,
 * and when/where/squad are not equally important.
 *
 * Format, skill level and duration genuinely are. They're three attributes of
 * the same fixture, and none of them outranks the others. So the identical
 * treatment is honest here rather than lazy. The rule was never "don't repeat
 * a cell"; it was "don't claim things are equal when they aren't".
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
 * ============================================================
 *  V1 — THE BANNER FOR A MATCH THAT IS OVER
 * ============================================================
 *
 * A cancelled match has to be unmissable. Someone arriving from a shared link
 * is here to find out when and where to turn up, and the single most important
 * thing this page can tell them is that they shouldn't. So it goes ABOVE the
 * title, full-bleed, in the status colour — not into the row of small badges
 * beside the format, where it would be one pill among three.
 *
 * ---- WHY NOT LIME ----
 *
 * "Cancelled" is the loudest thing on the page, and the brand colour is the
 * loudest colour we have, so the two look like they belong together. They
 * don't. docs/13 draws the line by MEANING, not by volume: lime is for the one
 * action you can take, and the semantic palette is for information. This is
 * information. Spend danger-red on it and lime stays worth something.
 *
 * ---- WHY THE ICON ISN'T DOING THE WORK ----
 *
 * Colour and glyph both say "stopped", and both fail for someone who can't
 * distinguish red or doesn't recognise the symbol. The WORD is the signal; the
 * other two are reinforcement. Hence aria-hidden on the icon and a real
 * sentence in the text — the `color-not-only` rule again.
 */
function ClosedBanner({ match }: { match: Match }) {
  const isCancelled = match.status === 'cancelled'

  const turnout = match.attendance?.length ?? 0

  return (
    // rounded-card and a border now, because this is a free-standing tile
    // rather than a strip clipped inside a bigger card's overflow-hidden.
    <div
      className={`flex items-start gap-3 rounded-card border px-5 py-3.5 sm:px-6 ${
        isCancelled
          ? 'border-danger/30 bg-danger-surface text-danger'
          : 'border-info/30 bg-info-surface text-info'
      }`}
    >
      {/* pt-0.5 optically centres the glyph against the first line of text —
          the same half-step DetailRow uses below. */}
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
        {/* The second sentence in the same colour but not bold: it's the
            detail, and it shouldn't compete with the headline it explains. */}
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
 * The loading placeholder, shaped like the real card.
 *
 * Worth keeping in step with the layout below it: the whole point of a skeleton
 * over a spinner is that the page doesn't jump when real data lands, and it
 * only doesn't jump if the placeholder occupies roughly the right space.
 */
function MatchDetailSkeleton() {
  return (
    // aria-busy on the container, aria-hidden on each Skeleton (it sets that
    // itself). A screen reader hears "busy" once instead of a stream of boxes.
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

      {/* The two-up row. Mirroring the real grid matters more here than the
          exact bar widths — the point of a skeleton over a spinner is that
          nothing JUMPS when the data lands, and jumping is a layout property. */}
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
 * ============================================================
 *  ONE CARD, AND WHY THE HIERARCHY IS BUILT THE WAY IT IS
 * ============================================================
 *
 * Two earlier attempts failed in instructive ways.
 *
 * The first was a transcription of docs/SS/matchCard.png — ribbon tab, boxed
 * title, icon-led 2x2 details grid. It worked, but it was somebody else's page.
 *
 * The second scattered the content across a title on the bare canvas, a
 * separate strip card, a loose pull-quote and a sidebar. It was correctly
 * called flat, and the diagnosis was measurable rather than a matter of taste:
 * the type scale topped out at 1.75x the body size, only two of the four
 * elevation steps were in use, three equally-styled cells asserted that three
 * facts mattered equally, and two greys did all the work.
 *
 * So: ONE card holding the whole match, and hierarchy built from four levers
 * that were sitting unused.
 *
 *   SIZE       a new --text-hero step (36px) so the title wins decisively,
 *              instead of stopping at 28px where it merely edged ahead.
 *   DEPTH      the calendar tile on bg-raised — the first use of the elevation
 *              scale on this page. Dark UI gets depth from lightness.
 *   SHAPE      large tabular numerals in that tile; the only near-graphic
 *              element a text-only page can produce.
 *   RANK       label/value rows, so the fields recede and the answers carry.
 *
 * Sections inside the card are separated by full-bleed hairlines rather than by
 * gaps between separate cards. Same visual separation, but it reads as one
 * object with parts — which is what a match is.
 *
 * ---- THE ROSTER IS STILL GONE, ON PURPOSE ----
 *
 * This page used to list every player who had joined. The decision someone
 * makes here is "do I want this game?", and eighteen names they don't recognise
 * doesn't help them make it. The COUNT does, and that's the SQUAD row.
 *
 * (PlayerList.tsx is still in the codebase and unused — left rather than
 * deleted because a "who's playing" view is a reasonable thing to bring back.)
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

  // DERIVED, not stored. Keeping spotsLeft in useState would mean re-syncing it
  // every time playerCount changes, forever — and playerCount changes
  // optimistically the instant someone taps Join.
  const spotsLeft = match.maxPlayers - match.playerCount
  const isFull = spotsLeft <= 0

  /**
   * V1. Note this is `!== 'scheduled'` rather than checking the two terminal
   * values by name. Both readings are correct today; this one stays correct if
   * a fourth status is ever added, because a new status is far more likely to
   * be another way of being over than another way of being open.
   *
   * Naming the derived boolean once, here, rather than repeating the
   * comparison at each of the four places below, is what stops the four
   * drifting apart the day the rule changes.
   */
  const isOver = match.status !== 'scheduled'

  /**
   * A plain Google Maps search link — no API key, no map SDK, no bundle cost,
   * and the same outcome as the reference's "SHOW IN MAP" button.
   *
   * encodeURIComponent matters: venue names contain spaces and ampersands, and
   * an unescaped "&" would end the query parameter early and search for the
   * wrong place.
   */
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

      {/**
       * The match card, plus a sidebar from lg up. Stacked below that — the
       * venues card is useful on a phone too, so it drops underneath rather
       * than being hidden.
       *
       * Note there is NO `items-start` here, and that's deliberate: grid items
       * stretch to the row height by default, which is exactly what the sticky
       * sidebar needs. A sticky element can only travel inside its own parent,
       * so shrinking the <aside> to its contents would leave the card nowhere
       * to go and it would silently never move.
       */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_18rem] lg:gap-6">
        {/**
         * ============================================================
         *  THE BENTO
         * ============================================================
         *
         * This was ONE tall card with hairline-separated sections. It is now
         * several tiles of different sizes, per docs/SS/matchCardDetail.png.
         *
         * ---- WHAT CHANGES WHEN YOU SPLIT A CARD UP ----
         *
         * Hairlines inside one card say "same object, next part" — everything
         * below a line still obviously belongs to the thing above it. Separate
         * cards say "different objects", and that costs you two things you
         * then have to pay back deliberately:
         *
         *   1. Each tile has to NAME itself, because it no longer inherits
         *      meaning from a parent. Hence the uppercase caption on Panel.
         *   2. The grouping becomes an argument. Time and venue in one tile
         *      claims those two facts answer the same question ("where do I
         *      turn up, and when?") — which they do. Splitting them into two
         *      tiles would claim they're independent, which they aren't.
         *
         * ---- WHY THE TILES AREN'T ALL THE SAME SIZE ----
         *
         * A grid of identical cards is the same failure the old page had, just
         * respaced: equal weight asserts equal importance. It isn't equal. The
         * hero spans the full width because the title is what the page is
         * ABOUT; WHEN & WHERE gets a full column because it's the decision;
         * SQUAD and GAME DETAILS share the other column because they're
         * supporting facts.
         *
         * `gap-4` between tiles rather than the page's gap-5: tiles inside one
         * composition should sit closer together than the composition sits to
         * the things around it. Otherwise the bento reads as four unrelated
         * cards that happen to be near each other.
         */}
        <div className="flex flex-col gap-4">
          {/* ---- STATUS, WHEN THERE IS ONE WORTH SHOUTING ---- */}
          {/* Above everything, because someone arriving from a shared link is
              here to find out when to turn up, and "don't" outranks the title. */}
          {isOver && <ClosedBanner match={match} />}

          {/* ---- HERO ---- */}
          {/* Just the title and the host now. The date tile moved down into
              WHEN & WHERE, where it belongs: a tile showing "AUG 27 THU" next
              to a row reading "6:00 PM – 7:00 PM" is one answer to one
              question, and splitting the date from the time across two cards
              was making the reader assemble it themselves. */}
          {/* `relative` anchors the watermark; `overflow-hidden` is what lets it
              bleed past the corner and get clipped by the card's own radius. */}
          <div className="relative overflow-hidden rounded-card border border-border bg-surface p-5 sm:p-6">
            {/**
             * THE PITCH BACKGROUND.
             *
             * A close crop of pitch markings running edge to edge behind the
             * title. Replaces the corner watermark that used to sit here.
             *
             * ---- WHY A SEPARATE ASSET AND NOT THE THUMBNAIL SCALED UP ----
             *
             * venue-placeholder.svg draws a WHOLE pitch in a 48px square. Blown
             * up to a full-bleed background that becomes a small complete pitch
             * floating in a wide box — a picture OF something, which the eye
             * tries to read. pitch-markings-bg.svg is a crop at banner
             * proportions, so every line runs off an edge and it reads as
             * texture instead. Anything the eye can't finish tracing, it stops
             * trying to decode.
             *
             * ---- WHY background-image AND NOT AN <img> ----
             *
             * `bg-cover` crops to fill whatever shape this card ends up, at any
             * viewport, with no aspect-ratio maths here. An <img> would need
             * object-cover plus explicit sizing to do the same job, and would
             * sit in the accessibility tree needing an empty alt to get out of
             * it again. A background is decoration by definition.
             *
             * The url() must be an inline style: Vite hashes the filename at
             * build time, so it's never a string Tailwind can see at compile
             * time. `bg-cover` stays a class because inline styles can't carry
             * a breakpoint, should this ever need one.
             *
             * ---- HOW THE OPACITY WAS PICKED ----
             *
             * Not by taste. The first value tried was 0.14, reasoning that a
             * large area needs less than the small corner watermark it
             * replaced. Screenshotted at 3x zoom, it was completely invisible.
             *
             * The flaw in that reasoning: the watermark's ~0.21 was spread over
             * a solid-ish 200px pitch diagram, whereas this is 2.6px STROKES on
             * an otherwise empty field. Perceived presence follows how much ink
             * is actually on the surface, not the size of the box it's in — and
             * a handful of hairlines is almost no ink at all.
             *
             * 0.28 puts the strokes near #414c0f against the #161616 surface:
             * clearly there as texture, nowhere near competing with a 36px
             * title at #f5f5f5.
             *
             * The SVG's own strokes are at full opacity precisely so this
             * number means what it says — see the note in the file about
             * nested opacities multiplying.
             */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.15]"
              style={{ backgroundImage: `url(${pitchMarkings})` }}
            />

            {/**
             * `relative` with no z-index lifts the text above the absolutely
             * positioned background: positioned elements paint after
             * non-positioned siblings in the same stacking context, in DOM
             * order, and this comes second.
             *
             * No right padding any more. The corner watermark was an object the
             * title had to be kept clear of; a 14% full-bleed texture is not,
             * and reserving 160px of empty space against it would just make the
             * title wrap for no reason.
             */}
            <div className="relative">
              {/* 28px on a phone, 36px from sm up. A three-word title at 36px on
                  a 375px screen wraps to three lines and stops being a title. */}
              <h1 className="text-display text-content sm:text-hero">{match.title}</h1>

              <p className="mt-2 text-meta text-content-muted">
                Hosted by <span className="font-medium text-content">{match.creatorName}</span>
              </p>
            </div>
          </div>

          {/* ---- THE TWO-UP ROW ---- */}
          {/**
           * `sm:grid-cols-2` and not `lg:`. At 640px there is already room for
           * two columns inside this main column, and waiting until 1024 would
           * leave a tablet showing four stacked full-width tiles — which is the
           * one shape a bento should never collapse to, because at that point
           * it's just the old single card with gaps in it.
           *
           * Grid items stretch to the row height by default, and that default
           * is load-bearing here: the left tile grows to match the two stacked
           * on the right, which is what makes the row read as one composition
           * rather than two columns that happen to be adjacent.
           */}
          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              {/* WHEN & WHERE — the grouping asked for: everything you need in
                  order to physically turn up, in one tile. */}
              <Panel label="When & where">
                <div className="mt-4 flex gap-4">
                  <DateTile iso={match.dateTime} />

                  <dl className="flex min-w-0 flex-1 flex-col gap-4">
                    <Row icon={Clock} label="Time">
                      {/* <time> with a machine-readable dateTime: assistive tech
                          gets the exact instant, including the year nothing here
                          prints — and it is the ACCESSIBLE source for the date,
                          since the tile beside it is aria-hidden. */}
                      <time dateTime={match.dateTime} className="tabular text-body text-content">
                        {formatTimeRange(match.dateTime, match.durationMinutes)}
                      </time>
                    </Row>

                    <Row icon={MapPin} label="Venue">
                      <p className="text-body text-content">{match.location}</p>

                      {/**
                       * The map link sits UNDER the venue, inside its row,
                       * because it belongs to the venue — it isn't an action on
                       * the card. Parked at the bottom of the tile next to the
                       * Join button it read as a second, competing action.
                       *
                       * A text link, not an outlined button: a border would put
                       * it in the same visual class as Join, which is the only
                       * thing in this tile that should look pressable. min-h-9
                       * keeps the tap target sane despite the small text.
                       */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        /**
                         * rel="noreferrer" alongside target="_blank" is a
                         * security habit, not a style choice: without it the
                         * opened page gets a handle on this one through
                         * window.opener and can navigate it elsewhere. Modern
                         * browsers imply it; older ones do not.
                         */
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-1.5 text-meta text-content-muted transition-colors hover:text-primary"
                      >
                        Show in map
                        <ArrowSquareOut size={14} aria-hidden="true" />
                      </a>
                    </Row>
                  </dl>
                </div>

                {/**
                 * JOIN — on its own line, at the bottom of the tile.
                 *
                 * It lives here rather than as a full-width bar under the whole
                 * page. This tile already answers "when and where do I turn
                 * up?", so "I'm in" belongs at the end of that sentence rather
                 * than detached from it at the bottom of the screen.
                 *
                 * It also earns the tile its height honestly: this card sits in
                 * a stretch grid opposite SQUAD and always had slack at the
                 * bottom, so `mt-auto` fills that space with something that
                 * deserves to be there instead of a gap.
                 *
                 * ---- HOW IT GETS TO BE FULL WIDTH ----
                 *
                 * `flex flex-col` and nothing else. A column flex container
                 * stretches its children across the cross axis by default, so
                 * the button fills the tile without `w-full` being stamped on
                 * it — and, more importantly, without `w-full` going back
                 * inside JoinMatchButton, where it would once again decide the
                 * width for every caller everywhere.
                 *
                 * This is exactly the case that removing it made possible: the
                 * component says WHAT the button is, the container says HOW BIG.
                 * Note the earlier `items-start` had to go — that's the property
                 * that was suppressing the default stretch.
                 *
                 * Doing it on the wrapper also covers all five branches at once,
                 * including "Log in to join", which is an <a> rather than a
                 * <button> and would otherwise size differently.
                 */}
                <div className="mt-auto flex flex-col pt-5">
                  {/* Hidden once the match is over. Not disabled — DISABLED
                      means "not right now", which invites people to work out
                      what would re-enable it. Nothing will; the banner at the
                      top of the page has already explained why. */}
                  {!isOver && <JoinMatchButton match={match} />}
                </div>
              </Panel>

            {/**
             * SQUAD — the tall tile, and the page's second big-number moment
             * after the date.
             *
             * The inner wrapper is `flex-1 justify-center`, not just top-packed
             * content: this tile stretches to the full height of the two beside
             * it, and a lone number centred in that space reads as a stat block
             * on purpose. The caption stays pinned at the top, because a
             * floating caption would lose its job of naming the tile.
             */}
            <Panel label="Squad">
                {/**
                 * V1: this tile answers a DIFFERENT question depending on where
                 * the match is in its lifecycle:
                 *
                 *   scheduled  "can I still get in?"      → spots left
                 *   completed  "who actually played?"     → turnout
                 *   cancelled  "how many were affected?"  → roster size, and no
                 *              spots badge, because there is nothing to join
                 *
                 * Keeping "2 spots left" on a finished match would be the exact
                 * bug V1 exists to fix, just moved to a new card.
                 */}
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
                    {/* Dots now mean turnout against the roster, not seats filled
                        against capacity — same component, honestly re-pointed. */}
                    <div className="mt-4">
                      <SlotDots
                        filled={match.attendance?.length ?? 0}
                        total={match.playerCount}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* `tabular` = fixed-width digits, so the number doesn't
                        shift sideways as it changes — which it does,
                        optimistically, the instant someone taps Join. At 36px a
                        reflow would be very visible.

                        The capacity is deliberately a step DOWN in size and a
                        step down in contrast: "8" is the answer, "/ 10" is the
                        context. Same size for both would make the reader work
                        out which number they came for. */}
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

                    {/* Semantic colours, not the brand colour: green = you can
                        still join, red = you can't. That's information, and
                        information gets the status palette. Lime stays on the
                        one action. */}
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
            </Panel>ground-placeholder.webp
          </div>

          {/* ---- GAME DETAILS ---- */}
          {/**
           * Full width, as a three-across strip — the reference's bottom
           * "WEEKLY INTENSITY PROFILE" card, which spans everything above it.
           *
           * ---- WHY IT ISN'T STACKED WITH ANOTHER TILE ----
           *
           * It was, twice, and both arrangements produced a void. Grid items
           * stretch to the row height, so pairing ONE tile against a column of
           * TWO means the single tile has to grow to match two tiles plus a
           * gap — roughly 250px of empty card, wherever you put it. Swapping
           * which side got the pair just moved the hole.
           *
           * The fix isn't more stacking, it's fewer rows: two tiles of similar
           * content volume side by side, and the third given the full width it
           * can actually fill. Three short label/value pairs spread across a
           * wide strip look composed; the same three crammed into a half-width
           * column and stretched to 500px look abandoned.
           *
           * These are the format/skill badges that used to sit under the title.
           * They're facts about the fixture, not decoration on the heading, so
           * they read better as labelled stats — and moving them stops the hero
           * carrying four different kinds of thing at once.
           */}
          <Panel label="Game details">
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Format" value={formatLabels[match.format]} />
              <Stat label="Skill level" value={skillLabels[match.skillLevel]} />
              <Stat label="Duration" value={`${match.durationMinutes} min`} />
            </dl>
          </Panel>

          {/* ---- THE HOST'S NOTE ---- */}
          {match.notes && (
            /**
             * The reference's tinted "insight" strip, translated.
             *
             * A lime TINT rather than a plain surface, which docs/13 allows for
             * anything that isn't the one solid action. It earns the tint by
             * being the only thing on the page written by a person rather than
             * generated from the record — so it should look different from the
             * tiles of facts around it.
             *
             * <figure> + <blockquote> + <figcaption> because this IS a
             * quotation with an attribution; the elements carry that to a
             * screen reader, where a styled <p> plus a smaller <p> would not.
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
                  {/* not-italic: <cite> is italic by default, which fights Inter
                      at this size. The element is here for its meaning, not for
                      its default styling. */}
                  — <cite className="not-italic">{match.creatorName}</cite>
                </figcaption>
              </figure>
            </div>
          )}

          {/* ---- CANCEL, FOR THE HOST ONLY ---- */}
          {/**
           * Deliberately far from Join, and deliberately quiet.
           *
           * Join now lives up in the WHEN & WHERE tile; this stays at the very
           * bottom of the page as a small ghost button. That distance is the
           * point — a destructive action should be separated from the primary
           * one both visually and spatially, so it can't be hit by muscle
           * memory aimed at the button beside it.
           *
           * The component renders nothing at all unless you're the host, so the
           * permission rule lives in ONE file next to the mutation that asks
           * the server the same question for real. This page never has to know
           * who may cancel.
           *
           * `self-start` rather than `self-center`: a lone centred control on
           * an otherwise left-aligned page reads as a mistake.
           */}
          {!isOver && (
            <div className="mt-1 flex self-start">
              <CancelMatchButton match={match} />
            </div>
          )}
        </div>

        {/* ---- THE SIDEBAR ---- */}
        <aside>
          {/* top-6 matches the page's own lg:p-6, so the card parks exactly
              level with the content padding instead of kissing the viewport.
              Only sticky from lg, since below that it's just the next block
              down the page and has nothing to stick to. */}
          <div className="lg:sticky lg:top-6">
            <VenuesNearby currentLocation={match.location} />
          </div>
        </aside>
      </div>
    </div>
  )
}
