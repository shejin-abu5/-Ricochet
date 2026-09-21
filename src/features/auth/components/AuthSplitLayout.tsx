import type { ReactNode } from 'react'
import { SoccerBall, UsersThree, Trophy, type Icon } from '@phosphor-icons/react'
import zigZagBg from '../../../assets/zig-zag-bg.svg'

/**
 * Two-column auth shell: form on the left, brand panel on the right at >=1024px,
 * stacked with the panel as a short band below that.
 *
 * Lives in features/auth rather than shared/ because both consumers are in this
 * feature — shared/ is for code a second FEATURE needs, not a second component.
 *
 * The headline sits on a solid card rather than floating on the pattern: the
 * gradient is lime at ~0.85 luminance and the chevrons are #1A1A1A, so no single
 * text colour is legible across both (white reads 1.16:1 on the lime, dark text
 * disappears on a chevron).
 */

interface Benefit {
  icon: Icon
  title: string
  body: string
}

// Only features that ship today — deliberately nothing about the transfer
// market, which is still on hold (see router.tsx).
const benefits: Benefit[] = [
  {
    icon: SoccerBall,
    title: 'Pickup matches near you',
    body: 'Browse 5s, 7s and 11s at turfs around the city — and see how many spots are left before you commit.',
  },
  {
    icon: UsersThree,
    title: 'Bring your own squad',
    body: 'Create a team, invite the regulars, and stop organising your XI in a group chat.',
  },
  {
    icon: Trophy,
    title: 'Run a tournament',
    body: 'Set up a bracket, record results as they happen, and let everyone follow the draw.',
  },
]

interface AuthSplitLayoutProps {
  /** The Log in / Sign up switch. A slot so routing stays out of this layout. */
  toggle: ReactNode
  /**
   * Heading, subtitle and form as one slot, so AuthPage can key the whole block
   * and fade them together — split in two, the heading would snap.
   */
  children: ReactNode
}

export function AuthSplitLayout({ toggle, children }: AuthSplitLayoutProps) {
  return (
    // grid-rows-[auto_1fr] on mobile gives the band its fixed height and hands
    // the rest to the form column so it can centre in what's left; with both
    // rows auto-sized the form bunches under the band on a tall phone.
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] bg-canvas lg:grid-cols-2 lg:grid-rows-1">
      {/* Panel is first in the DOM so it's the top band on mobile, then
          lg:order-2 moves it right on desktop. Safe to reorder visually only
          because it contains nothing focusable, so tab order can't desync. */}
      <aside className="relative order-1 h-32 overflow-hidden sm:h-40 lg:order-2 lg:flex lg:h-auto lg:items-center lg:justify-center lg:p-10">
        {/* The `image:` prefix tells Tailwind which property the arbitrary value
            belongs to; without it this compiles to background-color and the
            gradient silently doesn't render. */}
        <div className="absolute inset-0 bg-[image:var(--gradient-brand)]" aria-hidden="true" />

        {/* The SVG paints opaque chevrons on a transparent ground, so the
            gradient shows through the gaps and the asset needs no recolouring.
            Inline style because Vite hashes the filename at build time, so the
            url() is never a literal Tailwind could see.

            bg-cover crops rather than stretching (stretching skews the chevrons
            off their drawn angle). Tiling it smaller for a finer texture was
            tried and reverted: this is a one-off panel graphic, not a designed
            tile, so repeating puts a hard seam down the middle. */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${zigZagBg})` }}
          aria-hidden="true"
        />

        {/* Desktop only — on a phone this panel is a 128px band with no room for
            three paragraphs.

            `relative` alone lifts the card above the two absolute layers;
            positioned elements paint after non-positioned siblings, so a
            z-index here would be noise.

            blur-2xl (40px), not sm: the chevrons are hundreds of pixels across,
            and a 4px blur only softens their edges, leaving a recognisable dark
            blob that reads as a rendering bug. 90% opacity keeps content-muted
            at ~6:1 against the lime bleeding through; 80% drops it to ~4.8:1. */}
        <div className="relative hidden w-full max-w-md rounded-card bg-surface/90 p-7 backdrop-blur-2xl lg:block">
          <h2 className="text-display text-content">Find a game tonight.</h2>

          <ul className="mt-6 flex flex-col gap-5">
            {benefits.map((benefit) => {
              const IconComponent = benefit.icon

              return (
                <li key={benefit.title} className="flex gap-4">
                  {/* Lime is safe here — the circle sits on the dark card, not
                      the gradient. Tint plus ring rather than a solid fill, per
                      the "tinted lime for non-actions" rule in docs/13. */}
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-pill border border-primary/30 bg-primary/10 text-primary">
                    <IconComponent size={20} aria-hidden="true" />
                  </span>

                  <div className="min-w-0">
                    <p className="text-title text-content">{benefit.title}</p>
                    <p className="mt-1 text-meta text-content-muted">{benefit.body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <div className="order-2 flex flex-col justify-center px-6 py-10 lg:order-1 lg:px-12">
        {/* max-w-sm matches the width the forms set on themselves, so wordmark,
            heading and inputs share one left edge. */}
        <div className="mx-auto w-full max-w-sm">
          <p className="text-3xl font-bold" aria-label="Ricochet">
            <span className="text-primary">Ricochet</span>
          </p>

          {/* Wordmark and toggle are the two things that survive the mode swap,
              so they sit outside the block AuthPage keys and fades. */}
          <div className="mt-7">{toggle}</div>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
