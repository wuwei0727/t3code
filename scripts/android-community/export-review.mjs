import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { readJson, planTranslation } from "./catalog.mjs";

const directory = "community/android";
const english = readJson(NodePath.join(directory, "locales/en.json"));
const chinese = readJson(NodePath.join(directory, "locales/zh-CN.json"));
const plan = planTranslation(
  english,
  chinese,
  readJson(NodePath.join(directory, "translation-state.json")),
);
const targets = new Map(chinese.map((entry) => [entry.id, entry.text]));
const states = new Map(plan.states.map((entry) => [entry.id, entry]));
const output = process.argv[2] || ".t3/translation-review";
const rows = english.map((entry) => {
  const state = states.get(entry.id);
  const status = plan.missing.includes(entry.id)
    ? "缺少译文"
    : plan.stale.includes(entry.id)
      ? "原文或上下文已变更，待审校"
      : state.humanReviewed
        ? "已由维护者确认"
        : "待维护者确认";
  return [entry.id, entry.text, targets.get(entry.id) ?? "", entry.context, status];
});
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "&#124;")
    .replaceAll("\r", "")
    .replaceAll("\n", "<br>");
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
NodeFS.mkdirSync(output, { recursive: true });
const markdown = NodePath.join(output, "translation-review.zh-CN.md");
const csv = NodePath.join(output, "translation-review.zh-CN.csv");
const headers = ["Key", "英文原文", "当前中文", "界面语境", "审核状态"];
NodeFS.writeFileSync(
  markdown,
  `# 当前中英文翻译对照\n\n共 ${rows.length} 条界面资源，不代表全应用汉化率。中文规范见 community/android/translation-style.json；正式修改请编辑 locales/zh-CN.json 中相同 id 的 text，并重新生成运行资源。代理审校不等于维护者确认。\n\n| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.map(escape).join(" | ")} |`).join("\n")}\n`,
);
NodeFS.writeFileSync(
  csv,
  "\uFEFF" +
    [[...headers, "建议中文"], ...rows.map((row) => [...row, ""])]
      .map((row) => row.map(quote).join(","))
      .join("\r\n") +
    "\r\n",
);
console.log(JSON.stringify({ entries: rows.length, markdown, csv }));
