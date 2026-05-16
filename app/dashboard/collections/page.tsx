import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import type { Subscription } from '@/lib/supabase/types'
import CollectionsClient from './CollectionsClient'

export default async function CollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  const subs = (subscriptions ?? []) as Subscription[]

  return (
    <main className="px-6 py-6">
      <div className="max-w-[1180px]">
        <Suspense fallback={null}>
          <CollectionsClient subs={subs} />
        </Suspense>
      </div>
    </main>
  )
}
