import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

function evaluate(zone, expression) {
  const code = `import { localDate, localDateTime, addCalendarDays } from './nexo-v2/src/services/calendar-date.js'; console.log(JSON.stringify(${expression}));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: new URL('../../', import.meta.url), env: { ...process.env, TZ: zone }, encoding: 'utf8' }));
}
test('Santiago retains October 13 after UTC has advanced to October 14', () => {
  assert.equal(evaluate('America/Santiago', "localDate(new Date('2026-10-14T00:36:00Z'))"), '2026-10-13');
  assert.equal(evaluate('America/Santiago', "localDateTime(new Date('2026-10-14T00:36:00Z'))"), '2026-10-13T21:36');
});
test('positive offsets use their local next day and UTC remains unchanged', () => {
  assert.equal(evaluate('Asia/Tokyo', "localDate(new Date('2026-10-13T23:30:00Z'))"), '2026-10-14');
  assert.equal(evaluate('UTC', "localDate(new Date('2026-10-13T23:30:00Z'))"), '2026-10-13');
});
test('calendar additions cross daylight saving without changing the intended day or hour', () => {
  assert.deepEqual(evaluate('America/Santiago', "[localDate(addCalendarDays(new Date('2026-09-05T12:00:00'), 1)), localDateTime(addCalendarDays(new Date('2026-09-05T12:00:00'), 1))]"), ['2026-09-06', '2026-09-06T12:00']);
});
test('calendar additions handle leap years, month and year boundaries', () => {
  assert.deepEqual(evaluate('America/Santiago', "[localDate(addCalendarDays(new Date('2024-02-28T12:00:00'), 1)), localDate(addCalendarDays(new Date('2026-12-31T12:00:00'), 1))]"), ['2024-02-29', '2027-01-01']);
});
test('formatting and adding calendar days do not mutate the original audit instant', () => {
  assert.equal(evaluate('America/Santiago', "(()=>{const d=new Date('2026-10-14T00:36:00Z');localDate(d);localDateTime(d);addCalendarDays(d,30);return d.toISOString()})()"), '2026-10-14T00:36:00.000Z');
});
