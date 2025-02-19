// components/ToastHandler.tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ToastHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const toastParam = searchParams.get('toast')
    if (toastParam === 'checkEmail') {
      toast('Check your email inbox for a confirmation link.', {
        description: 'Please verify your email to complete the signup process.',
      })
    } else if (toastParam === 'signedOut') {
      toast('Signed out successfully.', {
        description: 'You have been logged out of your account.',
      })
    }

    if (toastParam) {
      // Remove the query parameter to avoid showing the toast repeatedly.
      const url = new URL(window.location.href)
      url.searchParams.delete('toast')
      router.replace(url.toString())
    }
  }, [searchParams, router])

  return null
}
