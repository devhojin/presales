#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const cwd = process.cwd()

function parseEnvLine(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const separatorIndex = trimmed.indexOf('=')
  if (separatorIndex === -1) return null

  const key = trimmed.slice(0, separatorIndex).trim()
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null

  let value = trimmed.slice(separatorIndex + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  } else {
    value = value.replace(/\s+#.*$/, '').trim()
  }

  return [key, value]
}

function loadLocalEnv() {
  const filePath = path.join(cwd, '.env.local')
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const parsed = parseEnvLine(line)
    if (!parsed) continue

    const [key, value] = parsed
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadLocalEnv()

function ok(message) {
  console.log(`OK   ${message}`)
}

function warn(message) {
  console.log(`WARN ${message}`)
}

function fail(message) {
  console.log(`FAIL ${message}`)
  failures++
}

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim()
}

function quoteCmdArg(value) {
  const text = String(value)
  if (/^[A-Za-z0-9._@/:=-]+$/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

function runNpm(args) {
  if (process.platform !== 'win32') return run('npm', args)

  const comSpec = process.env.ComSpec || 'cmd.exe'
  const command = ['npm', ...args].map(quoteCmdArg).join(' ')
  return run(comSpec, ['/d', '/s', '/c', command])
}

function packageAvailable(pkg) {
  const version = runNpm(['view', pkg, 'version'])
  return version
}

function hasFile(relPath) {
  return fs.existsSync(path.join(cwd, relPath))
}

let failures = 0

console.log('Presales Codex Doctor')
console.log(`cwd: ${cwd}`)
console.log('')

for (const relPath of [
  'AGENTS.md',
  '.mcp.json',
  'agents',
  '.agents/skills',
  'scripts',
  '.env.codex.example',
]) {
  if (hasFile(relPath)) ok(`${relPath} exists`)
  else fail(`${relPath} is missing`)
}

try {
  const branch = run('git', ['branch', '--show-current'])
  const remote = run('git', ['remote', 'get-url', 'origin'])
  ok(`git branch: ${branch || '(detached)'}`)
  ok(`git origin: ${remote}`)
} catch (error) {
  fail(`git metadata unavailable: ${error instanceof Error ? error.message : String(error)}`)
}

let mcpConfig = null
try {
  const raw = fs.readFileSync(path.join(cwd, '.mcp.json'), 'utf8')
  mcpConfig = JSON.parse(raw)
  const servers = Object.keys(mcpConfig.mcpServers || {})
  if (servers.length === 0) fail('.mcp.json has no mcpServers')
  else ok(`.mcp.json defines ${servers.length} MCP servers: ${servers.join(', ')}`)
} catch (error) {
  fail(`.mcp.json parse failed: ${error instanceof Error ? error.message : String(error)}`)
}

const envChecks = [
  ['GITHUB_PERSONAL_ACCESS_TOKEN', true],
  ['SUPABASE_ACCESS_TOKEN', true],
  ['CONTEXT7_API_KEY', false],
  ['TELEGRAM_BOT_TOKEN', false],
  ['TELEGRAM_CHAT_ID', false],
  ['TELEGRAM_ALLOWED_CHAT_IDS', false],
]

for (const [key, required] of envChecks) {
  if (process.env[key]) ok(`${key} is set`)
  else if (required) warn(`${key} is not set`)
  else warn(`${key} is optional and currently unset`)
}

try {
  const nodeVersion = run('node', ['-v'])
  const npmVersion = runNpm(['-v'])
  ok(`node ${nodeVersion}`)
  ok(`npm ${npmVersion}`)
} catch (error) {
  fail(`node/npm unavailable: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  const version = packageAvailable('@playwright/mcp')
  ok(`playwright MCP package resolved (${version})`)
} catch (error) {
  fail(`playwright MCP package check failed: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  const version = packageAvailable('@upstash/context7-mcp')
  ok(`context7 MCP package resolved (${version})`)
} catch (error) {
  fail(`context7 MCP package check failed: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  const version = packageAvailable('@modelcontextprotocol/server-github')
  ok(`github MCP package resolved (${version})`)
} catch (error) {
  fail(`github MCP package check failed: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  const version = packageAvailable('@modelcontextprotocol/server-filesystem')
  ok(`filesystem MCP package resolved (${version})`)
} catch (error) {
  fail(`filesystem MCP package check failed: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  const version = packageAvailable('@supabase/mcp-server-supabase')
  ok(`supabase MCP package resolved (${version})`)
} catch (error) {
  fail(`supabase MCP package check failed: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  const filesystemServer = mcpConfig?.mcpServers?.['filesystem-presales']
  const rootArg = filesystemServer?.args?.at(-1)
  if (!rootArg) fail('filesystem MCP root path is missing')
  else if (fs.existsSync(rootArg)) ok(`filesystem MCP root exists: ${rootArg}`)
  else fail(`filesystem MCP root does not exist: ${rootArg}`)
} catch (error) {
  fail(`filesystem MCP root check failed: ${error instanceof Error ? error.message : String(error)}`)
}

try {
  run('docker', ['--version'])
  ok('docker is available')
} catch {
  warn('docker is not installed; official github/github-mcp-server container path is unavailable on this machine')
}

console.log('')
if (failures > 0) {
  console.log(`Doctor completed with ${failures} failure(s).`)
  process.exitCode = 1
} else {
  console.log('Doctor completed without hard failures.')
}
