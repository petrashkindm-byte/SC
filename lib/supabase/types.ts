export type CategorySlug =
  | 'entertainment'
  | 'productivity'
  | 'utilities'
  | 'finance'
  | 'health'
  | 'shopping'
  | 'education'
  | 'other'

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'
export type RenewalType = 'auto_renew' | 'manual'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'archived'
export type ReminderChannel = 'local_push' | 'email' | 'in_app'
export type ReminderType = 'trial_end' | 'renewal' | 'price_check'

type EmptyProps = Record<string, never>

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          owner_id: string | null
          slug: string
          label: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          slug: string
          label: string
          icon?: string | null
        }
        Update: {
          id?: string
          owner_id?: string | null
          slug?: string
          label?: string
          icon?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          base_currency: string
          locale: string
          reminder_lead_days: number[]
          custom_reminder_lead_days: number | null
          push_enabled: boolean
          push_permission: string
          onboarding_completed: boolean
          seed_loaded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          base_currency?: string
          locale?: string
          reminder_lead_days?: number[]
          custom_reminder_lead_days?: number | null
          push_enabled?: boolean
          push_permission?: string
          onboarding_completed?: boolean
          seed_loaded?: boolean
        }
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          category_slug: CategorySlug
          name: string
          /** Serialized as string from Postgres `numeric` in some clients. */
          amount: number | string
          currency: string
          billing_cycle: BillingCycle
          billing_interval: number
          custom_interval_days: number | null
          first_charge_date: string
          next_charge_date: string
          free_trial_end_date: string | null
          renewal_type: RenewalType
          cancellation_url: string | null
          notes: string | null
          status: SubscriptionStatus
          icon: string | null
          price_increase_flag: boolean
          annual_renewal_at_risk: boolean
          last_used_at: string | null
          cancelled_at: string | null
          paused_at: string | null
          archived_at: string | null
          management_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          category_id?: string | null
          category_slug: CategorySlug
          name: string
          amount: number
          currency?: string
          billing_cycle: BillingCycle
          billing_interval?: number
          custom_interval_days?: number | null
          first_charge_date: string
          next_charge_date: string
          free_trial_end_date?: string | null
          renewal_type?: RenewalType
          cancellation_url?: string | null
          notes?: string | null
          status?: SubscriptionStatus
          icon?: string | null
          price_increase_flag?: boolean
          annual_renewal_at_risk?: boolean
          management_url?: string | null
          last_used_at?: string | null
          cancelled_at?: string | null
          paused_at?: string | null
          archived_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          remind_at: string
          channel: ReminderChannel
          type: ReminderType
          enabled: boolean
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          subscription_id: string
          remind_at: string
          channel: ReminderChannel
          type: ReminderType
          enabled?: boolean
          delivered_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
        }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
        Relationships: []
      }
    }
    Views: EmptyProps
    Functions: {
      delete_my_data: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
    Enums: EmptyProps
    CompositeTypes: EmptyProps
  }
}

export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row']
