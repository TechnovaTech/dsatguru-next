'use client'
import React, { useEffect } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'

export const Link = ({ to, href, replace, children, ...rest }) => {
  let finalHref = href ?? to
  if (finalHref && typeof finalHref === 'object') {
    const { pathname = '', query = {}, hash = '' } = finalHref
    const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : ''
    finalHref = `${pathname}${qs}${hash || ''}`
  }
  return <NextLink href={finalHref} replace={replace} {...rest}>{children}</NextLink>
}

export const useNavigate = () => {
  const router = useRouter()
  return (to, opts) => {
    let href = to
    if (href && typeof href === 'object') {
      const { pathname = '', query = {}, hash = '' } = href
      const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : ''
      href = `${pathname}${qs}${hash || ''}`
    }
    if (opts?.replace) router.replace(href)
    else router.push(href)
  }
}

export const useLocation = () => {
  if (typeof window === 'undefined') {
    return { pathname: '', search: '', hash: '' }
  }
  const { pathname, search, hash } = window.location
  return { pathname, search, hash }
}

export const useParams = () => {
  if (typeof window === 'undefined') return {}
  const url = new URL(window.location.href)
  return Object.fromEntries(new URLSearchParams(url.search))
}

export const Navigate = ({ to, replace = false }) => {
  const router = useRouter()
  useEffect(() => {
    if (replace) router.replace(to)
    else router.push(to)
  }, [to, replace, router])
  return null
}

export const Outlet = () => null
