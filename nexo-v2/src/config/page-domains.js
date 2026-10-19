import { PORTAL_MODULES, portalModule } from './portal-modules.js'
export const PAGE_DOMAINS = [...new Set(PORTAL_MODULES.map(item=>item.group))].map(label=>({label,prefixes:PORTAL_MODULES.filter(item=>item.group===label).map(item=>item.path)}))
export function pageDomain(pathname) { return portalModule(pathname)?.group || '' }
