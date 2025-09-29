'use client'
import { useTreeContext } from 'fumadocs-ui/contexts/tree'

export function SDKContent({ 
  only, 
  children, 
  showWhenNone = false 
}: { 
  only: string | string[]; 
  children: React.ReactNode;
  showWhenNone?: boolean;
}) {
  const { root } = useTreeContext()
  const sdk = (root.name as string).toLowerCase()      // "ios", "android", "react-native"

  const list = Array.isArray(only) ? only : [only]
  const isIncluded = list.includes(sdk)
  
  if (showWhenNone) {
    return isIncluded ? null : <>{children}</>
  }
  
  return isIncluded ? <>{children}</> : null
}