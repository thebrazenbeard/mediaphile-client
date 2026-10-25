import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const clientDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const serverDir = resolve(process.env.MEDIAPHILE_SERVER_DIR || join(clientDir, '..', 'mediaphile-server'))
const fixtureDir = mkdtempSync(join(tmpdir(), 'mediaphile-real-e2e-'))
const account = 'fixture_admin'
const password = randomBytes(32).toString('base64url')
let server
let bootSecret = ''
let sawServerExit = false

function run(binary, args, opts = {}) {
  const r = spawnSync(binary, args, { cwd: clientDir, encoding: 'utf8', timeout: 120000, ...opts })
  if (r.error || r.status !== 0) {
    throw new Error(`${binary} failed: ${r.error?.message ?? r.stderr?.slice(-2500) ?? 'unknown error'}`)
  }
}

async function freePort() {
  const server = createServer()
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const port = server.address().port
  await new Promise((done, reject) => server.close(error => error ? reject(error) : done()))
  return port
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function api(baseURL, path, { method = 'GET', token, data, headers = {} } = {}) {
  const result = await fetch(baseURL + path, {
    method,
    headers: {
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(10000),
  })
  if (!result.ok) throw new Error(`API ${method} ${path}: HTTP ${result.status}`)
  if (result.headers.get('content-type')?.includes('application/json')) return result.json()
  return result
}

async function waitForServer(baseURL) {
  for (let i = 0; i < 160; i++) {
    if (sawServerExit) throw new Error('Mediaphile Server exited during initialization')
    try {
      const info = await api(baseURL, '/api/v1/server')
      if (info.apiVersions?.includes('v1') && bootSecret) return
    } catch { /* server still booting */ }
    await sleep(150)
  }
  throw new Error('Local Mediaphile Server did not become ready')
}

async function main() {
  if (!existsSync(join(serverDir, 'go.mod'))) throw new Error('Set MEDIAPHILE_SERVER_DIR to the checked-out mediaphile-server source directory')
  if (!existsSync(join(clientDir, 'dist', 'index.html'))) throw new Error('Run npm run build first')
  const pin = JSON.parse(readFileSync(join(clientDir, 'api', 'contract-source.json'), 'utf8'))
  const canonicalAPI = readFileSync(join(serverDir, 'api', 'openapi.yaml'), 'utf8').replace(/\r\n/g, '\n')
  const contractDigest = createHash('sha256').update(canonicalAPI).digest('hex')
  if (contractDigest !== pin.sha256) throw new Error('Server API does not match the Client pinned OpenAPI snapshot')
  const mediaDir = join(fixtureDir, 'media')
  mkdirSync(mediaDir)
  const moviePath = join(mediaDir, 'Synthetic Film (2026).mp4')
  run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
    '-t', '20', '-c:v', 'libx264', '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-movflags', '+faststart', moviePath,
  ])
  run('ffprobe', ['-v', 'error', '-show_format', '-of', 'json', moviePath])
  const mediaNamesBefore = readdirSync(mediaDir).sort()
  const movieDigestBefore = createHash('sha256').update(readFileSync(moviePath)).digest('hex')
  const binary = join(fixtureDir, process.platform === 'win32' ? 'mediaphile-test.exe' : 'mediaphile-test')
  run('go', ['build', '-o', binary, './cmd/mediaphile-server'], { cwd: serverDir })
  const port = await freePort()
  const discoveryPort = await freePort()
  const baseURL = `http://127.0.0.1:${port}`
  server = spawn(binary, [], {
    cwd: fixtureDir,
    env: {
      ...process.env,
      MEDIAPHILE_LISTEN_ADDR: '127.0.0.1',
      MEDIAPHILE_HTTP_PORT: String(port),
      MEDIAPHILE_DISCOVERY_PORT: String(discoveryPort),
      MEDIAPHILE_DATA_DIR: join(fixtureDir, 'catalog'),
      MEDIAPHILE_TRANSCODE_DIR: join(fixtureDir, 'transcode'),
      MEDIAPHILE_UI_DIR: join(clientDir, 'dist'),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  })
  server.once('exit', () => { sawServerExit = true })
  server.stderr.setEncoding('utf8')
  server.stderr.on('data', chunk => {
    const match = chunk.match(/Mediaphile bootstrap secret:\s*([^\s]+)/)
    if (match) bootSecret = match[1]
    // Never echo secrets, bearer tokens, paths, or server logs.
  })
  await waitForServer(baseURL)
  const boot = await api(baseURL, '/api/v1/setup/bootstrap', {
    method: 'POST', data: { bootstrapSecret: bootSecret, username: account, password },
  })
  bootSecret = ''
  const token = boot.token
  await api(baseURL, '/api/v1/libraries', {
    method: 'POST', token, data: { id: 'fixture-movies', name: 'Synthetic Movies', mediaType: 'movies', rootPath: mediaDir },
  })
  const scan = await api(baseURL, '/api/v1/libraries/fixture-movies/scan', { method: 'POST', token, data: {} })
  if (scan.probed !== 1 && scan.Probed !== 1) throw new Error('Expected exactly one probed synthetic movie')
  const page = await api(baseURL, '/api/v1/items?libraryId=fixture-movies&kind=movie', { token })
  if (page.items?.length !== 1 || page.items[0].title !== 'Synthetic Film') throw new Error('Synthetic media did not appear in the real catalog')
  const itemId = page.items[0].id

  // Exercise actual Server subtitle routes with no provider credentials or downloads.
  // All changes remain in the throwaway catalog, never the user's media library.
  const overview = await api(baseURL, '/api/v1/libraries/fixture-movies/subtitles?limit=1&offset=0', { token })
  if (overview.total !== 1 || overview.items?.length !== 1) throw new Error('Real subtitle overview did not return the synthetic movie')
  const partId = overview.items[0].partId
  if (!partId || overview.items[0].review?.coverage !== 'missing' || overview.items[0].nextAction !== 'search_published')
    throw new Error('Synthetic media subtitle coverage/action was not identified')
  const reviewed = await api(baseURL, `/api/v1/subtitles/parts/${encodeURIComponent(partId)}`, { token })
  if (reviewed.partId !== partId || reviewed.review?.coverage !== 'missing')
    throw new Error('Real per-part subtitle review disagreed with overview')
  const planned = await api(baseURL, '/api/v1/libraries/fixture-movies/subtitles/queue/refresh', {
    method: 'POST', token, data: { limit: 1, offset: 0 },
  })
  if (planned.total !== 1 || planned.planned !== 1 || planned.items?.[0]?.partId !== partId || planned.items[0].action !== 'search_published')
    throw new Error('Real subtitle recovery planning returned an unexpected queue item')
  const queue = await api(baseURL, '/api/v1/libraries/fixture-movies/subtitles/queue?limit=1&offset=0', { token })
  if (queue.total !== 1 || queue.items?.[0]?.partId !== partId)
    throw new Error('Real subtitle queue did not persist its advisory plan')
  const excluded = await api(baseURL, `/api/v1/subtitles/parts/${encodeURIComponent(partId)}/decision`, {
    method: 'PUT', token, data: { disposition: 'skip', reason: 'Synthetic integration fixture' },
  })
  if (excluded.disposition !== 'skip') throw new Error('Real subtitle exclusion was not saved')
  const held = await api(baseURL, `/api/v1/subtitles/parts/${encodeURIComponent(partId)}`, { token })
  if (held.nextAction !== 'excluded') throw new Error('Real subtitle review ignored the persisted exclusion')
  const restored = await api(baseURL, `/api/v1/subtitles/parts/${encodeURIComponent(partId)}/decision`, {
    method: 'PUT', token, data: { disposition: 'active', reason: '' },
  })
  if (restored.disposition !== 'active') throw new Error('Synthetic subtitle decision could not be restored')
  const decision = await api(baseURL, '/api/v1/playback/decide', {
    method: 'POST', token,
    data: { itemId, capabilities: {
      clientId: 'synthetic-runner', containers: ['mp4'], videoCodecs: ['h264'],
      audioCodecs: ['aac'], subtitleCodecs: ['webvtt'],
      maxWidth: 1920, maxHeight: 1080, maxVideoBitrate: 10000000,
      hls: true, rangeRequests: true,
    } },
  })
  if (decision.mode !== 'DIRECT_PLAY') throw new Error(`Expected DIRECT_PLAY but got ${decision.mode}`)
  const segment = await fetch(baseURL + decision.url, {
    headers: { Authorization: `Bearer ${token}`, Range: 'bytes=0-31' },
    signal: AbortSignal.timeout(10000),
  })
  if (segment.status !== 206 || (await segment.arrayBuffer()).byteLength !== 32)
    throw new Error('Range streaming via the real server failed')

  const playwright = resolve(clientDir, 'node_modules/@playwright/test/cli.js')
  const browser = spawnSync(process.execPath, [playwright, 'test', '--config', 'playwright.real.config.ts', '--reporter=line'], {
    cwd: clientDir,
    encoding: 'utf8',
    timeout: 120000,
    env: {
      ...process.env,
      MEDIAPHILE_E2E_BASE_URL: baseURL,
      MEDIAPHILE_E2E_USERNAME: account,
      MEDIAPHILE_E2E_PASSWORD: password,
      MEDIAPHILE_E2E_ITEM_ID: itemId,
    },
  })
  if (browser.stdout) process.stdout.write(browser.stdout)
  if (browser.stderr) process.stderr.write(browser.stderr)
  if (browser.error || browser.status !== 0) throw new Error('Real-server browser acceptance test failed')
  if (JSON.stringify(readdirSync(mediaDir).sort()) !== JSON.stringify(mediaNamesBefore) ||
      createHash('sha256').update(readFileSync(moviePath)).digest('hex') !== movieDigestBefore)
    throw new Error('Subtitle planning/review unexpectedly changed the synthetic media directory')
  process.stdout.write('PASS: real server, ffprobe scan, subtitle overview/queue/review/decision, byte ranges, and authenticated browser playback\n')
}

try {
  await main()
} catch (error) {
  console.error('FAIL:', error.message)
  process.exitCode = 1
} finally {
  if (server && !sawServerExit) {
    server.kill()
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(1500)])
  }
  if (process.env.MEDIAPHILE_E2E_KEEP_FIXTURE !== '1') {
    try { rmSync(fixtureDir, { recursive: true, force: true }) } catch (error) {
      console.error('Synthetic fixture cleanup failed:', error.message)
      process.exitCode = 1
    }
  }
}
