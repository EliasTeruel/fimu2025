/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { fixture } = require('./helpers.cjs')
const { Temporal } = require('@js-temporal/polyfill')
const { initialPolicy, addEffectiveTime, effectiveTimeBetween } = fixture().load('lib/reserva-policy.ts')

test('seven effective days with a one-minute daily window remain exact', () => {
  const policy = { ...initialPolicy, pausaDesdeMinuto: 1, pausaHastaMinuto: 0 }
  const from = Date.parse('2026-10-22T03:00:00Z')
  const to = addEffectiveTime(from, 604800000, policy)
  assert.equal(new Date(to).toISOString(), '2054-05-27T03:01:00.000Z')
  assert.equal(effectiveTimeBetween(from, to, policy), 604800000)
})

test('whole-day optimization agrees with an independent minute walk across DST seasons', () => {
  const policy = { ...initialPolicy, zonaHoraria: 'America/New_York', pausaDesdeMinuto: 21 * 60, pausaHastaMinuto: 12 * 60 }
  for (const date of ['2026-03-06T22:10:00Z', '2026-10-30T22:10:00Z']) {
    const from = Date.parse(date)
    let cursor = from, minutes = 1800
    while (minutes > 0) {
      const local = Temporal.Instant.fromEpochMilliseconds(cursor).toZonedDateTimeISO(policy.zonaHoraria)
      const m = local.hour * 60 + local.minute
      if (m >= 720 && m < 1260) minutes--
      cursor += 60000
    }
    assert.equal(addEffectiveTime(from, 1800 * 60000, policy), cursor)
    assert.equal(effectiveTimeBetween(from, cursor, policy), 1800 * 60000)
  }
})
