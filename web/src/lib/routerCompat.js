'use client'
import React, { useEffect } from 'react'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

export const Link = ({ to, href, replace, children, ...rest }) => {
  const finalHref = href ?? to
  return <NextLink href={finalHref} replace={replace} {...rest}>{children}</NextLink>
}

export const useNavigate = () => {
  const router = useRouter()
  return (to, opts) => {
    if (opts?.replace) router.replace(to)
    else router.push(to)
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
  const router = useRouter()
  return router.query || {}
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
