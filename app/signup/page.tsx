import { redirect } from 'next/navigation'

export default function SignupPage() {
  redirect('/auth?tab=register')
}
