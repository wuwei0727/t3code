import {
  presentPendingBackgroundWork,
  presentProviderGoal,
} from "@t3tools/client-runtime/state/thread-execution";
import { childThreadInputsTitle } from "@t3tools/client-runtime/state/threads";
import { resolveSubagentPillSegment } from "@t3tools/client-runtime/state/thread-subagents";
import { makeTranslator, type UiTranslator } from "../../i18n/translator";
const english = makeTranslator("en");
const kinds = {
  subagent: "threadExecutionUi.subagent",
  command: "threadExecutionUi.command",
  monitor: "threadExecutionUi.monitor",
  background_task: "threadExecutionUi.task",
} as const;
export function localizedPendingBackgroundWork(
  tasks: Parameters<typeof presentPendingBackgroundWork>[0],
  t: UiTranslator,
) {
  const raw = presentPendingBackgroundWork(tasks);
  if (!raw || t("threadExecutionUi.goalSet") === english("threadExecutionUi.goalSet")) return raw;
  const items = raw.items.map((item) =>
    tasks.find((task) => task.taskId === item.taskId)?.description?.trim()
      ? item
      : { ...item, label: t(kinds[item.kind]) },
  );
  const named = /^(Waiting|Running) · (.*)$/.exec(raw.title);
  if (named)
    return {
      ...raw,
      items,
      title: t(named[1] === "Waiting" ? "threadExecutionUi.waiting" : "threadExecutionUi.running", {
        label: named[2]!,
      }),
    };
  const counts = new Map<keyof typeof kinds, number>();
  for (const item of raw.items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  const groups = [...counts].map(([kind, count]) =>
    raw.items.length === 1
      ? t(kinds[kind])
      : t("threadExecutionUi.count", { count, kind: t(kinds[kind]) }),
  );
  return {
    ...raw,
    items,
    title: t(raw.waiting ? "threadExecutionUi.waitingOn" : "threadExecutionUi.runningTasks", {
      tasks: groups.join("、"),
    }),
  };
}
const goalKeys = [
  "threadExecutionUi.goalSet",
  "threadExecutionUi.goalActive",
  "threadExecutionUi.goalPaused",
  "threadExecutionUi.goalBlocked",
  "threadExecutionUi.goalUsage",
  "threadExecutionUi.goalBudget",
  "threadExecutionUi.goalComplete",
] as const;
export function localizedProviderGoal(
  goal: Parameters<typeof presentProviderGoal>[0],
  working: boolean,
  t: UiTranslator,
) {
  const raw = presentProviderGoal(goal, working);
  const key = goalKeys.find((key) => english(key) === raw.title);
  return { ...raw, title: key ? t(key) : raw.title };
}
export function localizedChildInputsTitle(
  children: Parameters<typeof childThreadInputsTitle>[0],
  t: UiTranslator,
) {
  const raw = childThreadInputsTitle(children);
  if (t("threadExecutionUi.goalSet") === english("threadExecutionUi.goalSet")) return raw;
  const match =
    /^(?:(\d+) )?(Side chat|Subagent|side chats|subagents|threads) needs? (input|approval|you)$/.exec(
      raw,
    );
  if (!match) return raw;
  const kind = t(
    match[2]!.toLowerCase().startsWith("side chat")
      ? "threadExecutionUi.side"
      : match[2] === "threads"
        ? "threadExecutionUi.thread"
        : "threadExecutionUi.agent",
  );
  const need = t(
    match[3] === "input"
      ? "threadExecutionUi.input"
      : match[3] === "approval"
        ? "threadExecutionUi.approval"
        : "threadExecutionUi.you",
  );
  return match[1]
    ? t("threadExecutionUi.manyNeeds", { count: match[1], kind, need })
    : t("threadExecutionUi.needs", { kind, need });
}
export function localizedSubagentPill(
  turn: Parameters<typeof resolveSubagentPillSegment>[0],
  t: UiTranslator,
) {
  const raw = resolveSubagentPillSegment(turn);
  if (!raw || !turn || t("threadExecutionUi.goalSet") === english("threadExecutionUi.goalSet"))
    return raw;
  return turn.liveCount > 0
    ? {
        ...raw,
        accessibilityLabel: t("threadExecutionUi.workingAgents", {
          live: turn.liveCount,
          total: turn.subagents.length,
        }),
      }
    : {
        label: t("threadExecutionUi.done", { count: turn.settledCount }),
        accessibilityLabel: t("threadExecutionUi.doneAgents", { count: turn.settledCount }),
      };
}
