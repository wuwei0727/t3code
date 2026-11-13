import * as NodeTest from "node:test";
import * as NodeAssert from "node:assert/strict";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import {
  fingerprint,
  planTranslation,
  decodeTranslations,
  writeJson,
  validateText,
} from "./catalog.mjs";
import { runTranslation, translateBatch, translationEndpoint } from "./translate.mjs";
import { selectAndroidRelease, inspectUpstream } from "./upstream.mjs";
import { scanText } from "./scan.mjs";
import { preflight } from "./preflight.mjs";
import { renderNativeResources, renderRuntimeCatalog } from "./generate-runtime.mjs";
import { configureConnect, validateConnectExtra } from "./configure-connect.mjs";

NodeTest.test(
  "Connect build configuration preserves overrides, copies only public identifiers and rejects disabled APK metadata",
  (t) => {
    const { root } = fixture(t);
    const example = [
      "T3CODE_CLERK_PUBLISHABLE_KEY=pk_test_example",
      "T3CODE_CLERK_JWT_TEMPLATE=t3-relay",
      "T3CODE_CLERK_CLI_OAUTH_CLIENT_ID=public-client",
      "T3CODE_RELAY_URL=https://relay.example.com",
      "CLERK_SECRET_KEY=must-not-copy",
      "OPENAI_API_KEY=must-not-copy",
    ].join("\n");
    NodeFS.writeFileSync(NodePath.join(root, ".env.example"), example);
    NodeAssert.equal(configureConnect(root).created, true);
    const target = NodePath.join(root, ".env");
    const copied = NodeFS.readFileSync(target, "utf8");
    NodeAssert.ok(!copied.includes("must-not-copy"));
    NodeFS.writeFileSync(target, "T3CODE_RELAY_URL=https://my-relay.example.com\n");
    NodeAssert.equal(configureConnect(root).created, false);
    NodeAssert.equal(
      NodeFS.readFileSync(target, "utf8"),
      "T3CODE_RELAY_URL=https://my-relay.example.com\n",
    );
    for (const missing of [null, undefined, {}, "", " "]) {
      NodeAssert.throws(
        () => validateConnectExtra({ clerk: { publishableKey: missing } }),
        /missing/,
      );
    }
    NodeAssert.equal(
      validateConnectExtra({
        clerk: { publishableKey: "pk_test_example", jwtTemplate: "t3-relay" },
        relay: { url: "https://relay.example.com" },
      }).cloudPublicConfiguration,
      "present",
    );
  },
);

const source = {
  id: "thread.count.other",
  text: "{{count}} threads",
  context: "Thread list, plural other",
};
const budget = (maxCalls = 3) => ({
  calls: 0,
  reservedOutputTokens: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  usageComplete: true,
  maxCalls,
  maxOutputTokens: 6144,
});
const response = (text = "{{count}} 个会话") =>
  new Response(
    JSON.stringify({
      choices: [
        { message: { content: JSON.stringify({ translations: [{ id: source.id, text }] }) } },
      ],
      usage: { prompt_tokens: 42, completion_tokens: 8, total_tokens: 50 },
    }),
  );

function fixture(t) {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-community-test-"));
  t.after(() => {
    NodeAssert.ok(
      NodePath.resolve(root).startsWith(NodePath.resolve(NodeOS.tmpdir()) + NodePath.sep),
    );
    NodeFS.rmSync(root, { recursive: true });
  });
  const directory = NodePath.join(root, "community/android");
  NodeFS.mkdirSync(NodePath.join(directory, "locales"), { recursive: true });
  writeJson(NodePath.join(directory, "locales/en.json"), [source]);
  writeJson(NodePath.join(directory, "locales/zh-CN.json"), []);
  writeJson(NodePath.join(directory, "translation-state.json"), []);
  writeJson(NodePath.join(directory, "glossary.json"), []);
  writeJson(NodePath.join(directory, "translation-style.json"), {
    audience: "中国大陆开发者",
    rules: ["按界面语境表达，避免逐字直译"],
  });
  return { root, directory };
}

NodeTest.test(
  "unchanged source/context reuses reviewed translation; source/context changes mark it stale without scheduling AI",
  () => {
    const translated = [{ id: source.id, text: "{{count}} 个会话" }];
    const state = [
      {
        id: source.id,
        sourceHash: fingerprint(source),
        humanReviewed: true,
        origin: "manually-authored-community-draft",
      },
    ];
    NodeAssert.equal(planTranslation([source], translated, state).pending.length, 0);
    NodeAssert.equal(
      planTranslation([source], translated, state).states[0].origin,
      state[0].origin,
    );
    for (const change of [{ text: "{{count}} conversations" }, { context: "Another screen" }]) {
      const plan = planTranslation([{ ...source, ...change }], translated, state);
      NodeAssert.deepEqual(plan.stale, [source.id]);
      NodeAssert.equal(plan.states[0].status, "stale-reviewed");
      NodeAssert.equal(plan.states[0].sourceHash, state[0].sourceHash);
      NodeAssert.equal(plan.pending.length, 0);
    }
    NodeAssert.equal(planTranslation([source], [], state).pending.length, 0);
  },
);

