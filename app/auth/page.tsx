import { Suspense } from 'react'
import AuthLanding from '../AuthLanding'

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthLanding />
    </Suspense>
  )
}
