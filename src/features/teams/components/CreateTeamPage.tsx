import { CreateTeamForm } from './CreateTeamForm'

/**
 * Sits inside <Layout> and behind <ProtectedRoute> — you must be logged in to
 * create a team, since creating one makes you its captain (docs/01-PRD.md
 * roles table).
 *
 * Thin, like CreateMatchPage: a heading and the form. The work lives in the
 * form component and the hooks it calls.
 */
export function CreateTeamPage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <h1 className="text-display text-content">Create a team</h1>
      <p className="text-meta text-content-muted">You&rsquo;ll be the captain.</p>
      <CreateTeamForm />
    </div>
  )
}