NodeTest.test(
  "new and changed machine translations are pending; duplicate and orphan keys are reported",
  () => {
    NodeAssert.deepEqual(planTranslation([source], [], []).missing, [source.id]);
    const changed = planTranslation(
      [source],
      [{ id: source.id, text: "旧译文" }],
      [{ id: source.id, sourceHash: "old", humanReviewed: false }],
    );
    NodeAssert.equal(changed.pending.length, 1);
    NodeAssert.deepEqual(planTranslation([], [{ id: source.id, text: "旧译文" }], []).removed, [
      source.id,
    ]);
    NodeAssert.throws(() => planTranslation([source, source], [], []), /duplicate key/);
    NodeAssert.throws(
      () =>
        planTranslation(
          [source],
          [
            { id: source.id, text: "x" },
            { id: source.id, text: "x" },
          ],
          [],
        ),
      /duplicate key/,
    );
  },
);

NodeTest.test("model output is strictly JSON data with exact keys and preserved formatting", () => {
  const valid = { translations: [{ id: source.id, text: "{{count}} 个会话" }] };
  NodeAssert.equal(decodeTranslations(JSON.stringify(valid), [source])[0].text, "{{count}} 个会话");
  for (const content of [
    "process.exit(0)",
    "```json\n{}\n```",
    JSON.stringify({ ...valid, command: "echo injected" }),
    JSON.stringify({ translations: [...valid.translations, ...valid.translations] }),
    JSON.stringify({ translations: [{ id: source.id, text: "{{total}} 个会话" }] }),
    JSON.stringify({ translations: [{ id: "unknown", text: "x" }] }),
    JSON.stringify({ translations: [{ ...valid.translations[0], run: "echo injected" }] }),
  ])
    NodeAssert.throws(() => decodeTranslations(content, [source]));
  NodeAssert.throws(() =>
    validateText("[Help](https://example.com)\n**Help**", "[帮助](https://evil.example)\n**帮助**"),
  );
  NodeAssert.throws(() => validateText("First\nSecond", "第一 第二"));
  NodeAssert.throws(() => validateText("Run `t3 pair`", "运行 `t3 connect`"));
  NodeAssert.throws(() => validateText("[Help](https://example.com)", "帮助 https://example.com"));
  NodeAssert.throws(() => validateText("<b><i>Text</i></b>", "</b><i>文案</i><b>"));
  NodeAssert.throws(() => validateText("%s threads: {count}", "%d 个会话: {count}"));
  NodeAssert.throws(() => validateText("Row {n}: {content}", "第 {n} 行"));
  NodeAssert.throws(
    () => validateText("{count, plural, one {thread} other {threads}}", "会话"),
    /ICU/,
  );
});

NodeTest.test(
  "dry-run needs no API configuration, performs no request and writes no resources",
  async (t) => {
    const { root, directory } = fixture(t);
    const path = NodePath.join(directory, "translation-state.json");
    const before = NodeFS.readFileSync(path, "utf8");
    const report = await runTranslation({
      root,
      env: {},
      fetchImpl: () => NodeAssert.fail("API must not be called"),
    });
    NodeAssert.deepEqual(report.pending, [source.id]);
    NodeAssert.equal(report.usage.calls, 0);
    NodeAssert.equal(NodeFS.readFileSync(path, "utf8"), before);
    await NodeAssert.rejects(runTranslation({ root, check: true, env: {} }), /needs maintenance/);
  },
);

