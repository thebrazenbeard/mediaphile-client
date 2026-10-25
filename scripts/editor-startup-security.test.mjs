import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))

// These exact identities came from static inspection of unsafe main. The
// check prevents known payloads from returning under a different filename;
// it is not a general malware scanner.
const knownUnsafeBlobsBySize = new Map([
  [28358, new Set(['41a69ba3946396d2d1c15f2e43be705f0793e8773dee0f3dda89a541d31c00d9'])],
  [12797, new Set(['3ae470cabb9412bf5f0e64e1f71b458e14eb10b19070845597d5b8230b27d552'])],
  [787, new Set(['1db793e883ae13501ce00b1d793e11c749795864d7bc35ae203d2cac92ae3097'])],
])

function rejectKnownUnsafeBlobs(directory, signatures = knownUnsafeBlobsBySize) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Never scan third-party dependencies, Git objects, or follow symlinks.
      if (entry.name !== '.git' && entry.name !== 'node_modules') {
        rejectKnownUnsafeBlobs(join(directory, entry.name), signatures)
      }
      continue
    }
    if (!entry.isFile()) continue
    const path = join(directory, entry.name)
    const digests = signatures.get(statSync(path).size)
    if (!digests) continue
    const digest = createHash('sha256').update(readFileSync(path)).digest('hex')
    assert.equal(digests.has(digest), false, `known unsafe startup blob restored at ${relative(root, path)}`)
  }
}

test('pinned server API snapshot matches its recorded source digest', () => {
  const pin = JSON.parse(readFileSync(join(root, 'api', 'contract-source.json'), 'utf8'))
  assert.match(pin.commit, /^[a-f0-9]{40}$/)
  const digest = createHash('sha256').update(readFileSync(join(root, 'api', 'openapi.snapshot.yaml'))).digest('hex')
  assert.equal(digest, pin.sha256)
})

test('opening the workspace has no configured startup task or disguised loader', () => {
  assert.equal(existsSync(join(root, '.vscode', 'tasks.json')), false)
  assert.equal(existsSync(join(root, 'public', 'fonts', 'fa-solid.lkf')), false)
})

test('workspace settings cannot claim user-level automatic-task consent', () => {
  const settings = JSON.parse(readFileSync(join(root, '.vscode', 'settings.json'), 'utf8'))
  assert.equal(Object.hasOwn(settings, 'task.allowAutomaticTasks'), false)
  assert.equal(Object.hasOwn(settings, 'tasks'), false)
})

test('dev and build cannot invoke the obfuscated top-level loader', () => {
  assert.equal(existsSync(join(root, 'api.js')), false)
  const packageFile = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  for (const script of ['dev', 'build']) {
    assert.doesNotMatch(packageFile.scripts[script], /\bnode(?:\.exe)?\s+(?:\.\/)?api\.js\b/i)
  }
})

test('known unsafe executable blobs are absent even when renamed', () => {
  rejectKnownUnsafeBlobs(root)
})

test('renamed-file signature detection uses file content, not its path', () => {
  const fixture = Buffer.from('inert test fixture for known-blob scanning\n')
  const digest = createHash('sha256').update(fixture).digest('hex')
  const directory = mkdtempSync(join(tmpdir(), 'mediaphile-source-guard-'))
  try {
    writeFileSync(join(directory, 'renamed-payload.bin'), fixture)
    const knownFixture = new Map([[fixture.length, new Set([digest])]])
    assert.throws(() => rejectKnownUnsafeBlobs(directory, knownFixture), /known unsafe startup blob restored/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
