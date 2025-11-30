import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { productoId } = await req.json();

    if (!productoId) {
      return NextResponse.json({ error: 'Producto ID requerido' }, { status: 400 });
    }

    // Buscar el producto reservado
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (producto.estado !== 'reservado') {
      return NextResponse.json({ error: 'El producto no está reservado' }, { status: 400 });
    }

    // Buscar el admin para enviarle la notificación
    const admin = await prisma.usuario.findFirst({
      where: { isAdmin: true }
    });

    // Enviar notificación de WhatsApp al admin
    if (admin && admin.whatsapp && producto.compradorInfo) {
      try {
        const mensaje = `⏰ *RESERVA EXPIRADA*\n\n` +
          `El producto "${producto.nombre}" reservado por ${producto.compradorInfo} ha expirado.\n\n` +
          `El producto se pondrá disponible automáticamente en 5 minutos.`;

        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notificaciones/whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: admin.whatsapp,
            message: mensaje,
          }),
        });

        console.log('✅ Notificación de expiración enviada');
      } catch (error) {
        console.error('❌ Error enviando notificación WhatsApp:', error);
      }
    }

    // Programar la liberación del producto en 5 minutos
    setTimeout(async () => {
      try {
        await prisma.producto.update({
          where: { id: productoId },
          data: {
            estado: 'disponible',
            reservadoEn: null,
            compradorInfo: null,
            reservaPausada: false,
            pausadoEn: null,
          },
        });

        console.log(`✅ Producto ${productoId} liberado automáticamente después de 5 minutos`);
      } catch (error) {
        console.error('❌ Error liberando producto:', error);
      }
    }, 5 * 60 * 1000); // 5 minutos

    return NextResponse.json({ 
      success: true, 
      message: 'Notificación enviada, producto se liberará en 5 minutos' 
    });

  } catch (error) {
    console.error('❌ Error en /api/ventas/expirar:', error);
    return NextResponse.json({ error: 'Error al procesar expiración' }, { status: 500 });
  }
}
