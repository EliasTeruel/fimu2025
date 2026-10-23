import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { identity, cartOwner, queryClaims, accessResponse } from '@/lib/api-identity'

export async function GET(request: Request) {
  try {
    const actor = await identity(queryClaims(request))
    const count = await prisma.carritoItem.count({ where: cartOwner(actor) })
    return NextResponse.json({ count }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return accessResponse(error) ?? NextResponse.json({ error: 'Error al contar items' }, { status: 500 })
  }
}
