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
export type BillingType = 'paid' | 'free' | 'trial' | 'one_time'
export type RenewalType = 'auto_renew' | 'manual'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'archived'
export type ReminderChannel = 'local_push' | 'email' | 'in_app'
export type ReminderType = 'trial_end' | 'renewal' | 'price_check'
export type PriceAlertDigest = 'instant' | 'daily' | 'weekly'

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
          email_reminders_enabled: boolean
          onboarding_completed: boolean
          seed_loaded: boolean
          price_alerts_enabled: boolean
          price_alert_min_change_pct: number
          price_alert_digest: PriceAlertDigest
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
          email_reminders_enabled?: boolean
          onboarding_completed?: boolean
          seed_loaded?: boolean
          price_alerts_enabled?: boolean
          price_alert_min_change_pct?: number
          price_alert_digest?: PriceAlertDigest
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
          // Billing-type parity with mobile (DB columns added by migration 0004).
          // Optional so pre-0004 / web-created rows (no column) still typecheck.
          billing_type?: BillingType | null
          price_after_trial?: number | null
          plan_name?: string | null
          pause_state?: string | null
          renewal_type: RenewalType
          cancellation_url: string | null
          management_url: string | null
          pricing_url: string | null
          notes: string | null
          card_color_preset: 'lavender' | 'blush' | 'peach' | 'butter' | 'mint' | 'sky' | 'sage' | 'sand' | null
          status: SubscriptionStatus
          icon: string | null
          price_increase_flag: boolean
          annual_renewal_at_risk: boolean
          last_used_at: string | null
          cancelled_at: string | null
          paused_at: string | null
          archived_at: string | null
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
          // Billing-type parity (migration 0004). Write-path stays unused in Phase 1.
          billing_type?: BillingType | null
          price_after_trial?: number | null
          plan_name?: string | null
          pause_state?: string | null
          renewal_type?: RenewalType
          cancellation_url?: string | null
          management_url?: string | null
          pricing_url?: string | null
          notes?: string | null
          card_color_preset?: 'lavender' | 'blush' | 'peach' | 'butter' | 'mint' | 'sky' | 'sage' | 'sand' | null
          status?: SubscriptionStatus
          icon?: string | null
          price_increase_flag?: boolean
          annual_renewal_at_risk?: boolean
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
      price_sources: {
        Row: {
          id: string
          service_key: string
          service_name: string
          source_url: string
          parser_type: 'jsonld_offer' | 'meta_price' | 'regex'
          regex_pattern: string | null
          currency: string
          enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_key: string
          service_name: string
          source_url: string
          parser_type: 'jsonld_offer' | 'meta_price' | 'regex'
          regex_pattern?: string | null
          currency?: string
          enabled?: boolean
        }
        Update: Partial<Database['public']['Tables']['price_sources']['Insert']>
        Relationships: []
      }
      price_snapshots: {
        Row: {
          id: string
          subscription_id: string
          amount: number | string
          currency: string
          observed_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          amount: number
          currency: string
          observed_at?: string
        }
        Update: Partial<Database['public']['Tables']['price_snapshots']['Insert']>
        Relationships: []
      }
      price_alerts: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          old_amount: number | string
          new_amount: number | string
          currency: string
          change_pct: number | string
          source_url: string | null
          created_at: string
          dismissed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id: string
          old_amount: number
          new_amount: number
          currency: string
          change_pct: number
          source_url?: string | null
          created_at?: string
          dismissed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['price_alerts']['Insert']>
        Relationships: []
      }
      subscription_payments: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          charged_for_date: string
          amount: number | string
          currency: string
          paid_at: string
          source: 'manual_mark_paid' | 'import' | 'bank_sync'
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id: string
          charged_for_date: string
          amount: number
          currency: string
          paid_at?: string
          source?: 'manual_mark_paid' | 'import' | 'bank_sync'
        }
        Update: Partial<Database['public']['Tables']['subscription_payments']['Insert']>
        Relationships: []
      }
      gmail_connections: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string | null
          expires_at: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token?: string | null
          expires_at: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['gmail_connections']['Insert']>
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
export type PriceSource = Database['public']['Tables']['price_sources']['Row']
export type PriceSnapshot = Database['public']['Tables']['price_snapshots']['Row']
export type PriceAlert = Database['public']['Tables']['price_alerts']['Row']
export type SubscriptionPayment = Database['public']['Tables']['subscription_payments']['Row']
