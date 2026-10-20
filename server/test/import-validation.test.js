import test from 'node:test'
import assert from 'node:assert/strict'
import { validateImportRows, normalizeCsvHeader, publicCsvHeader, toPublicCsvRow } from '../import-validation.js'
const definition={module:'trabajadores',required:['nombre','rut'],headers:['nombre','rut','tipo','email','telefono','nacimiento','region','ciudad','afp','salud']}
test('all invalid cells and rows are reported with actionable column metadata',()=>{
 const issues=validateImportRows('trabajadores',[
  {nombre:'',rut:'incorrecto',tipo:'desconocido',email:'sin arroba',telefono:'123',nacimiento:'2015-01-01'},
  {nombre:'QA',rut:'11.111.111-1',region:'Metropolitana',nacimiento:'2026-02-30'},
  {nombre:'QA duplicado',rut:'11.111.111-1',afp:'desconocida',salud:'desconocida'},
 ],definition,{}, {today:'2026-10-19'})
 assert.ok(issues.some(e=>e.row===2&&e.column==='rut'&&e.code==='INVALID_RUT'))
 assert.ok(issues.some(e=>e.row===2&&e.column==='tipo'))
 assert.ok(issues.some(e=>e.row===2&&e.code==='WORKER_UNDERAGE'))
 assert.ok(issues.some(e=>e.row===3&&e.code==='INVALID_DATE'))
 assert.ok(issues.some(e=>e.row===4&&e.code==='DUPLICATE_RUT'))
 assert.ok(issues.every(e=>e.message&&e.column&&e.row))
 assert.ok(issues.length>=10)
})
test('existing tenant duplicate RUT is rejected only for append; age cutoff accepts exact birthday',()=>{
 const rows=[{nombre:'QA',rut:'11.111.111-1',nacimiento:'2008-10-19'}],state={trabajadores:[{rut:'11.111.111-1'}]}
 assert.equal(validateImportRows('trabajadores',rows,definition,state,{today:'2026-10-19'})[0].code,'DUPLICATE_RUT')
 assert.deepEqual(validateImportRows('trabajadores',rows,definition,state,{today:'2026-10-19',mode:'replace'}),[])
})
test('public CSV headings preserve older input aliases without ambiguous opportunity client keys',()=>{
 assert.equal(publicCsvHeader('mandante'),'empresa_principal')
 assert.equal(normalizeCsvHeader('cliente',['nombre','minera']),'minera')
 assert.equal(normalizeCsvHeader('cliente',['empresa','cliente']),'cliente')
 assert.deepEqual(toPublicCsvRow({minera:'Cliente QA',mandante:'Empresa QA'}),{cliente:'Cliente QA',empresa_principal:'Empresa QA'})
})
test('missing and unknown columns identify the header row before any data processing',()=>{
 const errors=validateImportRows('trabajadores',[],definition,{}, {fields:['nombre','ajena']})
 assert.deepEqual(errors.map(e=>[e.row,e.column]),[[1,'rut'],[1,'ajena']])
})

test('references must already exist in tenant state before CSV import',()=>{
 const definition={module:'mantenciones',required:['nombre','minera'],headers:['nombre','minera','contrato']}
 const issues=validateImportRows('mantenciones',[
  {nombre:'Orden QA',minera:'Cliente que se creará después',contrato:''},
 ],definition,{minas:[],contratos:[]})
 assert.ok(issues.some(issue=>issue.row===2&&issue.column==='cliente'&&issue.code==='INVALID_REFERENCE'))
})
