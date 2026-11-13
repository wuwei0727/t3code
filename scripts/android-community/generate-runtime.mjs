import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { fingerprint, indexEntries, planTranslation, readJson } from "./catalog.mjs";

export function renderRuntimeCatalog(english, chinese, states) {
  planTranslation(english, chinese, states);
  const targets = indexEntries(chinese, "zh-CN");
  const history = indexEntries(states, "state");
  const sources = [...english].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  const translated = sources.filter((entry) => {
    const state = history.get(entry.id);
    return (
      state?.sourceHash === fingerprint(entry) &&
      state.status === "current" &&
      targets.has(entry.id)
    );
  });
  return `${JSON.stringify(
    {
      generatedBy: "scripts/android-community/generate-runtime.mjs",
      en: Object.fromEntries(sources.map(({ id, text }) => [id, text])),
      zhCN: Object.fromEntries(translated.map(({ id }) => [id, targets.get(id).text])),
    },
    null,
    2,
  )}\n`;
}

export function generateRuntimeCatalog(root = process.cwd(), check = true) {
  const catalog = NodePath.resolve(root, "community/android");
  const output = NodePath.resolve(root, "apps/mobile/src/i18n/messages.generated.json");
  const content = renderRuntimeCatalog(
    readJson(NodePath.resolve(catalog, "locales/en.json")),
    readJson(NodePath.resolve(catalog, "locales/zh-CN.json")),
    readJson(NodePath.resolve(catalog, "translation-state.json")),
  );
  const outputs = [
    [output, content],
    ...renderNativeResources(JSON.parse(content)).map(([path, text]) => [
      NodePath.resolve(root, path),
      text,
    ]),
  ];
  let changed = false;
  for (const [path, text] of outputs) {
    const current = NodeFS.existsSync(path)
      ? NodeFS.readFileSync(path, "utf8").replaceAll("\r\n", "\n")
      : null;
    if (current === text) continue;
    changed = true;
    if (check)
      throw new Error(
        "Runtime catalog differs; run node scripts/android-community/generate-runtime.mjs --write",
      );
    NodeFS.mkdirSync(NodePath.dirname(path), { recursive: true });
    NodeFS.writeFileSync(path, text);
  }
  return { mode: check ? "check" : "write", changed };
}

export function renderNativeResources(runtime) {
  const reviewEntries = [
    ["t3_review_comment_on", "nativeDiff.commentOn", ["range"]],
    ["t3_review_line", "nativeDiff.line", []],
    ["t3_review_comment", "nativeDiff.comment", []],
  ];
  const resourceGroups = [
    { module: "t3-review-diff", entries: reviewEntries },
    {
      module: "t3-agent-notifications",
      entries: [
        ["t3_notify_alerts", "nativeNotify.alerts", []],
        ["t3_notify_ongoing", "nativeNotify.ongoing", []],
        ["t3_notify_dismiss", "nativeNotify.dismiss", []],
        ["t3_notify_connecting", "nativeNotify.connecting", []],
        ["t3_notify_starting", "nativeNotify.starting", []],
        ["t3_notify_working", "nativeNotify.working", []],
        ["t3_notify_open", "nativeNotify.open", []],
        ["t3_notify_approval", "nativeNotify.approval", []],
        ["t3_notify_approval_needed", "nativeNotify.approvalNeeded", []],
        ["t3_notify_approve", "nativeNotify.approve", []],
        ["t3_notify_input", "nativeNotify.input", []],
        ["t3_notify_question", "nativeNotify.question", []],
        ["t3_notify_answer", "nativeNotify.answer", []],
        ["t3_notify_waiting", "nativeNotify.waiting", []],
        ["t3_notify_waiting_update", "nativeNotify.waitingUpdate", []],
        ["t3_notify_done", "nativeNotify.done", []],
        ["t3_notify_finished", "nativeNotify.finished", []],
        ["t3_notify_failed", "nativeNotify.failed", []],
        ["t3_notify_activity", "nativeNotify.activity", []],
        ["t3_notify_one_needs", "nativeNotify.oneNeeds", []],
        ["t3_notify_needs", "nativeNotify.needs", ["count"]],
        ["t3_notify_failed_count", "nativeNotify.failedCount", ["count"]],
        ["t3_notify_working_count", "nativeNotify.workingCount", ["count"]],
        ["t3_notify_finished_failed", "nativeNotify.finishedFailed", ["count"]],
        ["t3_notify_all_finished", "nativeNotify.allFinished", []],
        ["t3_notify_active", "nativeNotify.active", []],
        ["t3_notify_live", "nativeNotify.live", ["count"]],
        ["t3_notify_active_count", "nativeNotify.activeCount", ["count"]],
        ["t3_notify_thread_count", "nativeNotify.threadCount", ["count"]],
        ["t3_notify_agents_need", "nativeNotify.agentsNeed", ["count"]],
        ["t3_notify_agents_finished", "nativeNotify.agentsFinished", ["count"]],
      ],
    },
  ];
  const escape = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("'", "\\'")
      .replaceAll('"', '\\"');
  return resourceGroups.flatMap(({ module, entries }) =>
    [
      ["values", runtime.en],
      ["values-zh-rCN", { ...runtime.en, ...runtime.zhCN }],
    ].map(([folder, messages]) => [
      `apps/mobile/modules/${module}/android/src/main/res/${folder}/t3_community_strings.generated.xml`,
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${entries
        .map(([name, key, parameters]) => {
          if (typeof messages[key] !== "string") throw new Error(`Missing native resource ${key}`);
          let text = messages[key];
          for (const [index, parameter] of parameters.entries())
            text = text.replaceAll(`{{${parameter}}}`, `%${index + 1}$s`);
          return `    <string name="${name}">${escape(text)}</string>`;
        })
        .join("\n")}\n</resources>\n`,
    ]),
  );
}

if (
  process.argv[1] &&
  import.meta.url === NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href
) {
  const flags = process.argv.slice(2);
  if (flags.some((flag) => !["--check", "--write"].includes(flag)) || flags.length > 1)
    throw new Error("Use --check (default) or --write");
  console.log(
    JSON.stringify(generateRuntimeCatalog(process.cwd(), !flags.includes("--write")), null, 2),
  );
}
