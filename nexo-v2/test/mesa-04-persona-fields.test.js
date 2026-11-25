import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alta = readFileSync(new URL('../src/pages/NuevoTrabajadorPage.jsx', import.meta.url), 'utf8')
const ficha = readFileSync(new URL('../src/pages/FichaTrabajadorPage.jsx', import.meta.url), 'utf8')

test('MESA-04: alta, ficha y resumen emplean Rol operacional sin etiquetas anteriores', () => {
  for (const screen of [alta, ficha]) {
    assert.match(screen, /label="Cargo contractual"/)
    assert.match(screen, /label="Rol operacional"/)
    assert.match(screen, /label="Especialidad"/)
    assert.doesNotMatch(screen, /Área o función|Función en faena|función en faena/)
  }
  assert.match(alta, /\['Rol operacional', data\.rol\]/)
})

test('MESA-04: los tres atributos conservan sus claves y requerimientos de alta', () => {
  assert.match(alta, /cargo:'', rol:'', especialidad:''/)
  assert.match(alta, /label="Cargo contractual" required/)
  assert.match(alta, /label="Especialidad" required/)
  assert.match(alta, /label="Rol operacional" hint=/)
  assert.match(alta, /cargo: data\.cargo\.trim\(\), rol: data\.rol\.trim\(\) \|\| undefined, especialidad: data\.especialidad/)
  assert.match(ficha, /onChange\('cargo', e\.target\.value\)/)
  assert.match(ficha, /onChange\('rol', e\.target\.value\)/)
  assert.match(ficha, /onChange\('especialidad', e\.target\.value\)/)
})

test('MESA-04: la cabecera no suplanta el cargo ausente por la especialidad', () => {
  assert.match(ficha, /worker\.cargo \|\| 'Sin cargo contractual'/)
  assert.doesNotMatch(ficha, /worker\.cargo \|\| worker\.especialidad/)
})
