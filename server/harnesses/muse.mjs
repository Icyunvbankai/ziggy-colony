/**
 * Muse harness adapter.
 *
 * Muse (Meta's personal agent) has no local transcript files for this colony to read —
 * its activity lives in the Muse runtime. So instead of scanning a session directory,
 * this adapter reads a snapshot file the runtime writes: a factual dump of live work
 * (the main conversation, running subagents, scheduled jobs) plus their real status
 * signals. The adapter owns the presentation mapping (project zones, building size);
 * the snapshot itself carries only facts.
 *
 * Snapshot schema (written by the runtime, see tools/muse-threads.mjs):
 *   { generatedAt: <epoch ms>, items: [{
 *     kind: 'cron' | 'subagent' | 'main',
 *     id: <stable id>, title, preview,
 *     createdAt, lastActivityAt, running,
 *     lastRunStatus: 'ok' | 'failed' | '', runs: <completed-run count>,
 *     subagents: [{ id, task, lastActivityAt }] }] }
 *
 * Everything else follows the adapter contract in server/harnesses/README.md:
 * read-only, malformed snapshot → empty list (never throw the scan away), and no
 * deep link — Muse threads live in the Muse app, so Open is honestly unavailable.
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const SNAPSHOT =
  process.env.BOT_CROSSING_MUSE_SNAPSHOT || path.join(here, '..', '..', 'data', 'muse-snapshot.json')

async function readSnapshot() {
  try {
    const raw = JSON.parse(await fsp.readFile(SNAPSHOT, 'utf8'))
    const items = Array.isArray(raw?.items) ? raw.items : []
    return { items, generatedAt: Number(raw?.generatedAt) || 0 }
  } catch {
    // Missing or half-written snapshot (the runtime writes it on a timer) — skip the
    // pass rather than failing the whole scan.
    return { items: [], generatedAt: 0 }
  }
}

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
const str = (v) => (typeof v === 'string' ? v : '')

/**
 * Workstream → hex zone. First match wins, so specific rules come before general ones.
 * A Muse "project" is a workstream (Bitstream Podcast, ALTS AM, …), not a repo folder —
 * it still claims a hex zone, exactly like a repo does.
 */
const PROJECT_RULES = [
  [/team:social-/i, 'Social'],
  [/team:github-team/i, 'GitHub Team'],
  [/alts/i, 'ALTS AM'],
  [/glitchmobz|clips/i, 'GlitchMobz Clips'],
  [/sunshine|aceloco|instagram|drip/i, 'Instagram Drips'],
  [/giveaway|terp/i, 'Terp Giveaway'],
  [/prompt-pack/i, 'Prompt Packs'],
  [/site-ads|hourly-ad|ad-drip|\bads\b/i, 'Ads'],
  [/zona/i, 'ZONA'],
  [/tiktok/i, 'TikTok Shop'],
  [/commission|whatsapp|shop/i, 'Shop'],
  [/colony|bot-crossing/i, 'Colony'],
  [/bar-exam|bitstream|podcast|w-news|news/i, 'Bitstream Podcast'],
  [/grant/i, 'Grants'],
  [/honda|navi/i, 'Honda Navi Watch'],
  [/basel|ticket/i, 'Basel Tickets'],
  [/aws|key-rotation|secret|hygiene/i, 'Operations'],
  [/transcribeme/i, 'TranscribeMe'],
  [/fiverr|etsy/i, 'Fiverr + Etsy'],
]

const projectFor = (item) => {
  const hay = `${item.id || ''} ${item.title || ''}`
  for (const [re, project] of PROJECT_RULES) if (re.test(hay)) return project
  return 'Operations'
}

export default {
  id: 'muse',
  name: 'Muse',

  detect: async () => {
    try {
      await fsp.access(SNAPSHOT)
      return true
    } catch {
      return false
    }
  },

  scanThreads: async () => {
    const { items } = await readSnapshot()
    return items
      .filter((item) => item && typeof item.id === 'string' && item.id)
      .map((item) => {
        const now = Date.now()
        // No observed activity: treat as dormant (4 days quiet) so the colony's
        // own sleep rule puts the bot down instead of showing it as just-active.
        const lastActivityAt = item.lastActivityAt ? num(item.lastActivityAt, now) : now - 4 * 24 * 3600 * 1000
        const failed = item.lastRunStatus === 'failed'
        const runs = num(item.runs, 0)
        return {
          id: `muse:${item.id}`,
          title: str(item.title) || 'Untitled thread',
          preview: str(item.preview),
          project: projectFor(item),
          projectPath: '',
          worktree: '',
          cwd: '',
          gitBranch: '',
          model: 'Muse Spark',
          effort: '',
          createdAt: num(item.createdAt, lastActivityAt),
          lastActivityAt,
          lastFocusedAt: 0,
          running: Boolean(item.running),
          // A failed last run is the colony's `?`: something here wants a look.
          unread: failed,
          hasError: failed,
          starred: false,
          routine: false,
          prState: '',
          archived: false,
          // Building size is a visual proxy for real completed-work counts, never
          // a made-up number: long-running jobs have bigger buildings.
          sizeBytes: item.kind === 'main' ? 20000 : 2000 + Math.min(runs, 200) * 1500,
          source: str(item.kind) || 'muse',
          canOpen: false,
          subagents: Array.isArray(item.subagents)
            ? item.subagents
                .filter((s) => s && typeof s.id === 'string')
                .map((s) => ({ id: s.id, task: str(s.task), lastActivityAt: num(s.lastActivityAt, now) }))
            : [],
          ref: { kind: str(item.kind) || 'muse', id: item.id },
        }
      })
  },

  openThread: () => ({
    ok: false,
    error: 'Muse threads live in the Muse app — this colony is a viewer.',
  }),

  newSession: () => ({
    ok: false,
    error: 'New Muse threads start in the Muse app.',
  }),
}
