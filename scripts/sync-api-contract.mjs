import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
const [file, serverCommit] = process.argv.slice(2)
if (!file || !/^[a-f0-9]{40}$/.test(serverCommit ?? '')) {
  console.error('Usage: npm run sync:api -- <server-openapi-path> <exact-40-character-server-git-commit>')
  process.exit(2)
}
const source = readFileSync(resolve(file))
const sha256 = createHash('sha256').update(source).digest('hex')
mkdirSync('api', {recursive:true})
mkdirSync('src/api/generated', {recursive:true})
const snapshot = join('api', 'openapi.snapshot.yaml')
writeFileSync(snapshot,source)
writeFileSync('api/contract-source.json', JSON.stringify({repository:'thebrazenbeard/mediaphile-server',commit:serverCommit,sha256},null,2)+'\n')
const child = spawnSync(process.execPath,[resolve('node_modules/openapi-typescript/bin/cli.js'),snapshot,'-o','src/api/generated/schema.d.ts'],{stdio:'inherit'})
if (child.status!==0) process.exit(child.status ?? 1)
console.log('Pinned OpenAPI SHA256',sha256)
