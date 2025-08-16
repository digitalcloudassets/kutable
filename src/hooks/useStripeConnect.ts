import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getConnectState, setConnectState, isConnectStateForUser } from '../lib/connectState'

export interface StripeConnectStatus {
  id: string
  payouts_enabled: boolean
  charges_enabled: boolean
  requirements_due: string[]
  capabilities: Record<string, any>
  onboarding_complete: boolean
}

export function useStripeConnect(accountId?: string | null, userId?: string) {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!accountId || !userId) {
      setStatus(null)
      return
    }
    
    // Verify this Connect state belongs to the current user
    const connectState = getConnectState()
    if (connectState && connectState.userId !== userId) {
      console.warn('Skipping Stripe status refresh - Connect state belongs to different user')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Use the existing Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('check-stripe-status', {
        body: { accountId }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Failed to check Stripe status')
      }

      if (data?.success) {
        const connectStatus: StripeConnectStatus = {
          id: accountId,
          payouts_enabled: data.accountStatus?.payouts_enabled || false,
          charges_enabled: data.accountStatus?.charges_enabled || false,
          requirements_due: data.accountStatus?.requirements?.currently_due || [],
          capabilities: data.accountStatus?.capabilities || {},
          onboarding_complete: data.onboardingComplete || false
        }
        
        setStatus(connectStatus)
      } else {
        throw new Error(data?.error || 'Unknown status check error')
      }
    } catch (err: any) {
      console.error('Stripe status check error:', err)
      setError(err.message || 'Failed to check Stripe status')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [accountId, userId])

  const resumeOnReturn = useCallback(() => {
    if (!userId) return
    
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('stripe_setup') === 'complete' || params.get('connected') === '1'
    const refresh_flag = params.get('stripe_refresh') === 'true' || params.get('refresh') === '1'
    
    if (connected || refresh_flag) {
      console.log('Detected return from Stripe onboarding for user:', userId)
      
      // Update Connect state for this user
      setConnectState({ 
        userId, 
        accountId: accountId || undefined,
        inProgress: false 
      })
      
      // Small delay to allow Stripe webhooks to process
      setTimeout(() => {
        refresh()
      }, 2000)
      
      // Clean URL parameters
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('stripe_setup')
      newUrl.searchParams.delete('stripe_refresh')
      newUrl.searchParams.delete('account_id')
      newUrl.searchParams.delete('connected')
      newUrl.searchParams.delete('refresh')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [refresh, userId, accountId])

  useEffect(() => {
    if (accountId && userId) {
      // Persist minimal per-user state
      setConnectState({ 
        userId, 
        accountId, 
        inProgress: false 
      })
      
      refresh()
      resumeOnReturn()
      
      // Poll for a minute after returning from Stripe in case status is still updating
      let interval: NodeJS.Timeout | null = null
      if (document.referrer.includes('connect.stripe.com') || document.referrer.includes('dashboard.stripe.com')) {
        console.log('Detected return from Stripe, starting status polling...')
        interval = setInterval(refresh, 5000) // Poll every 5 seconds
        setTimeout(() => {
          if (interval) {
            clearInterval(interval)
            console.log('Stopped Stripe status polling')
          }
        }, 60000) // Stop after 1 minute
      }
      
      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [accountId, userId, refresh, resumeOnReturn])

  const needsAction = status ? (
    !!status.requirements_due?.length ||
    !status.charges_enabled ||
    !status.payouts_enabled ||
    !status.onboarding_complete
  ) : false

  const isFullyConnected = status ? (
    status.charges_enabled && 
    status.payouts_enabled && 
    status.onboarding_complete &&
    (status.requirements_due?.length || 0) === 0
  ) : false

  return { 
    status, 
    loading, 
    error,
    refresh, 
    needsAction, 
    isFullyConnected,
    resumeOnReturn 
  }
}