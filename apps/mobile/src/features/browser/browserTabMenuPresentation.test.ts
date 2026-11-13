import { expect, it } from "vite-plus/test";
import { makeTranslator } from "../../i18n/translator";
import { browserViewportChoices } from "./browserTabMenuPresentation";

it("keeps every viewport preset and its dimensions when switching to Chinese", () => {
  const en = browserViewportChoices(makeTranslator("en"));
  const zh = browserViewportChoices(makeTranslator("zh-CN"));
  expect(en.map((choice) => choice.id)).toEqual(["fill", "preset:iphone-se", "preset:ipad-mini"]);
  expect(zh.map(({ id, setting }) => ({ id, setting }))).toEqual(
    en.map(({ id, setting }) => ({ id, setting })),
  );
  expect(zh[1]?.title).toContain("手机");
  expect(zh[2]?.title).toContain("平板");
});
