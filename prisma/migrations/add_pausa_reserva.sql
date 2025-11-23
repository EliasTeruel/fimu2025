-- Agregar campos para pausar cronómetros de reservas
-- Fecha: 2025-11-23
-- Descripción: Permite al admin pausar temporalmente el cronómetro de una reserva

-- Agregar columna reserva_pausada (boolean)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS reserva_pausada BOOLEAN DEFAULT false;

-- Agregar columna pausado_en (timestamp)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pausado_en TIMESTAMP;

-- Comentarios sobre las columnas
COMMENT ON COLUMN productos.reserva_pausada IS 'Indica si el admin ha pausado el cronómetro de la reserva';
COMMENT ON COLUMN productos.pausado_en IS 'Timestamp de cuando se pausó el cronómetro';
