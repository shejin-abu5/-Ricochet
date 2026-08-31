import { z } from 'zod'
import { avatarColours } from '../../shared/components/avatarColours'

/**
 * Validation rules for the "create a team" form.
 *
 * Simpler than createMatchSchema — no dates, no cross-field checks. The one
 * interesting line is the colour field below.
 */

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, 'Team names need at least 3 characters')
    .max(30, 'Keep it under 30 characters so it fits on a badge'),

  location: z.string().min(3, 'Where is the team based?'),

  homeGround: z.string().min(3, 'Which ground do you usually play on?'),

  /**
   * ---- EVERY FORM VALUE IS A STRING ----
   *
   * The DOM has no notion of a number. A <select> with <option value="3">
   * hands you the STRING "3". So a bare `z.number()` would reject every
   * submission with "expected number, received string", on a form where the
   * user did nothing wrong.
   *
   * Something has to convert. There are two places it can happen, and the
   * choice matters more than it looks:
   *
   *   1. IN THE SCHEMA — `z.coerce.number()`. Zod converts, then validates.
   *      Fine on its own, but it makes the schema's INPUT type `unknown`
   *      while its OUTPUT stays `number`. React Hook Form's useForm<T> uses
   *      one type for both, so this produces a genuinely baffling error:
   *      "Type 'unknown' is not assignable to type 'number'".
   *
   *   2. AT THE FORM BOUNDARY — `register('playsPerWeek', { valueAsNumber:
   *      true })`, which is what CreateTeamForm.tsx does. RHF converts the
   *      value as it leaves the input, so the schema below only ever sees a
   *      real number and can stay a plain `z.number()`.
   *
   * Option 2 wins because it keeps the SCHEMA honest: it describes the data,
   * not the quirks of the transport it arrived on. Same reason you don't put
   * "might be a string" into a database column type.
   *
   * (RHF has `valueAsDate` too, for the same reason.)
   */
  playsPerWeek: z
    .number()
    .int()
    .min(1, 'At least once a week')
    .max(7, 'Seven days is the most there is'),

  /**
   * ---- BUILDING AN ENUM FROM A RUNTIME ARRAY ----
   *
   * createMatchSchema wrote its options out by hand: z.enum(['5v5','7v7',…]).
   * Here the list of colours already exists, in Avatar.tsx, and writing it
   * twice would mean adding a colour to the palette and silently failing
   * validation because the schema never heard about it.
   *
   * `avatarColours` is a plain string[] at runtime, but z.enum needs a fixed
   * TUPLE type to produce the union 'lime' | 'emerald' | … — a plain array
   * only tells TypeScript "some strings". The cast bridges that gap.
   *
   * A cast is a promise to the compiler that you know something it cannot
   * prove. This one is safe because both sides are derived from the same
   * object in Avatar.tsx. Casts are only dangerous when they are guesses.
   */
  colour: z.enum(avatarColours as [string, ...string[]]),
})

export type CreateTeamFormValues = z.infer<typeof createTeamSchema>

/**
 * Editing a team validates exactly the same fields as creating one, so the
 * schema is REUSED rather than retyped.
 *
 * If they ever diverge — say editing allows a longer name — Zod has `.extend()`
 * and `.omit()` for building one schema from another. Reach for those before
 * copying the whole object: two copies of a validation rule is the same
 * problem as two copies of a fact, and the copy that drifts is always the one
 * you forgot existed.
 *
 * The alias exists so call sites read as what they do (`updateTeamSchema` in
 * the settings form) without pretending to be a second set of rules.
 */
export const updateTeamSchema = createTeamSchema
export type UpdateTeamFormValues = CreateTeamFormValues
