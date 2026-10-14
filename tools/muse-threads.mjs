#!/usr/bin/env node
/**
 * Static-hosting companion to the Muse harness adapter.
 *
 * The Bot Crossing server scans harness files on a poll and serves /api/threads.
 * On static hosting (GitHub Pages) there is no server, so this script plays that
 * role: it runs the Muse adapter against the runtime-written snapshot and emits
 * the exact JSON the static client fetches as threads.json.
 *
 * Usage:
 *   node tools/muse-threads.mjs [--out docs/threads.json] [--seed-state docs/state.json]
 *
 * The refresh job (see the bot-crossing-sync runbook) runs this after rewriting
 * data/muse-snapshot.json, then pushes the changed threads.json.
 *
 * state.json is seeded ONCE (empty colony state, version 2). It is never
 * overwritten: on static hosting the browser persists archives/layout to
 * localStorage, and state.json is only the first-run seed.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import muse from '../server/harnesses/muse.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.join(here, '..')

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const outPath = path.resolve(repo, flag('--out', 'docs/threads.json'))
const statePath = path.resolve(repo, flag('--seed-state', 'docs/state.json'))

const detected = await muse.detect()
const threads = detected ? await muse.scanThreads() : []
const payload = { threads, scannedAt: Date.now(), warnings: [] }

await fsp.mkdir(path.dirname(outPath), { recursive: true })
await fsp.writeFile(outPath, JSON.stringify(payload, null, 2))
console.log(`wrote ${threads.length} Muse thread(s) → ${outPath}`)

try {
  await fsp.access(statePath)
  console.log(`state seed already exists, left alone → ${statePath}`)
} catch {
  await fsp.mkdir(path.dirname(statePath), { recursive: true })
  await fsp.writeFile(
    statePath,
    JSON.stringify(
      {
        version: 2,
        archived: [],
        archivedAt: {},
        opened: [],
        plots: {},
        seen: {},
        hiddenProjects: [],
        viewedAt: {},
        settings: null,
        updatedAt: 0,
      },
      null,
      2
    )
  )
  console.log(`seeded empty colony state → ${statePath}`)
}
