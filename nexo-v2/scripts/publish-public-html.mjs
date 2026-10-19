import {execFileSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {PUBLIC_PAGES} from '../src/config/public-pages.js'
const bucket=process.env.PUBLIC_SITE_BUCKET||'nexoklar-app'
for(const page of Object.values(PUBLIC_PAGES)){
 if(page.path==='/')continue
 const source=fileURLToPath(new URL(`../dist${page.path}/index.html`,import.meta.url))
 if(!existsSync(source))throw new Error(`Falta el HTML generado para ${page.path}`)
 const target=`s3://${bucket}${page.path}`
 const args=['s3','cp',source,target,'--content-type','text/html; charset=utf-8','--cache-control','no-cache,no-store,must-revalidate']
 if(process.argv.includes('--dry-run'))console.log(`${page.path} -> ${target}`)
 else execFileSync('aws',args,{stdio:'inherit'})
}
