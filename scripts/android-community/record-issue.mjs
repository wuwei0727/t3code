import * as NodeFS from "node:fs";

const report = JSON.parse(NodeFS.readFileSync(process.argv[2], "utf8"));
const repository = process.env.GITHUB_REPOSITORY;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || repository === "pingdotgg/t3code")
  throw new Error("Invalid fork repository");
if (!report.changed) process.exit(0);
if (!/^android-beta-\d+$/.test(report.tag)) throw new Error("Invalid Android tag");
const title = `[Android community] ${report.tag}: source verification required`;
const api = async (suffix, method = "GET", data) => {
  const response = await fetch(`https://api.github.com/repos/${repository}/${suffix}`, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    headers: {
      authorization: `Bearer ${process.env.GH_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  if (!response.ok) throw new Error(`Issue API returned HTTP ${response.status}`);
  return response.json();
};
let existing;
let complete = false;
for (let page = 1; page <= 20; page++) {
  const issues = await api(`issues?state=all&per_page=100&page=${page}`);
  existing = issues.find((issue) => !issue.pull_request && issue.title === title);
  if (existing || issues.length < 100) {
    complete = true;
    break;
  }
}
if (!complete) throw new Error("Issue history scan exceeded limit; refusing duplicate creation");
const begin = "<!-- android-community-monitor:begin -->";
const end = "<!-- android-community-monitor:end -->";
const section = `${begin}\n检测到 Android Beta ${report.versionName} (${report.versionCode})。\n\n上游：${report.releaseUrl}\n\n镜像标签指向：\`${report.tagCommit}\`，**不是已核验的 APK 构建源码**。\n\n当前停止原因：${report.reason}\n\n先核验源码对应关系，再在 Community Android Baseline 中验证未修改源码。不要让 AI 解决合并冲突或改写认证逻辑。完成后人工更新维护状态文件。\n${end}`;
if (existing) {
  const body = existing.body ?? "";
  const start = body.indexOf(begin);
  const finish = body.indexOf(end, start);
  if (start < 0 || finish < 0)
    throw new Error(
      "Existing issue lacks automation markers; preserve manual content and review it",
    );
  const next = body.slice(0, start) + section + body.slice(finish + end.length);
  if (next !== body) await api(`issues/${existing.number}`, "PATCH", { body: next });
  console.log(existing.html_url);
} else console.log((await api("issues", "POST", { title, body: section })).html_url);
