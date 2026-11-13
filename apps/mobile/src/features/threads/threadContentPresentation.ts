import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import { type EnvironmentConnectionPhase } from "@t3tools/client-runtime/connection";

export type ThreadContentPresentation =
  | { readonly kind: "ready" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "unavailable";
      readonly title: string;
      readonly detail: string;
    };

export function projectThreadContentPresentation(input: {
  readonly translate?: UiTranslator;
  readonly hasDetail: boolean;
  readonly detailError: string | null;
  readonly detailDeleted: boolean;
  readonly connectionState: EnvironmentConnectionPhase;
}): ThreadContentPresentation {
  const t = input.translate ?? makeTranslator("en");
  if (input.hasDetail) {
    return { kind: "ready" };
  }
  if (input.detailDeleted) {
    return {
      kind: "unavailable",
      title: t("threadContent.unavailable"),
      detail: t("threadContent.deleted"),
    };
  }
  if (input.detailError !== null) {
    return {
      kind: "unavailable",
      title: t("threadContent.failed"),
      detail: input.detailError,
    };
  }
  if (
    input.connectionState === "connected" ||
    input.connectionState === "connecting" ||
    input.connectionState === "reconnecting"
  ) {
    return { kind: "loading" };
  }
  return {
    kind: "unavailable",
    title: t("threadContent.uncached"),
    detail: t("threadContent.reconnect"),
  };
}
