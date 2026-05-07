import { importSubscriptionsCsv } from './actions'

export default function ImportCsvForm() {
  return (
    <form
      action={importSubscriptionsCsv}
      className="space-y-4 max-w-lg rounded-2xl border border-[#e7e3dc] bg-white p-5 shadow-[0_1px_3px_rgba(26,26,61,0.06),0_8px_24px_rgba(26,26,61,0.06)]"
    >
      <div>
        <label className="block text-sm text-[#6b6b80] mb-1">Файл .csv</label>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-[#1a1a2e] file:mr-3 file:rounded-lg file:border-0 file:bg-[#5b43d4] file:px-3 file:py-1.5 file:text-white"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-[#5b43d4] hover:bg-[#4b36b6] px-4 py-2 text-sm font-medium text-white"
      >
        Загрузить
      </button>
    </form>
  )
}
