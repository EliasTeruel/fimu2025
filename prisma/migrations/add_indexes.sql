-- Agregar índices para optimizar consultas frecuentes

-- Índice para filtrar productos por estado (disponible/reservado/vendido)
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);

-- Índice para ordenar productos por fecha de creación
CREATE INDEX IF NOT EXISTS idx_productos_createdat ON productos("createdAt");

-- Índice para buscar imágenes por producto (ya existe, pero lo incluimos por completitud)
-- CREATE INDEX IF NOT EXISTS idx_producto_imagenes_productoid ON producto_imagenes("productoId");

-- Índice para filtrar imagen principal
CREATE INDEX IF NOT EXISTS idx_producto_imagenes_esprincipal ON producto_imagenes("esPrincipal");

-- Índice para buscar items del carrito por producto (ya existe como idx_carrito_producto)
-- CREATE INDEX IF NOT EXISTS idx_carrito_items_producto_id ON carrito_items(producto_id);

-- Constraint único para evitar duplicados en el carrito (un producto solo puede estar una vez)
-- Nota: Solo ejecutar si no existe ya
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_producto_carrito'
  ) THEN
    ALTER TABLE carrito_items ADD CONSTRAINT unique_producto_carrito UNIQUE (producto_id);
  END IF;
END $$;
