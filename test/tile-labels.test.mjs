import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agentTileLabel } from '../src/world/plots.js'

// NOTE: `new Plot()` needs a browser canvas (deck textures), so the HQ-label
// anchor (labelAnchor === root cell) is verified by build + live-page check,
// not here. This file covers only the DOM-free label-text selection.

test('agent tile label uses the roster name, not the bare role', () => {
  // Eleven Marketing guides share the role "Website Brand Guide" — the role
  // alone would give eleven identical labels. The name stays distinct.
  assert.equal(
    agentTileLabel({ title: 'Marketing & Brand Team Bitstream Main Site Guide', agent_role: 'Website Brand Guide' }),
    'Marketing & Brand Team Bitstream Main Site Guide'
  )
  assert.equal(agentTileLabel({ title: '', name: 'Fallback Name', id: 'x' }), 'Fallback Name')
  assert.equal(agentTileLabel({ id: 'only-id' }), 'only-id')
})
