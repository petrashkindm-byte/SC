import { coerceNumber } from '@/lib/coerce-number'
import { escapeCsvCell } from '@/lib/csv'
import { createClient } from '@/lib/supabase/server'
import type { Subscription } from '@/lib/supabase/types'
import { NextResponse } from 'next/server'

function subscriptionToCsvRow(row: Subscription): string[] {
  return [
    escapeCsvCell(row.id),
    escapeCsvCell(row.name),
    escapeCsvCell(row.status),
    escapeCsvCell(row.category_slug),
    escapeCsvCell(coerceNumber(row.amount)),
    escapeCsvCell(row.currency),
    escapeCsvCell(row.billing_cycle),
    escapeCsvCell(row.billing_interval),
    escapeCsvCell(row.custom_interval_days),
    escapeCsvCell(row.first_charge_date),
    escapeCsvCell(row.next_charge_date),
    escapeCsvCell(row.free_trial_end_date),
    escapeCsvCell(row.renewal_type),
    escapeCsvCell(row.cancellation_url),
    escapeCsvCell(row.management_url),
    escapeCsvCell(row.notes),
    escapeCsvCell(row.icon),
    escapeCsvCell(row.archived_at),
    escapeCsvCell(row.last_used_at),
    escapeCsvCell(row.price_increase_flag ? '1' : '0'),
    escapeCsvCell(row.paused_at),
    escapeCsvCell(row.cancelled_at),
    escapeCsvCell(row.annual_renewal_at_risk ? '1' : '0'),
  ]
}

const HEADER =
  'id,name,status,category_slug,amount,currency,billing_cycle,billing_interval,custom_interval_days,first_charge_date,next_charge_date,free_trial_end_date,renewal_type,cancellation_url,management_url,notes,icon,archived_at,last_used_at,price_increase_flag,paused_at,cancelled_at,annual_renewal_at_risk'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Нужна авторизация' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: `Не удалось загрузить подписки: ${error.message}` },
      { status: 500 },
    )
  }

  const rows = (data ?? []) as Subscription[]
  const lines = rows.map((row) => subscriptionToCsvRow(row).join(','))
  const csv = ['\uFEFF', HEADER, ...lines].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="subcuro-subscriptions.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
