// The runtime tripwire (docs/app/ddd.md §2 and §7.4): webappTest sets
// EGR_EXPECTED_NODE from the plugin's node.version, so a run on any
// other runtime, or outside Gradle with the variable unset, fails.
import assert from "node:assert/strict";
import { test } from "node:test";

test("runs on the pinned Node.js runtime", () => {
  const expected = process.env.EGR_EXPECTED_NODE;
  assert.notEqual(expected, undefined, "EGR_EXPECTED_NODE is unset");
  assert.equal(process.version, `v${expected}`);
});
