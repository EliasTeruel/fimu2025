'use client'

import Navbar from "../components/Navbar"

export default function ComoComprarPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '120px' }}>
        <h1 className="text-3xl font-bold mb-8 text-center text-black uppercase tracking-wider border-b-4 border-black pb-4 font-title">
          ¿Cómo Comprar?
        </h1>

        <div className="space-y-8">
          {/* Paso 1 */}
          <div className="border-4 border-black p-6 bg-white">
            <div className="flex items-start gap-4">
              <div className="text-4xl font-bold font-title text-black">1</div>
              <div>
                <h2 className="text-xl font-bold mb-2 font-title uppercase text-black">
                  Navega y Elige
                </h2>
                <p className="font-body text-gray-700">
                  Explora nuestra tienda y encuentra las piezas que te gustan. Haz click en cualquier producto para ver sus detalles, fotos y descripción completa.
                </p>
              </div>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="border-4 border-black p-6 bg-white">
            <div className="flex items-start gap-4">
              <div className="text-4xl font-bold font-title text-black">2</div>
              <div>
                <h2 className="text-xl font-bold mb-2 font-title uppercase text-black">
                  Agrega al Carrito
                </h2>
                <p className="font-body text-gray-700">
                  Cuando encuentres algo que te encante, haz click en "Agregar al Carrito". Puedes seguir navegando y agregando más productos.
                </p>
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="border-4 border-black p-6 bg-white">
            <div className="flex items-start gap-4">
              <div className="text-4xl font-bold font-title text-black">3</div>
              <div>
                <h2 className="text-xl font-bold mb-2 font-title uppercase text-black">
                  Revisa tu Carrito
                </h2>
                <p className="font-body text-gray-700">
                  Cuando estés listo, ve al carrito (ícono de bolsa en el navbar) para revisar tus productos seleccionados. Puedes eliminar productos si cambias de opinión.
                </p>
              </div>
            </div>
          </div>

          {/* Paso 4 */}
          <div className="border-4 border-black p-6 bg-white">
            <div className="flex items-start gap-4">
              <div className="text-4xl font-bold font-title text-black">4</div>
              <div>
                <h2 className="text-xl font-bold mb-2 font-title uppercase text-black">
                  Reserva tu Compra
                </h2>
                <p className="font-body text-gray-700">
                  Haz click en "Reservar Compra". Los productos quedarán reservados por 30 minutos para que puedas coordinar el pago.
                </p>
                <div className="mt-3 p-3 bg-gray-100 border-2 border-black">
                  <p className="text-sm font-body text-black font-semibold">
                    ⏱️ Importante: Las reservas vencen después de 30 minutos si no se confirma el pago.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 5 */}
          <div className="border-4 border-black p-6 bg-white">
            <div className="flex items-start gap-4">
              <div className="text-4xl font-bold font-title text-black">5</div>
              <div>
                <h2 className="text-xl font-bold mb-2 font-title uppercase text-black">
                  Contacta por WhatsApp
                </h2>
                <p className="font-body text-gray-700 mb-3">
                  Después de reservar, recibirás un número de WhatsApp para coordinar el pago y la entrega. Te responderemos lo antes posible.
                </p>
                <div className="p-3 bg-gray-100 border-2 border-black">
                  <p className="text-sm font-body text-black">
                    💬 Te enviaremos todos los detalles de tu compra y coordinaremos la entrega o envío.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info adicional */}
          <div className="border-4 border-black p-6" style={{ backgroundColor: '#5E18EB' }}>
            <h2 className="text-xl font-bold mb-4 font-title uppercase text-white text-center">
              Información Importante
            </h2>
            <ul className="space-y-2 font-body text-white">
              <li>✓ Todas las piezas son únicas</li>
              <li>✓ No hacemos cambios ni devoluciones</li>
              <li>✓ Entregas en zona sur</li>
              <li>✓ Envíos a todo el país</li>
              <li>✓ Coordinas el pago directamente por WhatsApp</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t mt-12 bg-black">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-body text-white">
            Fimu Vintage - Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
