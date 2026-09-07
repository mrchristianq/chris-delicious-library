// Exercise the actual startup function with isolated feeds; never contact Sheets.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile(
  "page.tsx",
  fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
let startup;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "loadCsvSnapshot") startup = node;
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(startup, "Startup refresh function exists");
const code = ts.transpileModule(startup.getText(source), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText;

async function refresh({ failed, invalidEpisodes = false, cancelled = false, heldFeed, alreadyLoaded = false, native = false } = {}) {
  const state = { messages: [], states: [], timestamps: [], requests: [], timers: [], applied: [], loading: true, seeded: [] };
  let releaseFeed;
  const held = new Promise((resolve) => { releaseFeed = resolve; });
  const context = {
    cancelled,
    isNativeApp: native,
    console: { log() {}, warn() {} },
    tvCsvUrl: "TV", booksCsvUrl: "Books", moviesCsvUrl: "Movies",
    gamesCsvUrl: "Games", settingsCsvUrl: "Settings", tvEpisodesCsvUrl: "TV Episodes",
    fetchCsv: async (name) => {
      state.requests.push(name);
      if (name === heldFeed) await held;
      if (name === failed) throw new Error("Test feed unavailable");
      return name === "TV Episodes" && invalidEpisodes
        ? []
        : [{ Title: "Fixture", ShowTitle: "Fixture", Watched: "TRUE" }];
    },
    safeStr: (value) => String(value ?? "").trim(),
    dedupeTvEpisodeRows: (rows) => rows,
    hasTvEpisodeProgressSnapshot: (rows) => rows.length > 0,
    tvEpisodeRowsRef: { current: [{ ShowTitle: "Retained episode", Watched: "TRUE" }] },
    webHardRefreshFollowupRef: { current: false },
    webInitialFollowupRefreshStartedRef: { current: false },
    webHasLoadedSnapshotRef: { current: alreadyLoaded },
    setWebCoreSnapshotReady: (value) => { state.coreReady = value; },
    nativeSeedSnapshot: async (snapshot) => { state.seeded.push(snapshot); },
    nativeSyncAfterRemoteRefreshRef: { current: false },
    setSyncState: (value) => state.states.push(value),
    setSyncMsg: (value) => state.messages.push(value),
    setLastSyncAt: (value) => state.timestamps.push(value),
    setLoading: (value) => { state.loading = value; },
    setTimeout: (callback, delay) => { state.timers.push({ callback, delay }); return 1; },
    webFollowupRefreshTimer: undefined,
  };
  for (const setter of ["setTvRows", "setBookRows", "setMovieRows", "setGameRows",
    "setSettingsRows", "setTvEpisodeRows", "setTvEpisodeDataStatus", "setError", "setRefreshNonce"]) {
    context[setter] = () => { state.applied.push(setter); };
  }
  vm.runInNewContext(code + "\nloadCsvSnapshot();", context);
  await new Promise(setImmediate);
  state.release = async () => { releaseFeed(); await new Promise(setImmediate); };
  state.cancel = () => { context.cancelled = true; };
  return state;
}

test("all fresh feeds succeed and the freshness follow-up remains enabled", async () => {
  const result = await refresh();
  assert.equal(result.requests.length, 6);
  assert.deepEqual(result.states, ["ok"]);
  assert.deepEqual(result.messages, ["Synced"]);
  assert.equal(result.timestamps.length, 1);
  assert.equal(result.loading, false);
  assert.equal(result.timers[0].delay, 2500);
});

for (const feed of ["TV", "Books", "Movies", "Games", "Settings", "TV Episodes"]) {
  test(`a failed ${feed} feed cannot report a successful sync`, async () => {
    const result = await refresh({ failed: feed });
    assert.deepEqual(result.states, ["error"]);
    assert.ok(result.messages[0].includes(feed));
    assert.equal(result.timestamps.length, 0);
    assert.equal(result.loading, false);
  });
}

test("retained episode progress is not mislabeled as freshly synced", async () => {
  const result = await refresh({ invalidEpisodes: true });
  assert.deepEqual(result.states, ["error"]);
  assert.match(result.messages[0], /TV Episodes/);
  assert.equal(result.timestamps.length, 0);
});

test("cancelled refresh cannot publish a result", async () => {
  const result = await refresh({ cancelled: true });
  assert.deepEqual(result.states, []);
  assert.deepEqual(result.timestamps, []);
});

test("slow episode feed does not block fresh core data, but TV and sync completion wait", async () => {
  const result = await refresh({ heldFeed: "TV Episodes" });
  assert.equal(result.requests.length, 6, "all feeds start without a waterfall");
  assert.equal(result.coreReady, true);
  for (const setter of ["setBookRows", "setMovieRows", "setGameRows", "setSettingsRows"]) {
    assert.ok(result.applied.includes(setter), setter);
  }
  assert.ok(!result.applied.includes("setTvRows"));
  assert.equal(result.loading, true);
  assert.equal(result.timestamps.length, 0);
  assert.equal(result.states.length, 0);
  await result.release();
  assert.ok(result.applied.includes("setTvRows"));
  assert.ok(result.applied.includes("setTvEpisodeRows"));
  assert.deepEqual(result.states, ["ok"]);
});

test("settings must settle before the core library is revealed", async () => {
  const result = await refresh({ heldFeed: "Settings" });
  assert.equal(result.coreReady, undefined);
  assert.equal(result.applied.length, 0);
  await result.release();
  assert.equal(result.coreReady, true);
  assert.deepEqual(result.states, ["ok"]);
});

test("later refreshes retain the existing all-feed snapshot behavior", async () => {
  const result = await refresh({ heldFeed: "TV Episodes", alreadyLoaded: true });
  assert.equal(result.applied.length, 0);
  assert.equal(result.coreReady, undefined);
  await result.release();
  assert.ok(result.applied.includes("setBookRows"));
  assert.deepEqual(result.states, ["ok"]);
});

test("native seeding waits for every feed and includes episode rows", async () => {
  const result = await refresh({ heldFeed: "TV Episodes", native: true });
  assert.equal(result.applied.length, 0);
  assert.equal(result.seeded.length, 0);
  await result.release();
  assert.equal(result.seeded.length, 1);
  assert.equal(result.seeded[0].tvEpisodeRows.length, 1);
  assert.equal(result.coreReady, undefined);
});

test("cancellation during partial loading cannot publish late episodes", async () => {
  const result = await refresh({ heldFeed: "TV Episodes" });
  result.cancel();
  await result.release();
  assert.ok(!result.applied.includes("setTvRows"));
  assert.ok(!result.applied.includes("setTvEpisodeRows"));
  assert.equal(result.timestamps.length, 0);
  assert.equal(result.states.length, 0);
});

test("failed episode check cannot expose TV with retained progress on first load", async () => {
  const result = await refresh({ failed: "TV Episodes" });
  assert.ok(!result.applied.includes("setTvRows"));
  assert.ok(result.applied.includes("setError"));
  assert.deepEqual(result.states, ["error"]);
});
