import { describe, expect, it } from "vite-plus/test";
import {
  formatNextScheduledTaskRun,
  formatScheduledTaskInterval,
} from "./scheduledTaskPresentation";

describe("localized scheduled task presentation", () => {
  it("formats compound intervals and next-run boundaries in the selected language", () => {
    const now = new Date(2026, 10, 12, 12).getTime();
    expect(formatScheduledTaskInterval(90_000, "zh-CN")).toBe("每 1 分钟 30 秒");
    expect(formatScheduledTaskInterval(60_000, "en")).toBe("Every minute");
    expect(formatScheduledTaskInterval(90_000, "en")).toBe("Every 1 minute 30 seconds");
    expect(formatNextScheduledTaskRun("invalid", now, "zh-CN")).toBe("下次运行时间不可用");
    expect(formatNextScheduledTaskRun(new Date(now).toISOString(), now, "zh-CN")).toBe(
      "已到下次运行时间",
    );
    expect(formatNextScheduledTaskRun(new Date(now + 30_000).toISOString(), now, "zh-CN")).toBe(
      "下次运行：不到 1 分钟后",
    );
    expect(formatNextScheduledTaskRun(new Date(now + 90_000).toISOString(), now, "zh-CN")).toBe(
      "下次运行：2 分钟后",
    );
    expect(formatNextScheduledTaskRun(new Date(now + 30_000).toISOString(), now, "en")).toBe(
      "Next run in less than a minute",
    );
  });
});
