import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { requestToJoinTeam, leaveTeam } from './teamsApi'
import { teamKeys } from './useTeams'
import { inviteKeys } from './useInvites'
import { useAuthStore } from '../../auth/authStore'
import { useUiStore } from '../../../shared/uiStore'
import type { Team, TeamMember } from '../types'

/**
 * Join and leave for teams.
 *
 * Joining is NOT optimistic, though it used to be. It now creates a request the
 * captain approves, and an optimistic update can only predict an outcome you
 * control. Drawing yourself onto the roster here would be a lie the code never
 * corrects — rollback runs on failure, and this mutation succeeds; the user
 * would sit in the team until a refetch quietly removed them.
 *
 * Leaving stays optimistic: it is entirely yours to do and needs nobody's
 * approval.
 */

type TeamUpdater = (team: Team) => Team

/**
 * Separate updaters per cache, because GET /api/teams strips `members`:
 * running the detail updater over a stripped list row would invent a
 * one-person roster the server never sent.
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

export function useRequestToJoinTeam(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: () => requestToJoinTeam(teamId),

    onSuccess: () => {
      // Also invalidates invites, which is easy to miss from this screen: the
      // captain's approval queue lives under that prefix and now has a new row.
      // Ask what changed on the server, not what is visible.
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
      queryClient.invalidateQueries({ queryKey: inviteKeys.all })

      showToast('Request sent — the captain will review it')
    },

    onError: (error) => {
      showToast(error.message, 'error')
    },
  })
}

export function useLeaveTeam(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)
  const user = useAuthStore((state) => state.user)

  const removeMember = (member: TeamMember): TeamUpdater => (team) => ({
    ...team,
    // New array, never splice: a mutated array is === to itself, so React
    // concludes nothing changed and the roster never re-renders.
    members: team.members.filter((m) => m.id !== member.id),
    memberCount: team.memberCount - 1,
  })

  return useMutation({
    mutationFn: () => leaveTeam(teamId),

    onMutate: async () => {
      if (!user) return

      // Cancel in-flight refetches first, or one can land after the optimistic
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
      // e.g. "A captain cannot leave their own team".
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
