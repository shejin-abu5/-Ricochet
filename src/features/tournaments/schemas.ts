import { z } from 'zod'

/**
 * Validation for "create a tournament".
 *
 * Nothing new to learn here — z.enum for the slot count, .refine for the date,
 * valueAsNumber at the form boundary. Fifth form in this project, and it should
 * read as routine by now. That's the payoff of settling on one stack early.
 */

export const createTournamentSchema = z.object({
  name: z
    .string()
    .min(3, 'Give the tournament a name of at least 3 characters')
    .max(40, 'Keep it under 40 characters'),

  location: z.string().min(3, 'Where is it being played?'),

  startDate: z
    .string()
    .min(1, 'Pick a start date')
    .refine((value) => new Date(value) > new Date(), {
      error: 'The tournament has to start in the future',
    }),

  endDate: z.string().min(1, 'Pick an end date'),

  /**
   * <input type="time"> gives back "18:00" — no date, no timezone. We keep it
   * exactly as that string, because a daily kickoff time is a WALL-CLOCK time,
   * not an instant. See the long note on `startTime` in types.ts.
   */
  startTime: z.string().min(1, 'Pick a kickoff time'),

  playPeriod: z.enum(['day', 'night', 'both']),

  /**
   * Phone numbers are not worth a strict regex.
   *
   * International formats vary enormously (+91, 00, spaces, hyphens, brackets,
   * extensions), and every "clever" phone regex on the internet rejects
   * somebody's real number. The cost of being too strict is a user who
   * literally cannot sign up; the cost of being too loose is a typo that gets
   * caught the first time someone calls.
   *
   * So: check the shape is plausible, and stop. Same instinct applies to email
   * regexes — z.email() is a sanity check, not a proof the address exists.
   */
  contactPhone: z
    .string()
    .min(7, 'That phone number looks too short')
    .max(20, 'That phone number looks too long')
    .regex(/^[0-9+\-\s()]+$/, 'Digits, spaces and + - ( ) only'),

  contactEmail: z.email('Enter a valid email address'),

  /**
   * Only powers of two, so the bracket halves cleanly every round and there
   * are no byes to handle. See the note at the top of types.ts.
   *
   * z.literal + z.union rather than z.enum, because these are NUMBERS and
   * z.enum works on strings. The union produces the type `4 | 8 | 16`, which
   * lines up exactly with TournamentSlots — so passing the wrong number is a
   * compile error, not a runtime surprise.
   */
  slots: z.union([z.literal(4), z.literal(8), z.literal(16)]),
})
  /**
   * ============================================================
   *  .refine() ON THE WHOLE OBJECT, NOT ONE FIELD
   * ============================================================
   *
   * Every .refine() so far has hung off a single field, because it only needed
   * that field's value. This one compares TWO fields, so it has to run after
   * the whole object is parsed — hence `.refine()` on the schema itself.
   *
   * (Phase 1's password-confirm check was the same shape. Worth re-reading them
   * side by side: same method, and the position in the chain is what changes.)
   *
   * `path: ['endDate']` is the part people miss. Without it, Zod attaches the
   * error to the OBJECT rather than to a field — so `errors.endDate` is
   * undefined, nothing renders next to the input, and the form silently refuses
   * to submit with no visible reason. One of the more baffling ways to lose an
   * afternoon.
   *
   * Point it at the field the user should FIX. They chose a start date first,
   * so the end date is the one that's wrong.
   */
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    error: 'The end date cannot be before the start date',
    path: ['endDate'],
  })

export type CreateTournamentFormValues = z.infer<typeof createTournamentSchema>
