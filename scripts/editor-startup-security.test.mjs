import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))

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
