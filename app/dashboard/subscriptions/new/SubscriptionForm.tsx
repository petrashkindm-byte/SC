'use client'

import { createSubscription } from '../actions'
import SubscriptionFormFields from '../SubscriptionFormFields'

type Props = {
  defaultCurrency: string
  error?: string | null
}

export default function SubscriptionForm({ defaultCurrency, error }: Props) {
  return (
    <SubscriptionFormFields
      defaultCurrency={defaultCurrency}
      error={error}
      action={createSubscription}
      submitLabel="Создать подписку"
    />
  )
}
