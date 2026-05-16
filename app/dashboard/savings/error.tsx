'use client'

export default function SavingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto my-6 max-w-[680px] rounded-2xl border border-[#f3c5c7] bg-[#fdecec] p-5 text-[#a62b30]">
      <h2 className="mb-2 text-lg font-semibold">Ошибка в симуляторе экономии</h2>
      <p className="mb-3 text-sm opacity-90">{error.message || 'Не удалось загрузить данные.'}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-[#a62b30] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#fff5f5]"
      >
        Повторить
      </button>
    </div>
  )
}
