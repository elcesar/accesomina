import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSubscriptionFileAccess, separateServiceEnabled, separateServiceForModule, serviceForModules } from '../subscription-entitlements.js';
import { canAccessModule, canAccessEntityType } from '../module-access.js';

const auth={role:'client_admin',subscriptionManaged:true,subscriptionCanOperate:true,subscriptionServices:{}};
test('a core plan does not grant either separately contracted service, even to a company administrator',()=>{
  for(const key of ['libroObra','prospectos','oportunidades','opportunities'])assert.equal(canAccessModule(auth,key),false,key);
  assert.equal(canAccessModule(auth,'trabajadores'),true);
  assert.equal(canAccessEntityType(auth,'work_book_entry'),false);
  assert.equal(canAccessEntityType(auth,'opportunity_document'),false);
});
test('legacy companies keep their current service rights without automatic changes',()=>{
  assert.equal(canAccessModule({...auth,subscriptionManaged:false},'prospectos'),true);
});
test('service expiry uses the exact instant and invalid dates do not grant access',()=>{
  const services={libroObra:{enabled:true,endsAt:'2026-12-01T00:00:00Z'}};
  assert.equal(separateServiceEnabled(services,'libroObra','2026-11-30T23:59:59Z'),true);
  assert.equal(separateServiceEnabled(services,'libroObra','2026-12-01T00:00:00Z'),false);
  assert.equal(separateServiceEnabled({libroObra:{enabled:true,endsAt:'invalid'}},'libroObra'),false);
  assert.equal(separateServiceEnabled({libroObra:{enabled:false}},'libroObra'),false);
});
test('service ownership does not grant any other modules or ignore role permissions',()=>{
  const user={...auth,role:'rrhh',subscriptionServices:{oportunidades:{enabled:true}},permissions:{modules:{prospectos:false}}};
  assert.equal(canAccessModule(user,'prospectos'),false);
  assert.equal(canAccessModule({...user,permissions:{modules:{}}},'prospectos'),true);
  assert.equal(canAccessModule(user,'libroObra'),false);
});
test('a mixed operational change cannot be classified as an independent service request',()=>{
  assert.equal(serviceForModules(['prospectos','oportunidades','opportunities']),'oportunidades');
  assert.equal(serviceForModules(['prospectos','trabajadores']),null);
  assert.equal(serviceForModules([]),null);
  assert.equal(separateServiceForModule('trabajadores'),null);
});
test('an independently licensed service may handle its files after the main contract expires',()=>{
  const user={...auth,subscriptionCanOperate:false,subscriptionServices:{libroObra:{enabled:true}}};
  assert.doesNotThrow(()=>assertSubscriptionFileAccess(user,'work_book_entry',{write:true}));
  assert.throws(()=>assertSubscriptionFileAccess(user,'worker_document',{write:true}),e=>e.code==='SUBSCRIPTION_SUSPENDED');
  assert.throws(()=>assertSubscriptionFileAccess(user,'opportunity_document',{write:true}),e=>e.code==='SUBSCRIPTION_SERVICE_REQUIRED');
  assert.doesNotThrow(()=>assertSubscriptionFileAccess(user,'worker_document'));
  assert.throws(()=>assertSubscriptionFileAccess({...user,role:'rrhh'},'worker_document'),e=>e.code==='SUBSCRIPTION_SUSPENDED');
});
