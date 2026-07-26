#!/usr/bin/env node
// Enforces the workspace dependency policy for this pnpm workspace:
//
//   1. Every `@strengthsync/*` dependency must use the `workspace:` protocol
//      and resolve to a package that actually exists in the workspace.
//   2. Every external dependency declared through `catalog:` must resolve to
//      a version defined in the pnpm-workspace.yaml catalog.
//   3. Every external dependency used by more than one workspace package
//      must be centralized in the catalog (`catalog:`), not copy-pasted as a
//      version literal — this is what prevents version drift and diamond
//      dependencies as the workspace grows.
//
// Usage: node scripts/check-dependency-policy.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Resolve the simple `dir/*` globs used by this workspace's pnpm-workspace.yaml. */
function findWorkspacePackageDirs(packageGlobs) {
  const dirs = []
  for (const glob of packageGlobs) {
    const match = /^(.+)\/\*$/.exec(glob)
    if (!match) {
      throw new Error(`Unsupported workspace glob "${glob}"; this checker only supports "dir/*" globs.`)
    }
    const base = join(ROOT, match[1])
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory()) dirs.push(join(base, entry.name))
    }
  }
  return dirs
}

function checkWorkspaceDependency(pkgName, field, depName, version, knownNames, errors) {
  if (!knownNames.has(depName)) {
    errors.push(`${pkgName}: ${field}.${depName} does not match a known workspace package`)
    return
  }
  if (!version.startsWith('workspace:')) {
    errors.push(`${pkgName}: ${field}.${depName} must use the workspace: protocol (found "${version}")`)
  }
}

function checkCatalogReference(pkgName, field, depName, version, catalog, errors) {
  const catalogName = version === 'catalog:' ? 'default' : version.slice('catalog:'.length)
  if (catalogName !== 'default') {
    errors.push(`${pkgName}: ${field}.${depName} references unknown named catalog "${catalogName}"`)
    return
  }
  if (!(depName in catalog)) {
    errors.push(
      `${pkgName}: ${field}.${depName} uses catalog: but "${depName}" is not defined in the pnpm-workspace.yaml catalog`,
    )
  }
}

function collectExternalUsage(packages) {
  const usage = new Map() // depName -> Map(versionLiteral -> [pkgName, ...])
  for (const { json } of packages) {
    for (const field of DEPENDENCY_FIELDS) {
      const deps = json[field]
      if (!deps) continue
      for (const [depName, version] of Object.entries(deps)) {
        if (depName.startsWith('@strengthsync/') || version.startsWith('catalog:')) continue
        if (!usage.has(depName)) usage.set(depName, new Map())
        const versions = usage.get(depName)
        if (!versions.has(version)) versions.set(version, [])
        versions.get(version).push(json.name)
      }
    }
  }
  return usage
}

function checkExternalUsage(usage, catalog, errors) {
  for (const [depName, versions] of usage) {
    const usedBy = [...versions.values()].flat()

    if (depName in catalog) {
      errors.push(
        `"${depName}" is defined in the pnpm catalog but referenced with a raw version in: ${usedBy.join(', ')}. Use "catalog:" instead.`,
      )
      continue
    }

    if (usedBy.length <= 1) continue

    if (versions.size > 1) {
      const detail = [...versions.entries()].map(([v, pkgs]) => `${v} (${pkgs.join(', ')})`).join('; ')
      errors.push(`"${depName}" has drifted versions across workspace packages: ${detail}. Add it to the pnpm catalog.`)
    } else {
      errors.push(
        `"${depName}" is used by multiple workspace packages (${usedBy.join(', ')}) but is not centralized in the pnpm catalog.`,
      )
    }
  }
}

function main() {
  const workspaceYaml = parse(readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8'))
  const catalog = workspaceYaml.catalog ?? {}
  const packageDirs = findWorkspacePackageDirs(workspaceYaml.packages ?? [])
  const packages = packageDirs.map((dir) => ({ dir, json: readJson(join(dir, 'package.json')) }))
  const knownNames = new Set(packages.map(({ json }) => json.name))

  const errors = []
  for (const { json } of packages) {
    for (const field of DEPENDENCY_FIELDS) {
      const deps = json[field]
      if (!deps) continue
      for (const [depName, version] of Object.entries(deps)) {
        if (depName.startsWith('@strengthsync/')) {
          checkWorkspaceDependency(json.name, field, depName, version, knownNames, errors)
        } else if (version.startsWith('catalog:')) {
          checkCatalogReference(json.name, field, depName, version, catalog, errors)
        }
      }
    }
  }
  checkExternalUsage(collectExternalUsage(packages), catalog, errors)

  if (errors.length > 0) {
    console.error('Dependency policy violations:\n')
    for (const error of errors) console.error(`  - ${error}`)
    console.error(`\n${errors.length} violation(s) found.`)
    process.exit(1)
  }

  console.log(
    `Dependency policy OK (${packages.length} workspace packages, ${Object.keys(catalog).length} catalog entries).`,
  )
}

main()
