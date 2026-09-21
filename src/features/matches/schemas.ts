import { z } from 'zod'

export const createMatchSchema = z.object({
  title: z.string().min(3, 'Give your match a title of at least 3 characters'),

  location: z.string().min(3, 'Where is it being played?'),

  // datetime-local submits "2026-08-22T18:30" with no timezone, which Date
  // reads as local time — correct here, since 6:30pm means 6:30pm where the
  // player is.
  dateTime: z
    .string()
    .min(1, 'Pick a date and time')
    .refine((value) => new Date(value) > new Date(), {
      error: 'The match has to be in the future',
    }),

  // Kept in step with MatchFormat / SkillLevel in types.ts — z.enum infers the
  // same union, so a mismatch is a compile error rather than a runtime one.
  format: z.enum(['5v5', '7v7', '11v11']),

  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),

  // A textarea always submits a string, so '' and undefined both mean "no
  // note"; the handler normalises '' away so readers check one thing.
  // Capped because this renders into a fixed-height card.
  notes: z.string().max(400, 'Keep the note under 400 characters').optional(),
})

export type CreateMatchFormValues = z.infer<typeof createMatchSchema>
