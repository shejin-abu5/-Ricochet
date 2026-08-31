/**
 * The fake user table.
 *
 * Split out of handlers.ts this phase because three different handlers now
 * need it — auth, user search, and invites — and a shared table that lives
 * inside one handler file is a table that will eventually get copied.
 *
 * `password` sits in plain text here, which is obviously not how real systems
 * work (they store a slow one-way HASH, bcrypt or argon2, so a stolen database
 * doesn't hand over everyone's password). It's plain here because this is a
 * mock and hashing would teach nothing about React. Worth naming out loud so
 * the shortcut never quietly becomes a habit.
 */
import type { PlayerProfile } from '../features/profile/types'

/**
 * MockUser = everything stored about a person.
 *
 * Note it EXTENDS PlayerProfile rather than redeclaring the fields. The profile
 * shape is the public part; the stored row is that plus a password. Written as
 * two independent interfaces, they'd drift the first time a field was added to
 * one of them.
 */
export interface MockUser extends PlayerProfile {
  password: string
}

/** What the API is allowed to say about someone else. NEVER the password. */
export interface PublicUser {
  id: string
  name: string
  email: string
}

const names = [
  'Test User',
  'Arjun Nair',
  'Sooraj Menon',
  'Fahad Rahman',
  'Nikhil Das',
  'Vishnu Prasad',
  'Aravind Kumar',
  'Jithin Joseph',
  'Sandeep Varma',
  'Rahul Pillai',
  'Anoop Thomas',
  'Manu Krishnan',
  'Sreejith Babu',
  'Ashiq Ali',
  'Vivek Raj',
  'Deepak Suresh',
  'Tom Mathew',
  'Hari Govind',
]

const positions = ['GK', 'DEF', 'MID', 'FWD'] as const
const skillLevels = ['beginner', 'intermediate', 'advanced'] as const
const feet = ['right', 'left', 'both'] as const
const locations = [
  'Kakkanad', 'Edappally', 'Vyttila', 'Kaloor',
  'Panampilly Nagar', 'Marine Drive', 'Palarivattom',
]

/** ISO date, N days before today. */
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/**
 * u1 is the account you log in with (test@ricochet.dev / password123).
 * Everyone else exists to be searched for and invited.
 *
 * Profile fields are generated from the index rather than hand-written 18
 * times. Modulo cycles through each list, so every position and skill level is
 * represented without anyone having to keep 18 objects consistent by hand.
 *
 * The pattern is deterministic, not random: the same user gets the same
 * profile on every reload. Random mock data seems fun until a bug only
 * reproduces on some page loads and you can't tell whether you fixed it.
 */
export const users: MockUser[] = names.map((name, index) => ({
  id: `u${index + 1}`,
  name,
  // "Test User" → test@ricochet.dev, "Arjun Nair" → arjun.nair@ricochet.dev
  email:
    index === 0
      ? 'test@ricochet.dev'
      : `${name.toLowerCase().replace(/\s+/g, '.')}@ricochet.dev`,
  password: 'password123',

  position: positions[index % positions.length],
  skillLevel: skillLevels[index % skillLevels.length],
  preferredFoot: feet[index % feet.length],
  location: locations[index % locations.length],
  attributes: {
    // 2–5, varied per player but stable across reloads.
    pace: 2 + (index % 4),
    passing: 2 + ((index + 1) % 4),
    shooting: 2 + ((index + 2) % 4),
    defending: 2 + ((index + 3) % 4),
  },
  joinedAt: daysAgo(30 + index * 11),
}))

/** The logged-in test account. */
export const TEST_USER = users[0]

/**
 * Build a brand-new user for the signup handler.
 *
 * A new account has no profile yet — `docs/02-app-flow.md` flow 1 step 3 sends
 * you to an onboarding screen to pick position, skill level and location, and
 * that screen doesn't exist yet.
 *
 * So new users get NEUTRAL DEFAULTS rather than empty fields. Every component
 * reading a profile can then assume the fields are there, instead of each one
 * separately handling "position might be missing". Defaults that are obviously
 * placeholder ("MID / beginner / no location set") are also a visible prompt to
 * go and fill them in.
 *
 * The alternative — making every profile field optional — pushes one modelling
 * decision out into a null check in every component that ever reads it.
 */
export function createUser(input: {
  name: string
  email: string
  password: string
}): MockUser {
  return {
    id: `u${users.length + 1}`,
    name: input.name,
    email: input.email,
    password: input.password,
    position: 'MID',
    skillLevel: 'beginner',
    preferredFoot: 'right',
    location: '',
    attributes: { pace: 3, passing: 3, shooting: 3, defending: 3 },
    joinedAt: new Date().toISOString(),
  }
}

/**
 * Strip a user down to what's safe to send over the wire.
 *
 * Doing this in ONE function, rather than picking fields inline at each of the
 * five places that return a user, is the difference between "we never leak
 * password hashes" being a rule and being a hope. The moment it's spelled out
 * by hand in five handlers, one of them will eventually spread the whole
 * object by mistake.
 */
export function toPublicUser(user: MockUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email }
}

/**
 * The full profile — everything EXCEPT the password.
 *
 * Written as a destructure-and-rest rather than listing fields, so a field
 * added to MockUser is included automatically. That cuts both ways: it is the
 * right default here (a profile is "everything public"), and it would be
 * exactly wrong for toPublicUser above, where the whole job is sending as
 * little as possible.
 *
 * Choose per endpoint: allow-list what to send when the answer is "a few
 * fields", deny-list what to hide when the answer is "everything but secrets".
 */
export function toProfile(user: MockUser): PlayerProfile {
  const { password: _password, ...profile } = user
  return profile
}
