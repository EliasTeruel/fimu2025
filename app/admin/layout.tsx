import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AccessError, requireAdmin } from '@/lib/api-identity'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin()
  } catch (error) {
    if (error instanceof AccessError) {
      redirect(error.status === 401 ? '/login' : '/')
    }
    // If the role cannot be verified, do not render administrative content.
    throw error
  }
  return children
}
