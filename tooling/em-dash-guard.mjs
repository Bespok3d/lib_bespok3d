// RULE ZERO guard: fail the gate if any authored file carries an em-dash or en-dash.
//
//   node <tooling>/em-dash-guard.mjs <path> [<path>...] [--suffix .ext]... [--name FILENAME]...
//
// Each repo runs this over its own trees and passes its own scope on the command line. The detection
// is identical everywhere, which is the point of one shared copy: five near-identical forks of this
// file had drifted into five different suffix lists. A path may be a directory (walked) or a single
// file (always read, whatever its suffix). Build output, dependencies, caches and git internals are
// skipped by directory name; inside a walked tree only authored text formats are read, by suffix.
// --suffix and --name ADD to the defaults, so a repo that authors something unusual (an extensionless
// init script) names it here instead of forking the guard. A path that does not exist is skipped, so
// a gate can name an optional tree without a conditional.
//
// The dash codepoints are written as escapes so the guard never trips on itself.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const EM_DASH = String.fromCharCode(0x2014)
const EN_DASH = String.fromCharCode(0x2013)
const DEFAULT_SUFFIXES = ['.ts', '.tsx', '.mjs', '.py', '.json', '.md', '.css', '.sh', '.toml', '.txt']
const EXCLUDED_DIRS = new Set([
  'node_modules', 'dist', 'out', 'app', 'assets', 'wheels', 'site-packages',
  '.venv', '.venv-tools', '.git', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.hypothesis',
  // The shared tooling arrives in each consuming repo as a git submodule mounted at lib_bespok3d/. Its
  // files are checked in their own repo, never again in every consumer that vendors them.
  'lib_bespok3d',
])

export function parseScope(argv) {
  const valuesOf = (flag) => argv.filter((arg, index) => argv[index - 1] === flag)
  const isFlagOrItsValue = (arg, index) => arg.startsWith('--') || String(argv[index - 1]).startsWith('--')

  return {
    paths: argv.filter((arg, index) => !isFlagOrItsValue(arg, index)),
    suffixes: new Set([...DEFAULT_SUFFIXES, ...valuesOf('--suffix')]),
    names: new Set(valuesOf('--name')),
  }
}

function isAuthored(fileName, scope) {
  return scope.suffixes.has(extname(fileName)) || scope.names.has(fileName)
}

function authoredFilesUnder(dir, scope) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (EXCLUDED_DIRS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return authoredFilesUnder(full, scope)

    return isAuthored(entry.name, scope) ? [full] : []
  })
}

export function scannedFiles(scope) {
  return scope.paths.filter((path) => existsSync(path)).flatMap((path) =>
    statSync(path).isDirectory() ? authoredFilesUnder(path, scope) : [path])
}

export function hasBannedDash(path) {
  const text = readFileSync(path, 'utf8')

  return text.includes(EM_DASH) || text.includes(EN_DASH)
}

function main(argv) {
  const scope = parseScope(argv)
  if (scope.paths.length === 0) {
    console.error('em-dash guard: name at least one path to scan')

    return 2
  }
  const offenders = scannedFiles(scope).filter(hasBannedDash)
  for (const path of offenders) {
    console.error(`RULE ZERO violation (em-dash/en-dash): ${relative(process.cwd(), path)}`)
  }

  return offenders.length > 0 ? 1 : 0
}

if (process.argv[1] && process.argv[1].endsWith('em-dash-guard.mjs')) {
  process.exit(main(process.argv.slice(2)))
}
