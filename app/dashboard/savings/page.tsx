import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Subscription } from '@/lib/supabase/types'
import SavingsSimulatorView from '../SavingsSimulatorView'

export default async function SavingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_charge_date', { ascending: true })

  const subs = (subscriptions ?? []) as Subscription[]

  return (
    <main className="px-6 py-6">
      <div className="max-w-[1180px]">
        <SavingsSimulatorView subs={subs} />
      </div>
    </main>
  )
}
