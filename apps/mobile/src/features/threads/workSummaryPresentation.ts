import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import { summaryNouns, summaryVerbs } from "./workSummaryCatalog";

const verbs = Object.keys(summaryVerbs).sort(
  (a, b) => b.length - a.length,
) as (keyof typeof summaryVerbs)[];
const english = makeTranslator("en");
export function workSummaryDisplay(t: UiTranslator) {
  if (t("workLogExtra.thought") === english("workLogExtra.thought")) return undefined;
  return {
    label: (label: string) => localizeGeneratedWorkSummary(label, t),
    sources: (names: ReadonlyArray<string>, integrations: boolean) =>
      t(
        integrations
          ? names.length === 1
            ? "workSummaryUi.integration"
            : "workSummaryUi.integrations"
          : "workSummaryUi.source",
        { names: names.join("、") },
      ),
    join: (labels: ReadonlyArray<string>) => labels.join("；"),
  };
}
export function localizeGeneratedWorkSummary(text: string, t: UiTranslator): string {
  if (t("workLogExtra.thought") === english("workLogExtra.thought")) return text;
  if (text === "Thought" || text === "Thinking")
    return t(text === "Thought" ? "workLogExtra.thought" : "workLogExtra.thinking");
  const thought = /^Thought \(×(\d+)\)$/.exec(text);
  if (thought) return t("workSummaryUi.thought", { count: thought[1]! });
  const trying = text.startsWith("Tried to ");
  const source = trying ? text.slice(9) : text;
  const verb = verbs.find((verb) =>
    source.startsWith(`${trying ? summaryVerbs[verb].inf : verb} `),
  );
  if (!verb) return text;
  const prefix = trying ? summaryVerbs[verb].inf : verb;
  const object = translateObject(source.slice(prefix.length + 1), t);
  if (object === null) return text;
  const action = t(summaryVerbs[verb].key, { object });
  return trying ? t("workSummaryUi.trying", { action }) : action;
}

function translateObject(text: string, t: UiTranslator): string | null {
  const failed = /^(.*), (\d+) failed$/.exec(text);
  if (failed) {
    const object = translateObject(failed[1]!, t);
    return object === null ? null : t("workSummaryUi.failed", { object, count: failed[2]! });
  }
  const times = /^(.*) (\d+) times?$/.exec(text);
  if (times) {
    const object = translateObject(times[1]!, t);
    return object === null ? null : t("workSummaryUi.times", { object, count: times[2]! });
  }
  const to = text.indexOf(" to ");
  if (to !== -1) {
    const object = translateObject(text.slice(0, to), t);
    const target = translateObject(text.slice(to + 4), t);
    return object === null || target === null ? null : t("workSummaryUi.to", { object, target });
  }
  const count = /^(\d+) (.*)$/.exec(text);
  const noun = count ? count[2]! : text;
  const singular =
    noun === "repositories"
      ? "repository"
      : noun === "workspace branches"
        ? "workspace branch"
        : noun === "orchestration capabilities"
          ? "orchestration capability"
          : noun.endsWith("s")
            ? noun.slice(0, -1)
            : noun;
  const key = Object.hasOwn(summaryNouns, noun)
    ? summaryNouns[noun as keyof typeof summaryNouns]
    : Object.hasOwn(summaryNouns, singular)
      ? summaryNouns[singular as keyof typeof summaryNouns]
      : undefined;
  if (!key) return null;
  const kind = t(key);
  return count ? t("workSummaryUi.quantity", { count: count[1]!, kind }) : kind;
}
