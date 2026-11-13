import { describe, expect, it } from "vite-plus/test";
import { createTranslator, normalizeLanguage, resolveLocale } from "./locale";

describe("mobile UI language", () => {
  it.each([
    ["system", [{ languageTag: "zh-CN" }], "zh-CN"],
    ["system", [{ languageTag: "zh-Hans-SG" }], "zh-CN"],
    ["system", [{ languageTag: "zh" }], "zh-CN"],
    ["system", [{ languageTag: "zh-Hant-TW" }], "en"],
    ["system", [{ languageTag: "zh-HK" }], "en"],
    ["system", [{ languageTag: "fr-FR" }, { languageTag: "zh-CN" }], "zh-CN"],
    ["system", [{ languageTag: "en-US" }, { languageTag: "zh-CN" }], "en"],
    ["en", [{ languageTag: "zh-CN" }], "en"],
    ["zh-CN", [{ languageTag: "en-US" }], "zh-CN"],
    ["invalid", [], "en"],
  ])("resolves %s with %j", (choice, locales, expected) => {
    expect(resolveLocale(choice, locales)).toBe(expected);
  });

  it("defaults invalid preferences to the system and falls back to English per key", () => {
    expect(normalizeLanguage("zh-TW")).toBe("system");
    const english = { greeting: "Hello {{name}}", missing: "Missing {{name}}" };
    const t = createTranslator("zh-CN", english, { greeting: "你好，{{name}}" });
    expect(t("greeting", { name: "$& `command` {{other}}" })).toBe("你好，$& `command` {{other}}");
    expect(t("missing", { name: "world" })).toBe("Missing world");
    expect(t("missing")).toBe("Missing {{name}}");
    expect(createTranslator("en", english, { greeting: "你好" })("greeting", { name: "Ada" })).toBe(
      "Hello Ada",
    );
  });
});
