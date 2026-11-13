import type { UiTranslator } from "../../i18n/translator";
import { historyLabels } from "./workHistoryCatalog";
const templates = Object.entries(historyLabels)
  .filter(([text]) => text.includes("{{"))
  .map(([text, key]) => {
    const names: string[] = [];
    const pattern = text
      .split(/(\{\{[a-zA-Z]+\}\})/)
      .map((part) => {
        if (part.startsWith("{{")) {
          names.push(part.slice(2, -2));
          return "(.*?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    return { pattern: new RegExp(`^${pattern}$`), names, key };
  });
export function localizeWorkHistoryLabel(text: string, t: UiTranslator) {
  if (Object.hasOwn(historyLabels, text))
    return t(historyLabels[text as keyof typeof historyLabels]);
  for (const { pattern, names, key } of templates) {
    const match = pattern.exec(text);
    if (match)
      return t(key, Object.fromEntries(names.map((name, index) => [name, match[index + 1]!])));
  }
  return text;
}
