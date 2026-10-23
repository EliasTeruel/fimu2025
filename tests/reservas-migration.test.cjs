/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')

test('migration on isolated PostgreSQL (PGlite), never the .env database', async t => {
  const db = await PGlite.create()
  try {
    await db.exec(`CREATE TABLE usuarios (id INTEGER PRIMARY KEY);
      CREATE TABLE productos (id INTEGER PRIMARY KEY, estado TEXT, reservado_en TIMESTAMP(3), reserva_pausada BOOLEAN, pausado_en TIMESTAMP(3), comprador_info TEXT);
      INSERT INTO productos VALUES
        (1, 'reservado', '2026-10-20 17:00', false, NULL, 'synthetic active'),
        (2, 'reservado', '2026-10-20 18:00', true, '2026-10-20 18:10', 'synthetic paused'),
        (3, 'reservado', NULL, false, NULL, 'synthetic incomplete'),
        (4, 'disponible', NULL, false, NULL, NULL);`)
    const before = (await db.query('SELECT * FROM productos ORDER BY id')).rows
    const migration = readFileSync('prisma/migrations/add_configuracion_reservas.sql', 'utf8')
    await db.exec(migration)
    await t.test('all legacy data and pauses survive; unknown expiry stays null', async () => {
      const after = (await db.query('SELECT id, estado, reservado_en, reserva_pausada, pausado_en, comprador_info FROM productos ORDER BY id')).rows
      assert.deepEqual(after, before)
      const snapshots = (await db.query('SELECT reserva_politica, reserva_expira_en, reserva_saldo_ms, reserva_version FROM productos')).rows
      assert.ok(snapshots.every(p => p.reserva_politica === null && p.reserva_expira_en === null && p.reserva_saldo_ms === null && p.reserva_version === 0))
    })
    await t.test('initial configuration is correct and reruns never overwrite edits', async () => {
      assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE relname = 'configuracion_reservas'")).rows[0].relrowsecurity, true)
      const row = (await db.query('SELECT * FROM configuracion_reservas')).rows[0]
      assert.equal(row.duracion_minutos, 30)
      assert.equal(row.zona_horaria, 'America/Argentina/Buenos_Aires')
      await db.exec('UPDATE configuracion_reservas SET duracion_minutos = 90, revision = 8')
      await db.exec(migration)
      const rows = (await db.query('SELECT duracion_minutos, revision FROM configuracion_reservas')).rows
      assert.deepEqual(rows, [{ duracion_minutos: 90, revision: 8 }])
    })
    await t.test('database enforces singleton, durations, time ranges, author FK and balances', async () => {
      for (const statement of [
        'UPDATE configuracion_reservas SET id = 2',
        'UPDATE configuracion_reservas SET duracion_minutos = 0',
        'UPDATE configuracion_reservas SET duracion_minutos = 10081',
        'UPDATE configuracion_reservas SET pausa_desde_minuto = 1440',
        'UPDATE configuracion_reservas SET pausa_desde_minuto = pausa_hasta_minuto',
        'UPDATE configuracion_reservas SET actualizado_por_usuario_id = 999',
        'UPDATE productos SET reserva_saldo_ms = -1',
      ]) await assert.rejects(db.exec(statement))
    })
    await t.test('SQL optimistic writes reject stale configuration revisions', async () => {
      const sql = 'UPDATE configuracion_reservas SET revision = revision + 1, duracion_minutos = $1 WHERE id = 1 AND revision = 8 RETURNING revision'
      const [a, b] = await Promise.all([db.query(sql, [60]), db.query(sql, [120])])
      assert.equal(a.rows.length + b.rows.length, 1)
      assert.equal((await db.query('SELECT revision FROM configuracion_reservas')).rows[0].revision, 9)
    })
  } finally { await db.close() }
})
