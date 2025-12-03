# Verificar y eliminar restricciones en carrito_items

## Paso 1: Verificar restricciones actuales

Ejecuta este SQL en Supabase SQL Editor:

```sql
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'carrito_items'::regclass
ORDER BY conname;
```

Esto te mostrará TODAS las restricciones en la tabla `carrito_items`.

## Paso 2: Identificar la restricción UNIQUE

Busca en los resultados una restricción que contenga:
- `producto_id` 
- `session_id`
- Tipo: `UNIQUE` o `u`

Puede tener nombres como:
- `carrito_items_producto_id_session_id_key`
- `carrito_items_productoId_sessionId_key`
- O algún otro nombre generado automáticamente

## Paso 3: Eliminar la restricción correcta

Una vez identificado el nombre EXACTO, ejecuta:

```sql
-- Reemplaza NOMBRE_EXACTO_DE_LA_RESTRICCION con el nombre que encontraste
ALTER TABLE "carrito_items" DROP CONSTRAINT "NOMBRE_EXACTO_DE_LA_RESTRICCION";
```

## Paso 4: Verificar que se eliminó

Vuelve a ejecutar la query del Paso 1 y verifica que la restricción ya no aparece.

## Problema actual

El error indica que todavía existe una restricción UNIQUE sobre el campo `producto_id`, lo cual impide que dos carritos diferentes (con diferentes `session_id` o `usuario_id`) tengan el mismo producto.

**Necesitamos eliminar esta restricción para que múltiples clientes puedan agregar el mismo producto a sus carritos individuales.**
