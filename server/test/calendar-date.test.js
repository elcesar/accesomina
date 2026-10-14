import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCalendarDays,
  isCalendarDateExpired,
  localDate,
  localDateTime,
  operationalDate,
  operationalDateTimeToUtc,
  setOperationalTimeZone,
} from '../../nexo-v2/src/services/calendar-date.js';

test('the company operational timezone, not the browser timezone, defines the day', () => {
  const instant = new Date('2026-10-14T00:36:00Z');
  assert.equal(operationalDate(instant, 'America/Santiago'), '2026-10-13');
  assert.equal(operationalDate(instant, 'Asia/Tokyo'), '2026-10-14');

  setOperationalTimeZone('America/Santiago');
  assert.equal(localDate(instant), '2026-10-13');
  setOperationalTimeZone('Asia/Tokyo');
  assert.equal(localDate(instant), '2026-10-14');
  setOperationalTimeZone('America/Santiago');
});

test('a calendar expiry remains valid for its complete operational day', () => {
  const morning = new Date('2026-10-14T03:00:00Z'); // 2026-10-14 in Santiago
  assert.equal(isCalendarDateExpired('2026-10-14', morning, 'America/Santiago'), false);
  assert.equal(isCalendarDateExpired('2026-10-13', morning, 'America/Santiago'), true);
});

test('calendar arithmetic uses the configured operational zone without mutating an instant', () => {
  const instant = new Date('2026-09-05T15:00:00Z');
  const next = addCalendarDays(instant, 1, 'America/Santiago');
  assert.equal(operationalDate(next, 'America/Santiago'), '2026-09-06');
  assert.equal(instant.toISOString(), '2026-09-05T15:00:00.000Z');
  assert.equal(localDateTime(instant, 'America/Santiago'), '2026-09-05T11:00');
});

test('Libro de obra converts an unambiguous operational time to a UTC instant', () => {
  assert.equal(
    operationalDateTimeToUtc('2026-10-13T21:36', 'America/Santiago'),
    '2026-10-14T00:36:00.000Z'
  );
});

test('manual times in DST gaps or repeated hours are rejected explicitly', () => {
  assert.throws(
    () => operationalDateTimeToUtc('2026-03-08T02:30', 'America/New_York'),
    error => error.code === 'NONEXISTENT_OPERATIONAL_TIME'
  );
  assert.throws(
    () => operationalDateTimeToUtc('2026-11-01T01:30', 'America/New_York'),
    error => error.code === 'AMBIGUOUS_OPERATIONAL_TIME'
  );
});

test('historical calendar dates are not parsed or shifted as timestamps', () => {
  const historicalDueDate = '2026-10-14';
  assert.equal(historicalDueDate, '2026-10-14');
  assert.equal(isCalendarDateExpired(historicalDueDate, new Date('2026-10-14T23:59:59Z'), 'America/Santiago'), false);
});
