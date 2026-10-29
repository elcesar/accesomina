import test from 'node:test'
import assert from 'node:assert/strict'
import {calendarDaysUntil,isCalendarDate} from '../../shared/operational-date.js'
import {calendarDaysUntil as configuredDays,setOperationalTimeZone} from '../../nexo-v2/src/services/calendar-date.js'
import {includesSearch} from '../../nexo-v2/src/services/search.js'
import {matchesWorkerSearch} from '../../nexo-v2/src/services/worker-list.js'
import {formatChileDate,formatChileCount} from '../../nexo-v2/src/services/chile-format.js'
test('Santiago autumn repeated hour does not expire a civil date before the next day',()=>{
 for(const instant of ['2026-04-05T02:59:59Z','2026-04-05T03:00:00Z','2026-04-05T03:59:59Z']) assert.equal(calendarDaysUntil('2026-04-04',new Date(instant)),0)
 assert.equal(calendarDaysUntil('2026-04-04',new Date('2026-04-05T04:00:00Z')),-1)
})
test('Santiago spring gap and 30-day boundary use calendar ordinals',()=>{
 assert.equal(calendarDaysUntil('2026-09-06',new Date('2026-09-06T03:59:59Z')),1)
 assert.equal(calendarDaysUntil('2026-09-06',new Date('2026-09-06T04:00:00Z')),0)
 assert.equal(calendarDaysUntil('2026-10-05',new Date('2026-09-06T04:00:00Z')),29)
 assert.equal(calendarDaysUntil('2026-10-06',new Date('2026-09-06T04:00:00Z')),30)
})
test('invalid dates never roll over and configured calendar has parity with shared utility',()=>{
 for(const value of ['',null,'2026-02-30','2026-13-01','2026-09-06T00:00:00Z']) assert.equal(calendarDaysUntil(value),null)
 assert.equal(isCalendarDate('2028-02-29'),true)
 setOperationalTimeZone('America/Santiago')
 const now=new Date('2026-09-06T04:00:00Z')
 for(const value of ['2026-09-05','2026-09-06','2026-10-06','invalida']) assert.equal(configuredDays(value,now),calendarDaysUntil(value,now))
})
test('search folds accents, casing and whitespace but keeps n distinct from ñ',()=>{
 assert.equal(includesSearch(' José   Peña ','JOSE PEÑA'),true)
 assert.equal(includesSearch('José Peña','jose pena'),false)
 assert.equal(matchesWorkerSearch({nombre:'José Peña'},' JOSE   PEÑA '),true)
 assert.equal(matchesWorkerSearch({rut:'7.000.000-K'},'7000000k'),true)
})
test('dates and plural counts follow approved visible formats',()=>{
 assert.equal(formatChileDate('2026-10-19'),'19-10-2026')
 assert.equal(formatChileCount(1,'persona'),'1 persona')
 assert.equal(formatChileCount(2,'persona'),'2 personas')
})
test('formatChileDate preserves invalid calendar dates instead of displaying impossible dates',()=>{
 for (const value of ['2026-02-31','2026-02-29','2026-13-01','2026-00-10','2026-04-31']) {
  assert.equal(formatChileDate(value),value)
 }
 assert.equal(formatChileDate('2028-02-29'),'29-02-2028')
 assert.equal(formatChileDate(''),'')
})
