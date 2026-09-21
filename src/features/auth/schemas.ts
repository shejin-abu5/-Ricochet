import { z } from 'zod'

// One schema drives both runtime validation (via zodResolver) and the form's
// TypeScript type (via z.infer), so the two can't drift apart.

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  // Cross-field rules can't live on a single field, which only sees its own
  // value. `path` attaches the error to the confirm input so it renders there.
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type SignupFormValues = z.infer<typeof signupSchema>
