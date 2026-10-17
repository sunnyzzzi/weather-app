import type { ReactNode } from 'react'

export type StatusTone = 'neutral' | 'error'

export interface StatusMessageProps {
  icon?: string
  title: ReactNode
  description?: ReactNode
  actionLabel?: string
  onAction?: () => void
  tone?: StatusTone
}
