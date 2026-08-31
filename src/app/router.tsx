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
 * Auth screens (login/signup) sit OUTSIDE <Layout> — no bottom nav,
 * per the design brief. Everything else sits inside <Layout>, and the
 * routes that require a session are further wrapped in <ProtectedRoute>.
 *
 * As we build each feature we'll swap PagePlaceholder for the real
 * page component (e.g. HomePage, MatchDetailPage) — the route
 * structure itself won't need to change.
 */
export const router = createBrowserRouter([
  /**
   * Log in and sign up are ONE screen with two URLs.
   *
   * Note this route has an `element` but no `path` — a "pathless layout
   * route". It matches whenever one of its children matches, so <AuthPage />
   * is mounted for both /login and /signup, and React Router swaps only the
   * <Outlet /> inside it when you move between them.
   *
   * That's what keeps the gradient panel stable: it lives in AuthPage, above
   * the Outlet, so switching modes never re-creates it. Two sibling page
   * routes would each build their own shell and tear it down again on every
   * switch.
   *
   * Both paths survive, which matters — Layout.tsx navigates to /login on
   * logout, and /signup has to be linkable from outside the app.
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
      /**
       * Careful reading this next line together with '/matches/new' below:
       * you might expect /matches/new to be swallowed by /matches/:id with
       * id="new". It isn't. React Router ranks routes by SPECIFICITY, not
       * by declaration order — a literal segment ("new") always outscores a
       * dynamic one (":id"), regardless of which is written first.
       */
      { path: '/matches/:id', element: <MatchDetailPage /> },
      { path: '/teams', element: <TeamsPage /> },
      // Same specificity rule as /matches/:id vs /matches/new below — the
      // literal "new" outranks the dynamic ":id" regardless of declaration
      // order, so /teams/new is never matched as a team with id "new".
      { path: '/teams/:id', element: <TeamProfilePage /> },
      // On hold — the tab stays so the nav matches the design, and the page is
      // honest about why it's empty rather than pretending to be broken.
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
      // Public: anyone can watch a bracket, logged in or not. The controls
      // inside it are what depend on who you are.
      { path: '/tournaments/:id', element: <TournamentDetailPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/profile', element: <ProfilePage /> },
          { path: '/matches/new', element: <CreateMatchPage /> },
          { path: '/teams/new', element: <CreateTeamPage /> },
          /**
           * ProtectedRoute only checks "logged in", because that's answerable
           * synchronously from the Zustand store. "Are you the captain of THIS
           * team?" needs the team fetched first, so ManageTeamPage does that
           * check itself after its query resolves — and every endpoint behind
           * it returns 403 independently, which is the part that's actually
           * load-bearing.
           */
          { path: '/teams/:id/manage', element: <ManageTeamPage /> },
          // Protected, and not just for convenience: an invites inbox is
          // inherently personal — there is no sensible thing to show a guest.
          { path: '/invites', element: <InvitesPage /> },
          { path: '/tournaments/new', element: <CreateTournamentPage /> },
        ],
      },
    ],
  },
])
