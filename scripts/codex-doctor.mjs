#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const cwd = process.cwd()

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

function run(cmd, args) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function packageAvailable(pkg) {
  const version = run('npm', ['view', pkg, 'version'])
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
]

for (const [key, required] of envChecks) {
  if (process.env[key]) ok(`${key} is set`)
  else if (required) warn(`${key} is not set`)
  else warn(`${key} is optional and currently unset`)
}

try {
  const nodeVersion = run('node', ['-v'])
  const npmVersion = run('npm', ['-v'])
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
  const version = packageAvailable('@supabase/mcp-server-supabase')
  ok(`supabase MCP package resolved (${version})`)
} catch (error) {
  fail(`supabase MCP package check failed: ${error instanceof Error ? error.message : String(error)}`)
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
