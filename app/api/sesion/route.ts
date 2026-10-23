import { NextResponse } from 'next/server'
import { guestSession } from '@/lib/api-identity'

export async function POST() {
  return NextResponse.json({ sessionId: await guestSession(true) }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
