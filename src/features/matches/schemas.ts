import { z } from 'zod'

/**
 * Validation rules for the "create a match" form.
 *
 * Two Zod features here that auth/schemas.ts didn't need:
 *   z.enum()   — "must be exactly one of these strings"
 *   .refine()  — used on a SINGLE field this time, not across two
 */

export const createMatchSchema = z.object({
  title: z.string().min(3, 'Give your match a title of at least 3 characters'),

  location: z.string().min(3, 'Where is it being played?'),

  /**
   * An <input type="datetime-local"> gives us a string like "2026-08-22T18:30"
   * — no timezone, no Z on the end. new Date() reads that as LOCAL time,
   * which is what we want: 6:30pm means 6:30pm where the player is.
   *
   * .refine() here checks one field against something external (the current
   * time) rather than against another field. Same method, different use:
   * any check Zod has no built-in rule for.
   */
  dateTime: z
    .string()
    .min(1, 'Pick a date and time')
    .refine((value) => new Date(value) > new Date(), {
      error: 'The match has to be in the future',
    }),

  /**
   * z.enum locks the value to exactly these three strings. Two wins:
   *   1. Runtime — anything else is rejected.
   *   2. Compile time — z.infer turns this into the union type
   *      '5v5' | '7v7' | '11v11', matching MatchFormat in types.ts.
   *
   * Using z.string() here would compile fine and then let '6v6' through.
   */
  format: z.enum(['5v5', '7v7', '11v11']),

  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),

  /**
   * An optional note from the host, per docs/01-PRD.md flow 3.
   *
   * .optional() makes the FIELD optional, but a textarea always submits a
   * string — empty, never undefined. So there are two "nothing" values in play
   * ('' and undefined), and the handler normalises '' to undefined before
   * storing, so readers only ever have to check one.
   *
   * The max is there because this renders into a card: without a cap, one
   * enthusiastic host produces a detail page nobody can scroll past.
   */
  notes: z.string().max(400, 'Keep the note under 400 characters').optional(),
})

export type CreateMatchFormValues = z.infer<typeof createMatchSchema>
