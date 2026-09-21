import { z } from 'zod'

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

  // Kept as the raw "18:00" string: a daily kickoff is a wall-clock time, not
  // an instant. See `startTime` in types.ts.
  startTime: z.string().min(1, 'Pick a kickoff time'),

  playPeriod: z.enum(['day', 'night', 'both']),

  // Plausibility only, deliberately. International formats vary enough that a
  // strict regex rejects somebody's real number, and the cost of being too
  // strict is a user who cannot sign up.
  contactPhone: z
    .string()
    .min(7, 'That phone number looks too short')
    .max(20, 'That phone number looks too long')
    .regex(/^[0-9+\-\s()]+$/, 'Digits, spaces and + - ( ) only'),

  contactEmail: z.email('Enter a valid email address'),

  // z.literal + z.union rather than z.enum, which only works on strings. The
  // union infers `4 | 8 | 16`, matching TournamentSlots exactly.
  slots: z.union([z.literal(4), z.literal(8), z.literal(16)]),
})
  /*
   * On the whole object, because it compares two fields.
   *
   * `path` is the part that is easy to miss: without it Zod attaches the error
   * to the object, so errors.endDate is undefined, nothing renders next to the
   * input, and the form silently refuses to submit. It points at endDate
   * because the start date was chosen first.
   */
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    error: 'The end date cannot be before the start date',
    path: ['endDate'],
  })

export type CreateTournamentFormValues = z.infer<typeof createTournamentSchema>
