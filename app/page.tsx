import { Suspense } from 'react'
import AuthLanding from './AuthLanding'

export default function Home() {
  return (
    <Suspense fallback={null}>
      <AuthLanding />
    </Suspense>
  )
}
