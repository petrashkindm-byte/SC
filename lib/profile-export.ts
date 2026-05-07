import { coerceNumber } from '@/lib/coerce-number'
import {
  categoryLabelRu,
  formatBillingCycleRu,
  STATUS_LABEL_FULL_RU,
} from '@/lib/subscription-labels'
import type { Subscription } from '@/lib/supabase/types'

function quoteCsv(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function buildSubscriptionsCsv(subs: Subscription[]): string {
  const header = 'service_name,amount,currency,billing,next_charge,status,category'
  const lines = subs.map((s) =>
    [
      quoteCsv(s.name),
      String(coerceNumber(s.amount)),
      s.currency,
      quoteCsv(formatBillingCycleRu(s)),
      s.next_charge_date,
      quoteCsv(STATUS_LABEL_FULL_RU[s.status] ?? s.status),
      quoteCsv(categoryLabelRu(s.category_slug)),
    ].join(','),
  )
  return [header, ...lines].join('\n')
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildSubscriptionsHtmlReport(subs: Subscription[]): string {
  const active = subs.filter((s) => s.status === 'active')
  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: cur }).format(n)

  const rows = subs
    .map(
      (s) => `<tr>
  <td>${esc(s.name)}</td>
  <td style="text-align:right">${esc(fmt(coerceNumber(s.amount), s.currency))}</td>
  <td>${esc(formatBillingCycleRu(s))}</td>
  <td>${esc(s.next_charge_date)}</td>
  <td>${esc(STATUS_LABEL_FULL_RU[s.status] ?? s.status)}</td>
  <td>${esc(categoryLabelRu(s.category_slug))}</td>
</tr>`,
    )
    .join('\n')

  const generated = new Date().toLocaleString('ru-RU')
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Отчёт по подпискам — SubCuro</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1a1a2e; margin: 24px; }
    h1 { font-size: 1.35rem; }
    .meta { color: #6b6b80; font-size: 13px; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; font-size: 14px; }
    th, td { border: 1px solid #e7e3dc; padding: 10px 12px; text-align: left; }
    th { background: #faf9ff; font-weight: 600; }
    .foot { margin-top: 24px; font-size: 12px; color: #8e8e93; }
  </style>
</head>
<body>
  <h1>Отчёт по подпискам</h1>
  <p class="meta">Сформировано: ${esc(generated)} · активных: ${active.length} из ${subs.length}</p>
  <table>
    <thead>
      <tr>
        <th>Сервис</th>
        <th>Сумма</th>
        <th>Период</th>
        <th>Следующее списание</th>
        <th>Статус</th>
        <th>Категория</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="foot">SubCuro · экспорт для личного использования</p>
</body>
</html>`
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 600)
}
