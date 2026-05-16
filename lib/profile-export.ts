import { coerceNumber } from '@/lib/coerce-number'
import {
  categoryLabel,
  formatBillingCycle,
  statusLabelFull,
} from '@/lib/subscription-labels'
import { getMonthlyAmount } from '@/lib/currency'
import type { Subscription } from '@/lib/supabase/types'
import type { Lang } from '@/lib/translations'

function quoteCsv(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function buildSubscriptionsCsv(subs: Subscription[], lang: Lang = 'ru'): string {
  const header = 'service_name,amount,currency,billing,next_charge,status,category'
  const lines = subs.map((s) =>
    [
      quoteCsv(s.name),
      String(coerceNumber(s.amount)),
      s.currency,
      quoteCsv(formatBillingCycle(s, lang)),
      s.next_charge_date,
      quoteCsv(statusLabelFull(s.status, lang)),
      quoteCsv(categoryLabel(s.category_slug, lang)),
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

export function buildSubscriptionsHtmlReport(subs: Subscription[], lang: Lang = 'ru', logoDataUrl?: string): string {
  const isEn = lang === 'en'
  const locale = isEn ? 'en-US' : 'ru-RU'
  const active = subs.filter((s) => s.status === 'active')
  const fmt = (n: number, cur: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)

  // Total monthly spend (primary currency)
  const primaryCurrency = active[0]?.currency ?? subs[0]?.currency ?? 'RUB'
  const totalMonthly = Math.round(active.reduce((sum, s) => {
    if ((s.currency ?? 'RUB') !== primaryCurrency) return sum
    return sum + getMonthlyAmount(s)
  }, 0))

  const statusBadgeStyle: Record<string, string> = {
    active:    'background:#dcfce7;color:#15803d;border:1px solid #86efac',
    paused:    'background:#fef3c7;color:#92400e;border:1px solid #fde68a',
    cancelled: 'background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5',
    archived:  'background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb',
  }

  const rows = subs.map((s) => {
    const badge = statusBadgeStyle[s.status] ?? statusBadgeStyle.archived
    return `
    <tr>
      <td style="font-weight:600">${esc(s.name)}</td>
      <td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${esc(fmt(coerceNumber(s.amount), s.currency))}</td>
      <td style="color:#6b6b80">${esc(formatBillingCycle(s, lang))}</td>
      <td style="color:#6b6b80;font-size:13px">${esc(s.next_charge_date ?? '—')}</td>
      <td><span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;${badge}">${esc(statusLabelFull(s.status, lang))}</span></td>
      <td style="color:#6b6b80">${esc(categoryLabel(s.category_slug, lang))}</td>
    </tr>`
  }).join('\n')

  const generated = new Date().toLocaleString(locale)
  const title      = isEn ? 'Subscription Report' : 'Отчёт по подпискам'
  const metaStr    = isEn
    ? `Generated: ${generated} · active: ${active.length} of ${subs.length}`
    : `Сформировано: ${generated} · активных: ${active.length} из ${subs.length}`
  const colService  = isEn ? 'Service'        : 'Сервис'
  const colAmount   = isEn ? 'Amount'         : 'Сумма'
  const colPeriod   = isEn ? 'Period'         : 'Период'
  const colNext     = isEn ? 'Next charge'    : 'Следующее списание'
  const colStatus   = isEn ? 'Status'         : 'Статус'
  const colCat      = isEn ? 'Category'       : 'Категория'
  const statActive  = isEn ? 'Active'         : 'Активных'
  const statTotal   = isEn ? 'Total'          : 'Всего'
  const statMonthly = isEn ? 'Monthly spend'  : 'В месяц'
  const footNote    = isEn ? 'Subcuro · personal use export' : 'Subcuro · экспорт для личного использования'

  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" width="32" height="32" alt="Subcuro" style="display:block;border-radius:6px"/>`
    : `<div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff">S</div>`

  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'ru'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Subcuro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      background: #f7f4ef;
      color: #1a1a2e;
      min-height: 100vh;
    }
    /* ── Header ── */
    .header {
      background: #1a1a3d;
      padding: 18px 32px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo { display: flex; align-items: center; gap: 10px; }
    .header-name {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 26px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.7px;
    }
    .header-divider {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.2);
      margin: 0 4px;
    }
    .header-title {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
      font-weight: 500;
    }
    /* ── Content ── */
    .content { max-width: 900px; margin: 0 auto; padding: 32px 24px 48px; }
    /* ── Page title ── */
    .page-title { font-family: 'Outfit', 'Inter', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: #1a1a2e; margin-bottom: 6px; }
    .page-meta  { font-size: 13px; color: #6b6b80; margin-bottom: 24px; }
    /* ── Stats row ── */
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card {
      background: #fff;
      border: 1px solid #e7e3dc;
      border-radius: 14px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(26,26,61,0.06);
    }
    .stat-label { font-size: 11px; font-weight: 600; color: #6b6b80; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .stat-value { font-family: 'Outfit', 'Inter', sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #1a1a2e; }
    .stat-value.green { color: #12b76a; }
    /* ── Table card ── */
    .card {
      background: #fff;
      border: 1px solid #e7e3dc;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(26,26,61,0.06), 0 8px 24px rgba(26,26,61,0.06);
    }
    table { border-collapse: collapse; width: 100%; font-size: 14px; }
    thead tr { border-bottom: 1px solid #f0ece6; }
    th {
      background: #faf9ff;
      padding: 11px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #6b6b80;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    th:nth-child(2) { text-align: right; }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #f0ece6;
      vertical-align: middle;
    }
    td:nth-child(2) { text-align: right; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: rgba(91,67,212,0.03); }
    /* ── Footer ── */
    .foot { margin-top: 32px; font-size: 12px; color: #8e8e93; text-align: center; }
    .foot a { color: #5b43d4; text-decoration: none; }
    @media (max-width: 600px) {
      .stats { grid-template-columns: 1fr 1fr; }
      .content { padding: 20px 16px 40px; }
      .header { padding: 14px 16px; }
      td, th { padding: 10px 10px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo">
      ${logoImg}
      <span class="header-name">SubCuro</span>
    </div>
    <div class="header-divider"></div>
    <span class="header-title">${title}</span>
  </div>

  <div class="content">
    <h1 class="page-title">${title}</h1>
    <p class="page-meta">${metaStr}</p>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">${statMonthly}</div>
        <div class="stat-value green">${esc(fmt(totalMonthly, primaryCurrency))}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${statActive}</div>
        <div class="stat-value">${active.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${statTotal}</div>
        <div class="stat-value">${subs.length}</div>
      </div>
    </div>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>${colService}</th>
            <th>${colAmount}</th>
            <th>${colPeriod}</th>
            <th>${colNext}</th>
            <th>${colStatus}</th>
            <th>${colCat}</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>

    <p class="foot">${footNote}</p>
  </div>
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