NodeTest.test(
  "apply records actual usage; repeat calls reuse resources and failed runs reuse validated cache",
  async (t) => {
    const { root, directory } = fixture(t);
    const inputs = [];
    const options = {
      root,
      apply: true,
      env: { TRANSLATION_MODEL: "user-selected-model", OPENAI_API_KEY: "test-only" },
      fetchImpl: async (_url, request) => {
        const input = JSON.parse(JSON.parse(request.body).messages[1].content);
        inputs.push(input);
        return response();
      },
    };
    const result = await runTranslation(options);
    NodeAssert.equal(result.usage.calls, 1);
    NodeAssert.equal(result.usage.totalTokens, 50);
    NodeAssert.equal(result.usage.cost, null);
    NodeAssert.deepEqual(
      inputs[0].styleGuide,
      JSON.parse(NodeFS.readFileSync(NodePath.join(directory, "translation-style.json"), "utf8")),
    );
    const noNetwork = async () => NodeAssert.fail("unchanged/cache hit must not call API");
    NodeAssert.equal((await runTranslation({ ...options, fetchImpl: noNetwork })).usage.calls, 0);
    writeJson(NodePath.join(directory, "locales/zh-CN.json"), []);
    NodeAssert.equal((await runTranslation({ ...options, fetchImpl: noNetwork })).usage.calls, 0);
    await runTranslation({ root, check: true, env: {} });
    const styleFile = NodePath.join(directory, "translation-style.json");
    writeJson(styleFile, { audience: "中国大陆开发者", rules: ["新的中文表达规范"] });
    // A style revision preserves existing text, but cannot reuse an older batch for missing text.
    NodeAssert.equal((await runTranslation({ ...options, fetchImpl: noNetwork })).usage.calls, 0);
    writeJson(NodePath.join(directory, "locales/zh-CN.json"), []);
    const revised = await runTranslation(options);
    NodeAssert.equal(revised.usage.calls, 1);
    NodeAssert.equal(revised.usage.totalTokens, 50);
    NodeAssert.deepEqual(inputs[1].styleGuide, JSON.parse(NodeFS.readFileSync(styleFile, "utf8")));
    NodeAssert.equal((await runTranslation({ ...options, fetchImpl: noNetwork })).usage.calls, 0);
  },
);

NodeTest.test(
  "apply leaves a stale human translation unchanged and check fails until manually reviewed",
  async (t) => {
    const { root, directory } = fixture(t);
    writeJson(NodePath.join(directory, "locales/zh-CN.json"), [
      { id: source.id, text: "保留人工译文" },
    ]);
    writeJson(NodePath.join(directory, "translation-state.json"), [
      { id: source.id, sourceHash: "old", humanReviewed: true },
    ]);
    const result = await runTranslation({
      root,
      apply: true,
      env: {},
      fetchImpl: () => NodeAssert.fail("human text must not be overwritten"),
    });
    NodeAssert.deepEqual(result.manualReviewRequired, [source.id]);
    NodeAssert.equal(
      JSON.parse(NodeFS.readFileSync(NodePath.join(directory, "locales/zh-CN.json"), "utf8"))[0]
        .text,
      "保留人工译文",
    );
    await NodeAssert.rejects(runTranslation({ root, check: true, env: {} }), /needs maintenance/);
  },
);

NodeTest.test(
  "rate-limit retries consume finite call and output budgets; errors hide server bodies and credentials",
  async () => {
    let calls = 0;
    const usage = budget(2);
    await NodeAssert.rejects(
      translateBatch([source], {
        model: "user-selected",
        apiKey: "test-secret",
        endpoint: "https://example.com/v1/chat/completions",
        glossary: [],
        budget: usage,
        fetchImpl: async () => {
          calls++;
          return new Response("test-secret server traceback", { status: 429 });
        },
        wait: async () => {},
      }),
      /budget exhausted/,
    );
    NodeAssert.equal(calls, 2);
    NodeAssert.equal(usage.reservedOutputTokens, 4096);
    NodeAssert.equal(usage.usageComplete, false);
    await NodeAssert.rejects(
      translateBatch([source], {
        model: "m",
        apiKey: "test-secret",
        endpoint: "https://example.com",
        glossary: [],
        budget: budget(),
        fetchImpl: async () => new Response("test-secret", { status: 401 }),
      }),
      /^Error: Translation API returned HTTP 401 \(body suppressed\)$/,
    );
    NodeAssert.throws(() => translationEndpoint("https://user:password@example.com/v1"));
    NodeAssert.throws(() => translationEndpoint("http://example.com/v1"));
  },
);

NodeTest.test(
  "Android release selection excludes desktop Latest, mutable aliases, drafts and unrelated prereleases",
  async () => {
    const beta = (code) => ({
      tag_name: `android-beta-${code}`,
      body: `Build: 2.3.0 (${code}).`,
      prerelease: true,
      draft: false,
    });
    const releases = [
      { tag_name: "v99.0.0", prerelease: false },
      { ...beta(99), draft: true },
      { tag_name: "android-beta", prerelease: true },
      beta(9),
      beta(10),
    ];
    NodeAssert.equal(selectAndroidRelease(releases).versionCode, 10);
    NodeAssert.throws(
      () => selectAndroidRelease([{ ...beta(10), body: "Build: 2.3.0 (11)." }]),
      /metadata changed/,
    );
    const sha = "a".repeat(40);
    const report = await inspectUpstream(
      {
        upstreamRepository: "pingdotgg/t3code",
        channel: "android-beta",
        latestObserved: { tag: "android-beta-10", tagCommit: sha },
      },
      async (url) =>
        new Response(
          JSON.stringify(
            url.includes("releases?") ? releases : { object: { type: "commit", sha } },
          ),
        ),
      null,
    );
    NodeAssert.equal(report.changed, false);
    NodeAssert.equal(report.sourceCommit, null);
    NodeAssert.equal(report.sourceProvenanceVerified, false);
    await NodeAssert.rejects(
      inspectUpstream({ upstreamRepository: "pingdotgg/t3code", channel: "production" }),
      /production mapping requires review/,
    );
  },
);

