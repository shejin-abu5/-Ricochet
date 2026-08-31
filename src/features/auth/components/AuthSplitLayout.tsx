import type { ReactNode } from 'react'
import { SoccerBall, UsersThree, Trophy, type Icon } from '@phosphor-icons/react'
import zigZagBg from '../../../assets/zig-zag-bg.svg'

/**
 * ============================================================
 *  THE AUTH SPLIT SCREEN — form on the left, brand on the right
 * ============================================================
 *
 * Reference: docs/SS/signup.png (OneFootball's sign-in screen).
 *
 * Two columns on a laptop, stacked on a phone:
 *
 *   >=1024px   [ form ][ gradient + zigzag panel ]
 *   < 1024px   [ short gradient band ]
 *              [ form                ]
 *
 * ---- WHY THIS LIVES IN features/auth/ AND NOT shared/ ----
 *
 * Two components will use it — SignupPage and LoginPage — but both live inside
 * the SAME feature. CLAUDE.md reserves shared/ for code that genuinely crosses
 * features, and docs/13 states the trigger precisely:
 *
 *   "A second component needs it" is the trigger to extract a FILE.
 *   "A second FEATURE needs it" is the trigger to promote it to shared/.
 *
 * Promoting too early is how a shared folder fills up with things only one
 * corner of the app ever touches.
 */

/**
 * ---- WHY THE HEADLINE IS INSIDE THE CARD, NOT ON THE PATTERN ----
 *
 * The reference floats a white headline directly over its artwork. That works
 * for them because their gradient is DARK (purple, luminance ~0.25), so white
 * reads against both the purple and the black chevrons.
 *
 * Ours is lime at luminance 0.85, and the chevrons in the SVG are #1A1A1A.
 * That means no single text colour survives the whole panel:
 *
 *   white text    ->  1.16:1 on the lime          invisible
 *   dark text     ->  fine on the lime, but illegible on a chevron
 *
 * So the words go on a solid surface and the pattern stays purely graphic.
 * That's the more disciplined layout regardless: ONE dark object floating on a
 * bold field, rather than text competing with the artwork it sits on.
 */

interface Benefit {
  icon: Icon
  title: string
  body: string
}

/**
 * Three reasons to finish signing up.
 *
 * Every one of these is a feature that ACTUALLY SHIPS today — Discover, Teams
 * and Tournaments. Nothing here promises the Transfer Market, which is on hold
 * (see router.tsx). An onboarding panel that oversells is the fastest way to
 * make the real product feel like a letdown.
 */
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
  /**
   * The Log in / Sign up switch. A slot rather than something this component
   * renders itself, because building it needs to know about routes — and this
   * component's whole job is to know about pixels. Keeping routing out of it
   * is what lets the layout be reasoned about (and restyled) on its own.
   */
  toggle: ReactNode
  /**
   * Heading, subtitle and the form — everything that changes between log in
   * and sign up. It arrives as ONE slot on purpose: AuthPage keys this whole
   * block so the heading and the form fade together. Split across two props,
   * the heading would snap while the form faded.
   */
  children: ReactNode
}

