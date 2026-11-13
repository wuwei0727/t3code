import { useLanguage } from "../../i18n/LanguageProvider";
import { useState } from "react";
import { View } from "react-native";
import { useOpenWorkspaceDetail } from "../layout/useOpenWorkspaceDetail";
import { AppText as Text } from "../../components/ui/AppText";
import { PullRequestCardGroup, PullRequestCardRow } from "./PullRequestControls";
import { pullRequestLayerParams } from "./pullRequestStack";
import { pullRequestStatus } from "./pullRequestStatus";
import type { PullRequestParams } from "./usePullRequestDiff";
import type { PullRequestStackState } from "./usePullRequestStack";
import { PullRequestGlyph } from "./pullRequestGlyphs";
import { withKnownPullRequestSummary } from "../../state/use-thread-pr";

export function PullRequestStackCard(props: {
  readonly params: PullRequestParams;
  readonly state: PullRequestStackState;
}) {
  const { t, locale } = useLanguage();
  const openDetail = useOpenWorkspaceDetail();
  const [expanded, setExpanded] = useState(false);
  const stack = props.state.stack;
  if (!stack) {
    const summary =
      props.params.initialSummary?.number === props.params.number
        ? props.params.initialSummary.stack
        : undefined;
    if (!summary) return null;
    return (
      <PullRequestCardGroup>
        <PullRequestCardRow
          title={t("prStack.title")}
          icon={PullRequestGlyph.stack}
          value={t("prStack.position", { position: summary.position, size: summary.size })}
          last
        />
      </PullRequestCardGroup>
    );
  }
  const position = stack.layers.findIndex((layer) => layer.number === props.params.number) + 1;
  return (
    <PullRequestCardGroup>
      <PullRequestCardRow
        title={t("prStack.title")}
        icon={PullRequestGlyph.stack}
        value={t("prStack.position", { position, size: stack.layers.length })}
        accessibilityLabel={t("prStack.status", {
          position,
          size: stack.layers.length,
          saved: props.state.isFresh ? "" : t("prStack.saved"),
        })}
        expanded={expanded}
        onPress={() => setExpanded(!expanded)}
        last={!expanded}
      />
      {expanded ? (
        <View>
          {stack.layers.map((layer, index) => {
            const selected = layer.number === props.params.number;
            const status = pullRequestStatus(
              {
                state: layer.state,
                isDraft: layer.isDraft === true,
              },
              locale,
            );
            return (
              <View key={layer.number} className={selected ? "bg-thread-selected" : undefined}>
                <PullRequestCardRow
                  title={layer.title ?? layer.headBranch}
                  icon={status.icon}
                  tint={status.tint}
                  value={selected ? t("prStack.current") : status.label}
                  detail={`#${layer.number} · ${t("prStack.position", { position: index + 1, size: stack.layers.length })}`}
                  onPress={
                    selected
                      ? undefined
                      : () =>
                          openDetail({
                            name: "PullRequest",
                            params: withKnownPullRequestSummary(
                              pullRequestLayerParams(props.params, layer.number),
                            ),
                          })
                  }
                  last={index === stack.layers.length - 1}
                />
              </View>
            );
          })}
          <Text className="px-4 py-3 text-xs text-foreground-muted">
            {t("prStack.base", { base: stack.base })}
          </Text>
        </View>
      ) : null}
    </PullRequestCardGroup>
  );
}
