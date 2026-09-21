import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '../shared/components/Layout'
import { ProtectedRoute } from '../shared/components/ProtectedRoute'
import { PagePlaceholder } from '../shared/components/PagePlaceholder'
import { MatchDetailPage } from '../features/matches/components/MatchDetailPage'
import { TeamsPage } from '../features/teams/components/TeamsPage'
import { TeamProfilePage } from '../features/teams/components/TeamProfilePage'
import { CreateTeamPage } from '../features/teams/components/CreateTeamPage'
import { InvitesPage } from '../features/teams/components/InvitesPage'
import { ManageTeamPage } from '../features/teams/components/ManageTeamPage'
import { ProfilePage } from '../features/profile/components/ProfilePage'
import { TournamentsPage } from '../features/tournaments/components/TournamentsPage'
import { TournamentDetailPage } from '../features/tournaments/components/TournamentDetailPage'
import { CreateTournamentPage } from '../features/tournaments/components/CreateTournamentPage'
import { AuthPage } from '../features/auth/components/AuthPage'
import { LoginForm } from '../features/auth/components/LoginForm'
import { SignupForm } from '../features/auth/components/SignupForm'
import { DiscoverPage } from '../features/matches/components/DiscoverPage'
import { CreateMatchPage } from '../features/matches/components/CreateMatchPage'

/**
 * Route tree, matching docs/02-app-flow.md.
 *
 * Auth screens sit outside <Layout> so they get no nav, per docs/03. Everything
 * else is inside it, and routes needing a session are wrapped in
 * <ProtectedRoute>.
 */
export const router = createBrowserRouter([
  /**
   * A pathless layout route: `element` with no `path`, so <AuthPage /> stays
   * mounted across /login and /signup and React Router swaps only its
   * <Outlet />. That is what keeps the gradient panel from being rebuilt on
   * every mode switch. Both paths exist because logout navigates to /login and
   * /signup has to be linkable from outside the app.
   */
  {
    element: <AuthPage />,
    children: [
      { path: '/login', element: <LoginForm /> },
      { path: '/signup', element: <SignupForm /> },
    ],
  },
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DiscoverPage /> },
      // /matches/new is not swallowed by this: React Router ranks by
      // specificity, not declaration order, so a literal segment always
      // outscores a dynamic one. Same for /teams/new below.
      { path: '/matches/:id', element: <MatchDetailPage /> },
      { path: '/teams', element: <TeamsPage /> },
      { path: '/teams/:id', element: <TeamProfilePage /> },
      // On hold. The tab stays so the nav matches the design, and the page says
      // why it is empty rather than looking broken.
      {
        path: '/market',
        element: (
          <PagePlaceholder
            title="Transfer Market"
            description="On hold. Bidding on free agents is designed (docs/01-PRD.md §5, docs/02-app-flow.md flow 6) but not built yet."
          />
        ),
      },
      {
        path: '/settings',
        element: (
          <PagePlaceholder
            title="Settings"
            description="Not built yet. Account and notification preferences will live here."
          />
        ),
      },
      { path: '/tournaments', element: <TournamentsPage /> },
      // Public — anyone can watch a bracket. The controls inside it are what
      // depend on who you are.
      { path: '/tournaments/:id', element: <TournamentDetailPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/profile', element: <ProfilePage /> },
          { path: '/matches/new', element: <CreateMatchPage /> },
          { path: '/teams/new', element: <CreateTeamPage /> },
          // ProtectedRoute only answers "logged in", which the store knows
          // synchronously. The captaincy check happens inside ManageTeamPage,
          // after its query resolves.
          { path: '/teams/:id/manage', element: <ManageTeamPage /> },
          // An invites inbox is inherently personal — there is nothing sensible
          // to show a guest.
          { path: '/invites', element: <InvitesPage /> },
          { path: '/tournaments/new', element: <CreateTournamentPage /> },
        ],
      },
    ],
  },
])