NodeTest.test(
  "inventory extracts candidates without modifying protocol fields or promising complete extraction",
  () => {
    const matches = scanText(
      "screen.tsx",
      '<Text>Threads</Text>\n<Button title="New thread" />\nconst packet = { model: "codex" };',
    );
    NodeAssert.deepEqual(
      matches.map((value) => value.text),
      ["Threads", "New thread"],
    );
    NodeAssert.equal(matches[1].line, 2);
    const expressions = scanText(
      "screen.tsx",
      '  <Button label={sharing ? "Opening attachment…" : "Open or share attachment"} />\n' +
        '  {count === 1 ? "One tab open" : `${count} tabs open`}\n' +
        '  <Button label={t(sharing ? "attachment.opening" : "attachment.open")} />',
    );
    NodeAssert.equal(expressions.length, 2);
    NodeAssert.ok(expressions.every((entry) => entry.kind === "ui-expression-review"));
    NodeAssert.match(expressions[0].text, /Opening attachment/);
    NodeAssert.match(expressions[1].text, /tabs open/);
  },
);

NodeTest.test(
  "preflight runs the installed vp Node entry without depending on shell command shims",
  (t) => {
    const { root } = fixture(t);
    writeJson(NodePath.join(root, "package.json"), {
      engines: { node: process.versions.node },
      packageManager: "pnpm@12.14.0",
    });
    NodeFS.mkdirSync(NodePath.join(root, "node_modules/vite-plus/bin"), { recursive: true });
    NodeFS.writeFileSync(
      NodePath.join(root, "node_modules/vite-plus/bin/vp"),
      'console.log("1.4.0");',
    );
    NodeFS.mkdirSync(NodePath.join(root, "apps/mobile/node_modules/expo/bin"), { recursive: true });
    NodeFS.writeFileSync(NodePath.join(root, "apps/mobile/node_modules/expo/bin/cli"), "");
    NodeAssert.deepEqual(preflight(root).blockers, []);
  },
);

NodeTest.test(
  "runtime catalog includes only fingerprint-matched translations and preserves source data as string literals",
  () => {
    const target = [{ id: source.id, text: "{{count}} 个会话" }];
    const state = [
      { id: source.id, sourceHash: fingerprint(source), humanReviewed: true, status: "current" },
    ];
    NodeAssert.match(renderRuntimeCatalog([source], target, state), /个会话/);
    NodeAssert.doesNotMatch(
      renderRuntimeCatalog([{ ...source, context: "Changed screen" }], target, state),
      /个会话/,
    );
    NodeAssert.doesNotMatch(renderRuntimeCatalog([source], target, []), /个会话/);
    NodeAssert.doesNotMatch(renderRuntimeCatalog([source], [], state), /个会话/);
    NodeAssert.throws(() => renderRuntimeCatalog([source, source], target, state), /duplicate key/);
    NodeAssert.throws(
      () => renderRuntimeCatalog([source], [{ id: source.id, text: "missing placeholder" }], state),
      /placeholders/,
    );
    const quoted = { ...source, text: 'Value "quoted"; `data`', context: "Example" };
    NodeAssert.ok(renderRuntimeCatalog([quoted], [], []).includes(JSON.stringify(quoted.text)));
    const native = renderNativeResources({
      en: {
        ...JSON.parse(
          NodeFS.readFileSync(
            new URL("../../apps/mobile/src/i18n/messages.generated.json", import.meta.url),
            "utf8",
          ),
        ).en,
        "nativeDiff.commentOn": 'Comment on {{range}} & <"code">',
        "nativeDiff.line": "line",
        "nativeDiff.comment": "Comment",
      },
      zhCN: { "nativeDiff.commentOn": "评论 {{range}}" },
    });
    NodeAssert.match(native[0][1], /%1\$s &amp; &lt;\\"code\\"&gt;/);
    NodeAssert.match(native[1][1], /评论 %1\$s/);
    NodeAssert.match(native[1][1], /name="t3_review_line">line</);
    NodeAssert.throws(() => renderNativeResources({ en: {}, zhCN: {} }), /Missing native resource/);
  },
);
