'use client'

import { useState } from "react"
import ReservaPolicySummary from '../components/ReservaPolicySummary'
import Navbar from "../components/Navbar"

interface FAQ {
  pregunta: string
  respuesta: string
}

export default function PreguntasFrecuentesPage() {
  const [abierto, setAbierto] = useState<number | null>(null)

  const faqs: FAQ[] = [
    {
      pregunta: "¿Cómo puedo comprar?",
      respuesta: "Agrega productos al carrito, reserva tu compra y coordina el pago por Instagram o WhatsApp. El carrito te mostrará el tiempo disponible para confirmar cada reserva."
    },
    {
      pregunta: "¿Cuánto tiempo tengo para confirmar mi reserva?",
      respuesta: "Consulta las condiciones vigentes arriba y el reloj de cada producto en el carrito. Durante la pausa diaria se conservan los minutos pendientes y se retoman al finalizar. Al agotar el plazo se libera el producto."
    },
    {
      pregunta: "¿Hacen envíos?",
      respuesta: "Sí, hacemos envíos a todo el país. El costo del envío se coordina por Instagram o WhatsApp según tu ubicación."
    },
    {
      pregunta: "¿Dónde puedo retirar mi compra?",
      respuesta: "Hacemos entregas en zona sur. El punto exacto de encuentro se coordina por Instagram o WhatsApp después de confirmar la compra."
    },
    {
      pregunta: "¿Aceptan cambios o devoluciones?",
      respuesta: "No, no hacemos cambios ni devoluciones. Todas las ventas son finales. Por eso es importante revisar bien las fotos y descripción de cada producto antes de comprar."
    },
    {
      pregunta: "¿Cómo sé si una prenda me va a quedar?",
      respuesta: "Cada producto tiene fotos detalladas y descripción. Si tienes más dudas sobre medidas o talles, puedes preguntarnos por Instagram o WhatsApp antes de comprar."
    },
    {
      pregunta: "¿Los productos son nuevos o usados?",
      respuesta: "Somos una tienda de ropa vintage, retro y segunda mano. Cada producto tiene su historia y está en buen estado. En la descripción indicamos el estado de cada prenda."
    },
    {
      pregunta: "¿Cuándo agregan productos nuevos?",
      respuesta: "Agregamos productos nuevos regularmente. Seguinos en redes sociales o visitá la tienda seguido para ver las novedades."
    },
    {
      pregunta: "¿Puedo reservar un producto sin comprarlo?",
      respuesta: "Las reservas son para concretar la compra. Si reservas y no confirmas el pago, el producto vuelve a estar disponible automáticamente al vencer su plazo efectivo."
    },
    {
      pregunta: "¿Qué métodos de pago aceptan?",
      respuesta: "Los métodos de pago se coordinan directamente por Instagram o WhatsApp. Generalmente aceptamos transferencia bancaria, Mercado Pago y efectivo en entregas presenciales."
    },
    {
      pregunta: "¿Puedo ver los productos antes de comprar?",
      respuesta: "No tenemos local físico, pero todas nuestras prendas tienen múltiples fotos detalladas. Si necesitas más información o fotos adicionales, escribinos por Instagram o WhatsApp."
    },
    {
      pregunta: "¿Qué pasa si el producto que me gusta está reservado?",
      respuesta: "Si un producto está reservado, significa que alguien más lo está por comprar. Si vence el plazo de su reserva sin confirmar la compra, el producto vuelve a estar disponible automáticamente."
    }
  ]

  const toggleFAQ = (index: number) => {
    setAbierto(abierto === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8" style={{ paddingTop: '120px' }}>
        <h1 className="text-3xl font-bold mb-8 text-center text-black uppercase tracking-wider border-b-4 border-black pb-4 font-title">
          Preguntas Frecuentes
        </h1>
        <ReservaPolicySummary />

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-4 border-black bg-white">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span className="font-bold font-title uppercase text-black pr-4">
                  {faq.pregunta}
                </span>
                <span className="text-2xl font-bold text-black flex-shrink-0">
                  {abierto === index ? '−' : '+'}
                </span>
              </button>
              
              {abierto === index && (
                <div className="px-4 pb-4 border-t-2 border-black pt-4 mt-0">
                  <p className="font-body text-gray-700">
                    {faq.respuesta}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contacto */}
        <div className="mt-12 border-4 border-black p-6 text-center" style={{ backgroundColor: '#5E18EB' }}>
          <h2 className="text-2xl font-bold mb-3 font-title uppercase text-white">
            ¿Tienes más dudas?
          </h2>
          <p className="font-body text-white mb-4">
            Escribinos y te responderemos todas tus consultas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="https://wa.me/5491172374065?text=Hola%20Fimu%2C%20tengo%20una%20consulta%20sobre%20sus%20productos."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-white text-black font-bold hover:bg-gray-100 transition-colors font-body uppercase tracking-wide"
            >
              💬 Contactar por WhatsApp
            </a>
            <a
              href="https://ig.me/m/fimu_vintage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-white text-black font-bold hover:bg-gray-100 transition-colors font-body uppercase tracking-wide"
            >
              📸 Contactar por Instagram
            </a>
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
