import { CreateTeamForm } from './CreateTeamForm'

/** Behind <ProtectedRoute>: creating a team makes you its captain. */
export function CreateTeamPage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <h1 className="text-display text-content">Create a team</h1>
      <p className="text-meta text-content-muted">You&rsquo;ll be the captain.</p>
      <CreateTeamForm />
    </div>
  )
}
