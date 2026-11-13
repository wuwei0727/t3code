const { withSettingsGradle } = require("expo/config-plugins");

module.exports = function withoutCommunityObserve(config) {
  return withSettingsGradle(config, (nextConfig) => {
    const anchor = "expoAutolinking.useExpoModules()";
    const exclusion = "expoAutolinking.exclude = ['expo-observe']";
    if (
      nextConfig.modResults.language !== "groovy" ||
      !nextConfig.modResults.contents.includes(anchor)
    ) {
      throw new Error("Community telemetry exclusion needs review: Expo settings.gradle changed.");
    }
    // Expo initializes legacy modules before JS can disable reporting; no EAS project is configured here.
    if (!nextConfig.modResults.contents.includes(exclusion)) {
      nextConfig.modResults.contents = nextConfig.modResults.contents.replace(
        anchor,
        `${exclusion}\n${anchor}`,
      );
    }
    return nextConfig;
  });
};
