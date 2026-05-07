export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#f5f0e8] p-6">
      <div className="mx-auto max-w-[1160px] animate-pulse space-y-4">
        <div className="h-10 w-64 rounded-xl bg-white/70" />
        <div className="h-28 rounded-2xl bg-white/80" />
        <div className="h-96 rounded-2xl bg-white/80" />
      </div>
    </div>
  )
}
