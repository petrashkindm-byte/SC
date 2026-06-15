import { notFound } from 'next/navigation'
import ComparisonPanelHarness from './ComparisonPanelHarness'

// Dev-only preview of the redesigned ComparisonPanel with deterministic mock
// data — lets us verify the UI/responsive layout without needing a seeded
// account and a manual login. Never reachable outside development.
export default function DevComparisonPanelPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <main className="px-6 py-6">
      <div className="max-w-[1180px]">
        <ComparisonPanelHarness />
      </div>
    </main>
  )
}
