-- Índices de optimización para Fimu Vintage
-- Ejecutar estos comandos en la consola SQL de Supabase

-- 1. Índice compuesto para consultas por estado y fecha (más frecuente)
CREATE INDEX IF NOT EXISTS idx_producto_estado_fecha 
ON productos(estado, "createdAt" DESC);

-- 2. Índice para búsquedas por precio (filtros futuros)
CREATE INDEX IF NOT EXISTS idx_producto_precio 
ON productos(precio);

-- 3. Índice compuesto para carrito por session_id y usuario_id
CREATE INDEX IF NOT EXISTS idx_carrito_session_usuario 
ON carrito_items(session_id, usuario_id);

-- 4. Índice para búsquedas de productos por disponibilidad
CREATE INDEX IF NOT EXISTS idx_producto_disponible 
ON productos(estado) 
WHERE estado = 'disponible' OR estado IS NULL;

-- 5. Índice para reservas activas (consultas de admin)
CREATE INDEX IF NOT EXISTS idx_producto_reservado 
ON productos(estado, reservado_en) 
WHERE estado = 'reservado';

-- 6. Índice para carrito por usuario (queries frecuentes)
CREATE INDEX IF NOT EXISTS idx_carrito_usuario 
ON carrito_items(usuario_id) 
WHERE usuario_id IS NOT NULL;

-- 7. Índice para imágenes por producto (relación frecuente)
CREATE INDEX IF NOT EXISTS idx_imagen_producto 
ON producto_imagenes("productoId", "esPrincipal", orden);

-- 8. Índice para usuarios por supabase_id (login)
CREATE INDEX IF NOT EXISTS idx_usuario_supabase 
ON usuarios(supabase_id);

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
