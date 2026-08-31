import type {
  PlayPeriod,
  TournamentSlots,
  TournamentStatus,
} from '../features/tournaments/types'
import { teams } from './teamData'
import { TEST_USER, users } from './userData'

/**
 * The tournaments "table".
 *
 * Stored NORMALISED — team ids only. The handlers join in names and colours on
 * the way out, the same split as the membership table in Phase 3b:
 * normalise your writes, denormalise your reads.
 */

export interface StoredMatch {
  id: string
  round: number
  slot: number
  teamAId?: string
  teamBId?: string
  scoreA?: number
  scoreB?: number
  winnerTeamId?: string
}

export interface StoredTournament {
  id: string
  name: string
  organiserId: string
  location: string
  startDate: string
  endDate: string
  /** Wall-clock "HH:MM" — see the note on startTime in the feature types. */
  startTime: string
  playPeriod: PlayPeriod
  contactPhone: string
  contactEmail: string
  slots: TournamentSlots
  status: TournamentStatus
  /** Entered team ids, in entry order. */
  teamIds: string[]
  /** Empty until the organiser draws the bracket. */
  matches: StoredMatch[]
  championTeamId?: string
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

/**
 * Seeded to cover all three statuses on first load, because you can only be
 * logged in as one person and some of these states take several actions to
 * reach by hand:
 *
 *   OPEN, part full     → u1 can enter Kochi United (they're the captain)
 *   OPEN, exactly full   → u1 organises it, so "Draw the bracket" is available
 *   COMPLETED            → the finished-bracket view, with a champion
 *
 * The in-progress state is one click from the second one, so it doesn't need
 * its own seed.
 */
export const tournaments: StoredTournament[] = [
  {
    id: 'tn1',
    name: 'Kochi Summer Cup',
    // Someone else runs this one, so u1 sees the ENTRANT view, not the
    // organiser view.
    organiserId: users[3].id,
    location: 'Greenfield Turf, Kakkanad',
    startDate: daysFromNow(12),
    // A three-day weekend cup, played under floodlights.
    endDate: daysFromNow(14),
    startTime: '18:30',
    playPeriod: 'night',
    contactPhone: '+91 98470 11223',
    contactEmail: 'nikhil.das@ricochet.dev',
    slots: 8,
    status: 'open',
    // 5 of 8 filled, and Kochi United (teams[0], captained by u1) is NOT in
    // it — so the "enter your team" flow is available immediately.
    teamIds: [teams[1].id, teams[2].id, teams[3].id, teams[4].id, teams[5].id],
    matches: [],
  },
  {
    id: 'tn2',
    name: 'Backwater Knockout',
    // u1 organises this one → the organiser controls are visible.
    organiserId: TEST_USER.id,
    location: 'Marine Drive Ground',
    // One-day cup: start and end are the same date. A tournament doesn't need
    // to span days, so the schema allows endDate === startDate.
    startDate: daysFromNow(5),
    endDate: daysFromNow(5),
    startTime: '08:00',
    playPeriod: 'day',
    contactPhone: '+91 98470 44556',
    contactEmail: 'test@ricochet.dev',
    slots: 4,
    status: 'open',
    // Exactly full, so "Draw the bracket" is enabled straight away.
    teamIds: [teams[0].id, teams[1].id, teams[2].id, teams[3].id],
    matches: [],
  },
  {
    id: 'tn3',
    name: 'Vyttila Champions Trophy',
    organiserId: users[5].id,
    location: 'Turf Park, Vyttila',
    startDate: daysFromNow(-20),
    endDate: daysFromNow(-19),
    startTime: '16:00',
    playPeriod: 'both',
    contactPhone: '+91 98470 77889',
    contactEmail: 'vishnu.prasad@ricochet.dev',
    slots: 4,
    status: 'completed',
    teamIds: [teams[3].id, teams[0].id, teams[5].id, teams[2].id],
    matches: [
      // Semi-finals (round 1 of a 4-team bracket).
      {
        id: 'tn3-m1', round: 1, slot: 0,
        teamAId: teams[3].id, teamBId: teams[0].id,
        scoreA: 3, scoreB: 1, winnerTeamId: teams[3].id,
      },
      {
        id: 'tn3-m2', round: 1, slot: 1,
        teamAId: teams[5].id, teamBId: teams[2].id,
        scoreA: 0, scoreB: 2, winnerTeamId: teams[2].id,
      },
      // Final — fed by the two above: winner of slot 0 → side A, slot 1 → side B.
      {
        id: 'tn3-m3', round: 2, slot: 0,
        teamAId: teams[3].id, teamBId: teams[2].id,
        scoreA: 2, scoreB: 1, winnerTeamId: teams[3].id,
      },
    ],
    championTeamId: teams[3].id,
  },
]
