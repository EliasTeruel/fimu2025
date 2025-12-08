-- ============================================================================
-- MIGRACIÓN: Agregar campos reservadoPorSessionId y reservadoPorUsuarioId
-- ============================================================================
-- Estos campos permiten identificar QUIÉN reservó cada producto
-- (independientemente de quién lo tenga en su carrito)
-- ============================================================================

-- Paso 1: Agregar las columnas
ALTER TABLE "productos" 
ADD COLUMN "reservado_por_session_id" VARCHAR(255),
ADD COLUMN "reservado_por_usuario_id" INTEGER;

-- Paso 2: Agregar índices para mejorar performance de búsquedas
CREATE INDEX "idx_productos_reservado_por_session" ON "productos"("reservado_por_session_id");
CREATE INDEX "idx_productos_reservado_por_usuario" ON "productos"("reservado_por_usuario_id");

-- Paso 3: Agregar foreign key para mantener integridad referencial
-- Si se elimina un usuario, estos campos se pondrán en NULL
ALTER TABLE "productos"
ADD CONSTRAINT "fk_productos_reservado_por_usuario" 
FOREIGN KEY ("reservado_por_usuario_id") 
REFERENCES "usuarios"("id") 
ON DELETE SET NULL;

-- Paso 4 (OPCIONAL): Migrar datos existentes
-- Si ya tienes productos reservados, puedes intentar extraer el sessionId del compradorInfo
-- Este paso es opcional y depende de si guardaste el sessionId en compradorInfo

-- Ejemplo: Si compradorInfo tiene formato "Nombre | Tel: XXX | session: abc123"
-- UPDATE "productos" 
-- SET "reservado_por_session_id" = 
--   CASE 
--     WHEN "comprador_info" LIKE '%session:%' 
--     THEN SUBSTRING("comprador_info" FROM 'session: ([^|]+)')
--     ELSE NULL
--   END
-- WHERE estado = 'reservado' AND "comprador_info" IS NOT NULL;

-- Verificación
SELECT 
  id, 
  nombre, 
  estado, 
  reservado_por_session_id, 
  reservado_por_usuario_id,
  comprador_info
FROM "productos" 
WHERE estado = 'reservado'
LIMIT 5;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Ahora cada producto reservado tendrá:
-- - reservado_por_session_id: el sessionId del usuario que lo reservó
-- - reservado_por_usuario_id: el usuarioId del usuario que lo reservó (si está logueado)
--
-- Esto permite que el frontend compare:
-- if (producto.reservadoPorSessionId === miSessionId) → "es mío"
-- if (producto.reservadoPorSessionId !== miSessionId) → "es de otro"
-- ============================================================================
