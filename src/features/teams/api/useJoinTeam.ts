import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { requestToJoinTeam, leaveTeam } from './teamsApi'
import { teamKeys } from './useTeams'
import { inviteKeys } from './useInvites'
import { useAuthStore } from '../../auth/authStore'
import { useUiStore } from '../../../shared/uiStore'
import type { Team, TeamMember } from '../types'

/**
 * ============================================================
 *  WHEN AN OPTIMISTIC UPDATE HAS TO BE TAKEN BACK OUT
 * ============================================================
 *
 * This file used to hold TWO optimistic mutations: join and leave. Joining is
 * no longer optimistic, and the reason is worth more than the code was.
 *
 * Joining a team used to put you straight on the roster. Now it creates a
 * REQUEST that the captain approves — and that breaks the one condition
 * optimism depends on:
 *
 *   YOU CAN ONLY PREDICT A RESULT YOU CONTROL.
 *
 * The old join was safe to predict: the server's answer was a foregone
 * conclusion given a spare slot. The new one is somebody else's decision, days
 * away. There is nothing to draw optimistically, because the honest answer
 * after the request succeeds is "you asked, now wait" — which is not a roster
 * change at all.
 *
 * Drawing yourself onto the roster here would be a *lie the code never
 * corrects*: rollback only happens when the mutation FAILS, and this mutation
 * succeeds. The user would see themselves in the team until the next refetch
 * quietly removed them.
 *
 * > Optimism is for operations whose outcome you already know. The moment a
 * > human has to say yes, you are guessing, not predicting.
 *
 * LEAVING is still optimistic, and the contrast is right here in one file:
 * leaving is entirely yours to do, needs nobody's approval, and the server
 * cannot reasonably refuse (bar the captain rule, which the UI checks first).
 */

type TeamUpdater = (team: Team) => Team

/**
 * The list and detail caches hold DIFFERENT data — GET /api/teams strips
 * `members` — so each needs its own updater. Patching a stripped list row with
 * the detail updater would invent a one-person roster that the server never
 * sent. See docs/08 for the full note.
 */
function patchTeamEverywhere(
  queryClient: QueryClient,
  teamId: string,
  updateDetail: TeamUpdater,
  updateListRow: TeamUpdater
) {
  queryClient.setQueryData<Team>(teamKeys.detail(teamId), (old) =>
    old ? updateDetail(old) : old
  )

  queryClient.setQueriesData<Team[]>({ queryKey: ['teams', 'list'] }, (old) =>
    old?.map((team) => (team.id === teamId ? updateListRow(team) : team))
  )
}

function snapshotTeamCaches(queryClient: QueryClient, teamId: string) {
  return {
    detail: queryClient.getQueryData<Team>(teamKeys.detail(teamId)),
    lists: queryClient.getQueriesData<Team[]>({ queryKey: ['teams', 'list'] }),
  }
}

type TeamSnapshot = ReturnType<typeof snapshotTeamCaches>

function restoreTeamCaches(
  queryClient: QueryClient,
  teamId: string,
  snapshot: TeamSnapshot
) {
  queryClient.setQueryData(teamKeys.detail(teamId), snapshot.detail)

  for (const [key, data] of snapshot.lists) {
    queryClient.setQueryData(key, data)
  }
}

/**
 * Ask to join. Plain mutation — no optimistic update, for the reason above.
 */
export function useRequestToJoinTeam(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: () => requestToJoinTeam(teamId),

    onSuccess: () => {
      /**
       * Which caches did this change?
       *
       *   ['teams']    ✅ but ONLY the detail entry's `yourRequestStatus`,
       *                   which flips to 'pending' and turns the button into
       *                   "Request sent". No roster changed.
       *   ['invites']  ✅ the captain's approval queue lives under this prefix
       *                   and now has one more row in it.
       *
       * The second one is easy to miss, because from this screen nothing about
       * invites is visible. Ask what changed ON THE SERVER, not what is on
       * screen — the habit from docs/09.
       */
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
      queryClient.invalidateQueries({ queryKey: inviteKeys.all })

      showToast('Request sent — the captain will review it')
    },

    onError: (error) => {
      // e.g. "You already have something pending with this team".
      showToast(error.message, 'error')
    },
  })
}

/**
 * Leave a team. STILL optimistic — leaving is entirely yours to do, so the
 * result is predictable and instant feedback costs nothing.
 */
export function useLeaveTeam(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)
  const user = useAuthStore((state) => state.user)

  const removeMember = (member: TeamMember): TeamUpdater => (team) => ({
    ...team,
    // New array, never `.splice()`. A mutated array is `===` to itself, so
    // React concludes nothing changed and the roster does not re-render.
    members: team.members.filter((m) => m.id !== member.id),
    memberCount: team.memberCount - 1,
  })

  return useMutation({
    mutationFn: () => leaveTeam(teamId),

    onMutate: async () => {
      if (!user) return

      // Cancel in-flight refetches first, or one can land after our optimistic
      // write and silently overwrite it.
      await queryClient.cancelQueries({ queryKey: teamKeys.all })

      const snapshot = snapshotTeamCaches(queryClient, teamId)

      patchTeamEverywhere(
        queryClient,
        teamId,
        removeMember({ id: user.id, name: user.name }),
        (team) => ({ ...team, memberCount: team.memberCount - 1 })
      )

      return snapshot
    },

    onError: (error, _variables, context) => {
      if (context) {
        restoreTeamCaches(queryClient, teamId, context)
      }
      // e.g. "A captain cannot leave their own team" — a rule the client
      // cannot explain on its own.
      showToast(error.message, 'error')
    },

    onSuccess: (serverTeam) => {
      patchTeamEverywhere(
        queryClient,
        teamId,
        () => serverTeam,
        (row) => ({ ...row, memberCount: serverTeam.memberCount })
      )
      showToast('You left the team')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    },
  })
}
