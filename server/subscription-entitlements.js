const OPPORTUNITY_MODULES = new Set(['prospectos','oportunidades','opportunities']);
export function separateServiceForModule(moduleKey) {
  if (OPPORTUNITY_MODULES.has(moduleKey)) return 'oportunidades';
  if (['libroObra','libro-obra','workBooks','workBookEntries'].includes(moduleKey)) return 'libroObra';
  return null;
}
export function separateServiceForEntity(entityType) {
  const type=String(entityType||'').trim().toLowerCase();
  if (['opportunity','opportunity_document','opportunity_attachment','prospecto','prospect_document'].includes(type)) return 'oportunidades';
  if (['work_book','work_book_entry','work_book_attachment','work_book_document'].includes(type)) return 'libroObra';
  return null;
}
export function separateServiceEnabled(services, key, now = new Date()) {
  const license=services?.[key];
  if (license?.enabled!==true) return false;
  if (!license.endsAt) return true;
  const end=new Date(license.endsAt).getTime();
  return Number.isFinite(end)&&end>new Date(now).getTime();
}
export function serviceForModules(keys) {
  if (!Array.isArray(keys)||!keys.length) return null;
  const service=separateServiceForModule(keys[0]);
  return service&&keys.every(key=>separateServiceForModule(key)===service)?service:null;
}
export function assertSeparateService(auth, service) {
  if (!auth?.subscriptionManaged||separateServiceEnabled(auth.subscriptionServices,service)) return;
  throw Object.assign(new Error('Este servicio requiere una contratación independiente y vigente.'),{status:403,code:'SUBSCRIPTION_SERVICE_REQUIRED'});
}
export function assertSubscriptionFileAccess(auth,entityType,{write=false}={}) {
  if (!auth?.subscriptionManaged) return;
  const service=separateServiceForEntity(entityType);
  if(service){assertSeparateService(auth,service);return;}
  if(auth.subscriptionCanOperate!==false)return;
  if(!write&&['domian_admin','client_admin'].includes(auth.role))return;
  throw Object.assign(new Error('La suscripción principal no permite esta operación.'),{status:403,code:'SUBSCRIPTION_SUSPENDED'});
}
