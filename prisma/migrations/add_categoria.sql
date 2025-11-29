-- Agregar columna categoria a la tabla productos
ALTER TABLE productos ADD COLUMN categoria VARCHAR(50) DEFAULT 'fimu' NOT NULL;

-- Crear índice para filtrar por categoría
CREATE INDEX idx_productos_categoria ON productos(categoria);

-- Actualizar productos existentes para que tengan la categoría 'fimu'
UPDATE productos SET categoria = 'fimu' WHERE categoria IS NULL;