export function AuthSplitLayout({ toggle, children }: AuthSplitLayoutProps) {
  return (
    /**
     * grid-rows-[auto_1fr] is doing real work on mobile.
     *
     * Without it, both rows size to their content, so on a tall phone the form
     * bunches up under the band and leaves dead space at the bottom. `auto`
     * lets the band be exactly as tall as we set it, and `1fr` hands ALL the
     * remaining height to the form column so it can centre itself in what's
     * left. At lg the grid flips to two columns and one row.
     */
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] bg-canvas lg:grid-cols-2 lg:grid-rows-1">
      {/* ================= BRAND PANEL ================= */}
      {/**
       * This is FIRST in the DOM so it's the top band on a phone, then
       * `lg:order-2` moves it to the right-hand column on a laptop.
       *
       * Reordering with CSS normally risks breaking keyboard navigation, since
       * tab order follows the DOM and not what you see. It's safe here for one
       * specific reason: this panel contains no focusable elements at all. It's
       * a heading, three paragraphs and some artwork — nothing to tab to.
       */}
      <aside className="relative order-1 h-32 overflow-hidden sm:h-40 lg:order-2 lg:flex lg:h-auto lg:items-center lg:justify-center lg:p-10">
        {/**
         * LAYER 1 — the gradient.
         *
         * `bg-[image:var(--gradient-brand)]` is Tailwind v4's arbitrary-value
         * syntax. The `image:` prefix tells Tailwind which CSS property the
         * value belongs to, so this compiles to
         * `background-image: var(--gradient-brand)`.
         *
         * Without that hint Tailwind would guess `background-color` and the
         * gradient would silently not appear. The token itself is defined in
         * index.css — no hex value lives in this file.
         */}
        <div className="absolute inset-0 bg-[image:var(--gradient-brand)]" aria-hidden="true" />

        {/**
         * LAYER 2 — the zigzag, sitting ON the gradient.
         *
         * The SVG paints opaque #1A1A1A chevrons on a TRANSPARENT ground, so
         * the gradient underneath shows through the gaps. That's the whole
         * trick, and it's why the asset needs no recolouring: the artwork is
         * the dark part, the brand colour is the negative space.
         *
         * The url() has to be an inline style rather than a class, because the
         * path is generated by Vite at build time (it hashes the filename), so
         * it isn't a string Tailwind could ever see at compile time.
         *
         * `bg-cover` scales the 840x857 square to fill whatever shape this
         * panel happens to be, cropping rather than stretching — which matters,
         * because stretching would skew the chevrons off their drawn angle.
         *
         * ---- WHY NOT TILE IT SMALLER FOR A FINER TEXTURE ----
         *
         * On desktop the panel is roughly the artwork's own size, so `cover`
         * renders it near 1:1 and the chevrons land coarser than the
         * reference's. The obvious fix — `bg-[length:520px] bg-repeat` — was
         * tried and reverted, because it puts a hard vertical seam down the
         * panel: this SVG is a one-off panel graphic, not a designed tile, so
         * its left edge doesn't continue its right edge.
         *
         * There is no third option. Anything smaller than the panel has to
         * repeat (seam); anything at or above it crops (coarse). Coarse is a
         * taste difference, a seam is a defect, so coarse wins.
         *
         * The url() has to be an inline style rather than a class, because the
         * path is generated by Vite at build time (it hashes the filename), so
         * it isn't a string Tailwind could ever see at compile time.
         */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${zigZagBg})` }}
          aria-hidden="true"
        />

        {/**
         * LAYER 3 — the card. Desktop only.
         *
         * On a phone this panel is a 128px band; there's no room for three
         * paragraphs, and the form is what the person came for. So the band is
         * purely decorative below lg and the words simply aren't rendered.
         *
         * `relative` with no z-index is enough to lift it above the two
         * absolute layers: positioned elements paint after non-positioned
         * siblings in the same stacking context, in DOM order. Adding a
         * z-index here would be cargo-culting.
         *
         * ---- BLUR RADIUS HAS TO SUIT WHAT'S BEHIND IT ----
         *
         * This started at `backdrop-blur-sm` (4px) over shapes hundreds of
         * pixels across, and a 4px blur on a 300px chevron doesn't dissolve
         * it — it just softens its edges, so the card showed a recognisable
         * dark blob and read as a rendering bug. A blur only looks deliberate
         * when its radius is large relative to the FEATURES behind it, so this
         * is `2xl` (40px): the pattern becomes an even wash instead of an
         * identifiable shape.
         *
         * 90% opacity rather than 85% for a contrast reason. The 10% of bright
         * lime bleeding through lifts the effective background to about
         * #222222, where content-muted still measures ~6:1. At 80% it drops to
         * roughly 4.8:1 — passing, but with nothing left for the gradient's
         * brighter top end.
         *
         * No border: the card is dark and the ground is brilliant lime, so the
         * edge is already the highest-contrast line on the screen. Adding a
         * hairline to it is an accessory the design doesn't need.
         */}
        <div className="relative hidden w-full max-w-md rounded-card bg-surface/90 p-7 backdrop-blur-2xl lg:block">
          <h2 className="text-display text-content">Find a game tonight.</h2>

          <ul className="mt-6 flex flex-col gap-5">
            {benefits.map((benefit) => {
              const IconComponent = benefit.icon

              return (
                <li key={benefit.title} className="flex gap-4">
                  {/**
                   * Lime is safe here — this circle sits on the dark card, not
                   * on the gradient, so it's #d2ff00 on #161616 at 16.7:1.
                   * A tint plus a ring rather than a solid fill, per the
                   * "tinted lime for non-actions" rule in docs/13.
                   *
                   * aria-hidden on the glyph because the title right beside it
                   * already says the same thing — a screen reader announcing
                   * both would just stutter.
                   */}
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

      {/* ================= FORM COLUMN ================= */}
      <div className="order-2 flex flex-col justify-center px-6 py-10 lg:order-1 lg:px-12">
        {/* max-w-sm matches the width the forms already set on themselves, so
            the wordmark, heading and inputs share one left edge. */}
        <div className="mx-auto w-full max-w-sm">
          {/* The wordmark lives on the black side at BOTH breakpoints. On the
              gradient it would hit the same legibility problem as the
              headline; here it's 16.7:1 and needs no thought. */}
          <p className="text-3xl font-bold" aria-label="Ricochet">
            <span className="text-primary">Ricochet</span>
          </p>

          {/* The wordmark and the toggle are the two things that DON'T change
              between the two modes, so they sit outside the block that fades.
              Anything that survives the swap has to render above it. */}
          <div className="mt-7">{toggle}</div>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
