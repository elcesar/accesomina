import fs from 'node:fs';
import crypto from 'node:crypto';

const strict=process.env.STRICT_RELEASE_VALIDATION==='true';
const errors=[],warnings=[];
const read=file=>fs.readFileSync(file,'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const local=read('AccesoMina_v6.html'),publicHtml=read('public/index.html');
const localUi=`${local}\n${read('assets/nexo-klar-enterprise.js')}`;
const publicUi=`${publicHtml}\n${read('public/assets/nexo-klar-enterprise.js')}`;

if(hash(local)!==hash(publicHtml))errors.push('AccesoMina_v6.html and public/index.html are not synchronized');
if(hash(read('assets/nexo-klar-enterprise.js'))!==hash(read('public/assets/nexo-klar-enterprise.js')))errors.push('Enterprise UI assets are not synchronized');
const requiredCapabilities=[
  // Nomenclatura oficial del menú privado. Debe estar presente tanto en el
  // archivo de referencia local como en el frontend HTML de respaldo.
  'Panel de control','Alertas','Gestión de personal por proyecto','Centro Operativo',
  'Personas','Turnos y asistencia','Protección personal / EPP','Formación y certificaciones','Exámenes y aptitudes','Salud ocupacional','Restringidos',
  'Comunicaciones y convocatorias','Flota y equipos móviles','Alojamientos y estadías','Credenciales de acceso',
  'Terceros y subcontratos','Convenios y contratos de terceros','Personas de empresas colaboradoras','Habilitaciones y cumplimiento','Evaluación de desempeño',
  'Clientes','Contratos y firmas','Órdenes de servicio',
  'Cumplimiento corporativo','Habilitación del cliente','Incidentes y no conformidades','Auditoría',
  'Bitácora operativa','Prospectos y oportunidades',
  'Inventario y existencias','Maquinaria','Equipos e instrumentos','Herramientas','Inventario de EPP','Materiales y ferretería','Insumos y consumibles','Bodegas','Movimientos de inventario','Mantenimiento','Asignaciones y préstamos',
  'Reportes y analítica','Configuración de la empresa','Importar y exportar','Usuarios y permisos','Bitácora de cambios','Privacidad y datos','Administración de clientes',
  'Precalificación y seguimiento','Descontar EPP de la bodega','Reserva para orden de servicio','Solicitar reposición',
  'saveAssetReturnV150','saveEppDelivery=async function','saveAssetReservationV152','saveReplenishmentV152',
  'Órdenes y desempeño operativo','Asignar a orden','F30-1 sin período acreditado',
  'saveContractorOrderV153','installF301PeriodV153',
  'Control de existencias','Conteo físico','Recibir reposición','Buscar código',
  'saveInventoryCountV154','saveInventoryReceiptV154','findInventoryCodeV154',
  'ASSET_AREA_LABELS_V155','syncAssetNavigationV155','Estás en',
  'openInventoryLocationV156','saveInventoryLocationV156','Ubicaciones internas',
  'v156-item-lot','v156-item-expiry',
  "openAssetsWorkspaceV146('epp')",'EPP y protección personal','openInventoryItemModalV157Base',
  'injectEppInventoryHubV158','injectEppOperationGuideV158','Control de EPP por bodega','openEppMovementV158','saveEppMovementV158','hideOperationalEppEntryV158',
  'injectAssignmentsWorkspaceV159','openAssetAssignmentV159','saveAssetAssignmentV159','Asignaciones y préstamos',
  'Personas con antecedentes por gestionar','Cada persona aparece una sola vez','Regularizar documento'
];
for(const capability of requiredCapabilities){
  if(!localUi.includes(capability))errors.push(`Local frontend is missing required capability: ${capability}`);
  if(!publicUi.includes(capability))errors.push(`Production frontend is missing required capability: ${capability}`);
}
for(const [file,html] of [['AccesoMina_v6.html',local],['public/index.html',publicHtml]]){
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
  scripts.forEach((source,index)=>{try{new Function(source);}catch(error){errors.push(`${file} inline script ${index}: ${error.message}`);}});
}
const pkg=JSON.parse(read('package.json'));
if(pkg.name!=='nexo-klar-cloud')errors.push('package name is not normalized to nexo-klar-cloud');
const taskDefinitionPath=process.env.ECS_TASK_DEFINITION_PATH||'infra/aws/ecs-task-definition.json';
let task={};
if(!fs.existsSync(taskDefinitionPath)){
  errors.push(`ECS task definition does not exist: ${taskDefinitionPath}`);
}else{
  try{task=JSON.parse(read(taskDefinitionPath));}
  catch(error){errors.push(`ECS task definition is not valid JSON: ${error.message}`);}
}
const taskText=JSON.stringify(task);
const placeholders=[...taskText.matchAll(/<[^>]+>/g)].map(match=>match[0]);
if(placeholders.length)(strict?errors:warnings).push(`AWS task definition has unresolved placeholders: ${[...new Set(placeholders)].join(', ')}`);
const container=task.containerDefinitions?.find(item=>item.name==='nexo-klar-api');
if(!container)errors.push('ECS container nexo-klar-api is missing');
for(const required of ['DATABASE_URL','TENANT_SECRET_KEY','METRICS_TOKEN','VIRUS_SCAN_API_URL','VIRUS_SCAN_API_TOKEN','VIRUS_SCAN_HEALTH_URL']){
  if(!container?.secrets?.some(secret=>secret.name===required))errors.push(`ECS secret ${required} is missing`);
}
if(!container?.healthCheck)errors.push('ECS health check is missing');
const result={ok:errors.length===0,strict,frontendHash:hash(local),errors,warnings};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exit(1);
