import { createAdminClient } from '@/lib/supabase/admin'

type SocialLoginResult = { path: string } | { error: string }

/**
 * Создаёт (если нужно) пользователя Supabase по email от внешнего провайдера
 * и возвращает путь на /auth/callback с token_hash для входа без пароля —
 * тот же путь, что используют ссылки подтверждения почты.
 */
export async function buildSocialLoginRedirect({
  email,
  fullName,
  provider,
}: {
  email: string
  fullName?: string
  provider: string
}): Promise<SocialLoginResult> {
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: fullName ? { data: { full_name: fullName, oauth_provider: provider } } : undefined,
  })

  if (error || !data?.properties?.hashed_token) {
    return { error: error?.message ?? 'Не удалось создать сессию.' }
  }

  return { path: `/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink` }
}
