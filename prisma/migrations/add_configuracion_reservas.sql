-- Additive and idempotent. Existing reservations are deliberately NOT inferred.
BEGIN;
CREATE TABLE IF NOT EXISTS configuracion_reservas (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos BETWEEN 1 AND 10080),
  pausa_automatica_habilitada BOOLEAN NOT NULL,
  pausa_desde_minuto INTEGER NOT NULL CHECK (pausa_desde_minuto BETWEEN 0 AND 1439),
  pausa_hasta_minuto INTEGER NOT NULL CHECK (pausa_hasta_minuto BETWEEN 0 AND 1439),
  zona_horaria TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  actualizado_por_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (NOT pausa_automatica_habilitada OR pausa_desde_minuto <> pausa_hasta_minuto)
);
INSERT INTO configuracion_reservas
  (id, duracion_minutos, pausa_automatica_habilitada, pausa_desde_minuto, pausa_hasta_minuto, zona_horaria)
VALUES (1, 30, true, 1380, 600, 'America/Argentina/Buenos_Aires')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS reserva_politica JSONB;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS reserva_expira_en TIMESTAMP(3);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS reserva_saldo_ms INTEGER CHECK (reserva_saldo_ms BETWEEN 0 AND 604800000);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS reserva_version INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS productos_estado_reserva_expira_en_idx ON productos(estado, reserva_expira_en);
-- Access is through the server's database role and requireAdmin(), never PostgREST.
ALTER TABLE configuracion_reservas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON configuracion_reservas FROM PUBLIC;
COMMIT;
