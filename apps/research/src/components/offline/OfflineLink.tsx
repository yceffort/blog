import type {AnchorHTMLAttributes} from 'react'

// Offline destinations need a document request handled by the service worker,
// including on a cold start with no Next router/RSC cache.
export function OfflineLink({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>
}
