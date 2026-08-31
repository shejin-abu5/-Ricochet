import { CreateMatchForm } from './CreateMatchForm'

/**
 * Sits inside <Layout> and behind <ProtectedRoute> (see app/router.tsx) —
 * you must be logged in to create a match, per the roles table in
 * docs/01-PRD.md.
 *
 * Note how little this page does: a heading and the form. Pages stay thin;
 * the work lives in the form component and the hooks it calls.
 */
export function CreateMatchPage() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <h1 className="text-display text-content">Create a match</h1>
      <CreateMatchForm />
    </div>
  )
}
