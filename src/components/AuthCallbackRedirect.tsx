import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAuthCallbackRoute, getAuthCallbackType, hasAuthCallback } from '@/lib/authCallback'

export function AuthCallbackRedirect() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!hasAuthCallback()) return

    const type = getAuthCallbackType()
    const target = getAuthCallbackRoute(type)
    if (!target || location.pathname === target) return

    navigate(`${target}${location.search}${location.hash}`, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  return null
}
