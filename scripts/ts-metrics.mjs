#!/usr/bin/env node
// TypeScript scaling diagnostics for this workspace, wrapping tsc's built-in
// diagnostic flags documented in the TypeScript performance guide, applied
// through the project references already declared in tsconfig.json /
// tsconfig.base.json and each package's own tsconfig.json.
//
// Usage:
//   node scripts/ts-metrics.mjs diagnostics
//   node scripts/ts-metrics.mjs list-files <workspace>
//   node scripts/ts-metrics.mjs explain-files <workspace>
//   node scripts/ts-metrics.mjs trace <workspace>
//
// <workspace> accepts either the full package name (@strengthsync/api) or
// its short form (api, ui, workflows, domain, agent, db).
//
// See docs/architecture/typescript_metrics.md for how to read the output.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const TSC = join(ROOT, 'node_modules/.bin/tsc')
const DIAGNOSTICS_DIR = join(ROOT, '.diagnostics')
const WORKSPACE_GROUPS = ['apps', 'services']

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Map both the full package name and its directory name to { dir, name }. */
function findWorkspaces() {
  const workspaces = new Map()
  for (const group of WORKSPACE_GROUPS) {
    const base = join(ROOT, group)
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const dir = join(base, entry.name)
      const pkgPath = join(dir, 'package.json')
      if (!existsSync(pkgPath)) continue
      const { name } = readJson(pkgPath)
      workspaces.set(name, { dir, name })
      workspaces.set(entry.name, { dir, name })
    }
  }
  return workspaces
}

function resolveWorkspace(arg) {
  const workspaces = findWorkspaces()
  const workspace = workspaces.get(arg)
  if (!workspace) {
    const names = [...new Set([...workspaces.values()].map((w) => w.name))].sort()
    throw new Error(`Unknown workspace "${arg ?? ''}". Known workspaces:\n  ${names.join('\n  ')}`)
  }
  return workspace
}

function shortName(fullName) {
  return fullName.replace('@strengthsync/', '')
}

function runTsc(args, options = {}) {
  console.log(`$ tsc ${args.join(' ')}`)
  return execFileSync(TSC, args, { cwd: ROOT, stdio: options.capture ? 'pipe' : 'inherit', encoding: 'utf8' })
}

function clearBuildInfo() {
  for (const group of WORKSPACE_GROUPS) {
    const base = join(ROOT, group)
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const buildInfo = join(base, entry.name, 'tsconfig.tsbuildinfo')
      if (existsSync(buildInfo)) rmSync(buildInfo)
    }
  }
}

/**
 * Full solution build (`tsc -b tsconfig.json`) with `--extendedDiagnostics`.
 * Clears every package's `.tsbuildinfo` first so the numbers reflect a real
 * cold build across all six project-reference packages, not an
 * already-up-to-date no-op.
 */
function diagnostics() {
  clearBuildInfo()
  runTsc(['-b', 'tsconfig.json', '--extendedDiagnostics'])
}

/** `--listFilesOnly` for one package: every file tsc pulled into its program. */
function listFiles(workspaceArg) {
  const { dir, name } = resolveWorkspace(workspaceArg)
  console.log(`# Files included in ${name}'s program`)
  runTsc(['-p', join(dir, 'tsconfig.json'), '--listFilesOnly'])
}

/** `--explainFiles` for one package, saved to .diagnostics/ (why each file was pulled in). */
function explainFiles(workspaceArg) {
  const { dir, name } = resolveWorkspace(workspaceArg)
  mkdirSync(DIAGNOSTICS_DIR, { recursive: true })
  const outFile = join(DIAGNOSTICS_DIR, `${shortName(name)}.explain-files.txt`)
  const output = runTsc(['-p', join(dir, 'tsconfig.json'), '--explainFiles'], { capture: true })
  writeFileSync(outFile, output)
  console.log(`Wrote ${outFile}`)
}

/** `--generateTrace` for one package: a Chrome-DevTools-compatible trace under .diagnostics/. */
function trace(workspaceArg) {
  const { dir, name } = resolveWorkspace(workspaceArg)
  const traceDir = join(DIAGNOSTICS_DIR, `${shortName(name)}.trace`)
  rmSync(traceDir, { recursive: true, force: true })
  runTsc(['-p', join(dir, 'tsconfig.json'), '--generateTrace', traceDir])
  console.log(`Wrote ${traceDir}/trace.json — open in chrome://tracing or https://ui.perfetto.dev`)
}

function main() {
  const [command, arg] = process.argv.slice(2)
  const commandsNeedingWorkspace = { 'list-files': listFiles, 'explain-files': explainFiles, trace }

  if (command === 'diagnostics') return diagnostics()
  if (command in commandsNeedingWorkspace) return commandsNeedingWorkspace[command](arg)

  console.error('Usage: node scripts/ts-metrics.mjs <diagnostics|list-files|explain-files|trace> [workspace]')
  process.exit(1)
}

try {
  main()
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
