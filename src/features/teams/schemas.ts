import { z } from 'zod'
import { avatarColours } from '../../shared/components/avatarColours'

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, 'Team names need at least 3 characters')
    .max(30, 'Keep it under 30 characters so it fits on a badge'),

  location: z.string().min(3, 'Where is the team based?'),

  homeGround: z.string().min(3, 'Which ground do you usually play on?'),

  /**
   * Stays a plain z.number() because CreateTeamForm registers this field with
   * `valueAsNumber: true`, converting at the form boundary.
   *
   * z.coerce.number() here would also work but makes the schema's input type
   * `unknown` while its output stays `number`; useForm<T> uses one type for
   * both, producing "Type 'unknown' is not assignable to type 'number'".
   */
  playsPerWeek: z
    .number()
    .int()
    .min(1, 'At least once a week')
    .max(7, 'Seven days is the most there is'),

  /**
   * Derived from the palette in avatarColours rather than retyped, so adding a
   * colour cannot silently fail validation.
   *
   * The cast is needed because z.enum wants a fixed tuple to build its union,
   * and `avatarColours` is typed as a plain string[]. Safe because both sides
   * come from the same source.
   */
  colour: z.enum(avatarColours as [string, ...string[]]),
})

export type CreateTeamFormValues = z.infer<typeof createTeamSchema>

/**
 * Editing validates the same fields as creating, so this is an alias rather
 * than a second copy. If the two ever diverge, build one from the other with
 * .extend() / .omit() instead of duplicating the object.
 */
export const updateTeamSchema = createTeamSchema
export type UpdateTeamFormValues = CreateTeamFormValues
