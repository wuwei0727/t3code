import { expect, it } from "vite-plus/test";
import { appErrorText } from "./appErrorPresentation";
import { makeTranslator } from "./translator";

it("localizes the known relay discovery failure while retaining unknown diagnostics", () => {
  const message =
    "Relay environment listing timed out. Your DNS or firewall may be blocking T3 Connect. Try another network, such as a different Wi-Fi or mobile data.";
  expect(appErrorText(message, makeTranslator("zh-CN"))).toBe(
    "获取 T3 Connect 环境列表超时。DNS 或防火墙可能阻止了连接，请尝试其他 Wi-Fi 或移动数据网络。",
  );
  expect(appErrorText(message, makeTranslator("en"))).toBe(message);
  expect(appErrorText(`${message} [trace: unknown]`, makeTranslator("zh-CN"))).toBe(
    `${message} [trace: unknown]`,
  );
});
