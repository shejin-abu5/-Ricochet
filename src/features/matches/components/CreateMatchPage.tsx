import { CreateMatchForm } from './CreateMatchForm'

/** Rendered inside <Layout> behind <ProtectedRoute> — see app/router.tsx. */
export function CreateMatchPage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <h1 className="text-display text-content">Create a match</h1>
      <CreateMatchForm />
    </div>
  )
}
