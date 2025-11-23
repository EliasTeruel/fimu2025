import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Pausar o reanudar cronómetro de una reserva (solo admin)
// Pausa TODOS los productos del mismo cliente
export async function POST(request: Request) {
  try {
    const { productoId } = await request.json()

    if (!productoId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del producto' },
        { status: 400 }
      )
    }

    // Obtener el producto
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    })

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    if (producto.estado !== 'reservado') {
      return NextResponse.json(
        { error: 'El producto no está reservado' },
        { status: 400 }
      )
    }

    if (!producto.compradorInfo) {
      return NextResponse.json(
        { error: 'No hay información del comprador' },
        { status: 400 }
      )
    }

    // Buscar TODOS los productos del mismo cliente
    const productosCliente = await prisma.producto.findMany({
      where: {
        estado: 'reservado',
        compradorInfo: producto.compradorInfo
      }
    })

    console.log(`👥 Cliente: ${producto.compradorInfo}`)
    console.log(`📦 Productos del cliente: ${productosCliente.length}`)

    // Toggle: Si está pausado, reanudar. Si está activo, pausar
    const estabaPausado = producto.reservaPausada || false
    const nuevoPausado = !estabaPausado

    // Si está reanudando (estaba pausado), calcular tiempo pausado y extender reserva
    const ahora = new Date()
    const productosActualizados: number[] = []

    for (const prod of productosCliente) {
      let nuevaReservadoEn = prod.reservadoEn

      if (estabaPausado && prod.pausadoEn && prod.reservadoEn) {
        // Calcular cuánto tiempo estuvo pausado
        const pausadoDesde = new Date(prod.pausadoEn)
        const tiempoPausado = ahora.getTime() - pausadoDesde.getTime()
        
        // Extender reservadoEn con el tiempo que estuvo pausado
        const reservaOriginal = new Date(prod.reservadoEn)
        nuevaReservadoEn = new Date(reservaOriginal.getTime() + tiempoPausado)
        
        console.log(`⏱️ Producto ${prod.id}: Pausado ${Math.floor(tiempoPausado / 1000)}s`)
      }

      await prisma.producto.update({
        where: { id: prod.id },
        data: {
          reservaPausada: nuevoPausado,
          pausadoEn: nuevoPausado ? ahora : null,
          reservadoEn: nuevaReservadoEn
        }
      })

      productosActualizados.push(prod.id)
    }

    return NextResponse.json({
      message: nuevoPausado 
        ? `Cronómetro pausado para ${productosActualizados.length} producto(s)` 
        : `Cronómetro reanudado para ${productosActualizados.length} producto(s)`,
      productosActualizados,
      pausado: nuevoPausado,
      compradorInfo: producto.compradorInfo
    })
  } catch (error) {
    console.error('Error al pausar/reanudar reserva:', error)
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    )
  }
}
