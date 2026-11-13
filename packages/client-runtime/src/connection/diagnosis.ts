import {
  t3ConnectTroubleshootingUrl,
  type T3ConnectTroubleshootingSection,
} from "@t3tools/contracts";
import type { RelayEnvironmentStatusResponse } from "@t3tools/contracts/relay";
import * as DateTime from "effect/DateTime";

import type {
  ConnectionAttemptError,
  ConnectionFailureCause,
  ConnectionHop,
  SupervisorConnectionState,
} from "./model.ts";

export type ConnectionHopResult = "ok" | "failed" | "unchecked";

export interface ConnectionDiagnosisHop {
  readonly hop: ConnectionHop;
  readonly label: string;
  readonly result: ConnectionHopResult;
}

export interface ConnectionDiagnosis {
  /** Names the part that failed, e.g. "Mac mini's tunnel is offline". */
  readonly headline: string;
  readonly hops: ReadonlyArray<ConnectionDiagnosisHop>;
  readonly steps: ReadonlyArray<string>;
  readonly facts: ReadonlyArray<readonly [label: string, value: string]>;
  /** The troubleshooting guide section for this failure. Null for direct routes, except a pending T3 Connect sign-in. */
  readonly moreInfoUrl: string | null;
}

export type ConnectionDiagnosisMessage =
  | "offline"
  | "sessionPending"
  | "outdated"
  | "clock"
  | "notLinked"
  | "relayError"
  | "pending"
  | "disabled"
  | "tunnelOffline"
  | "noAnswer"
  | "invalidAnswer"
  | "dns"
  | "tls"
  | "refused"
  | "timeout"
  | "deviceFailed"
  | "auth"
  | "relayUnreachable"
  | "deviceTunnel"
  | "relayTunnel"
  | "serverAuth"
  | "serverAnswer"
  | "checkHost"
  | "internet"
  | "waitMoment"
  | "reload"
  | "update"
  | "autoTime"
  | "sameAccount"
  | "enable"
  | "waitMinute"
  | "waitMinutes"
  | "report"
  | "awakeRunning"
  | "vpnHost"
  | "restartHost"
  | "awakeOnline"
  | "restartDevice"
  | "removeAdd"
  | "signInAgain"
  | "checkInternet"
  | "vpnDevice"
  | "dnsDevice"
  | "otherNetwork"
  | "running"
  | "retryCopy"
  | "device"
  | "connect"
  | "tunnel"
  | "server";

type DiagnosisTranslator = (
  key: ConnectionDiagnosisMessage,
  fallback: string,
  host: string,
) => string;

export interface ConnectionDiagnosisInput {
  readonly translate?: DiagnosisTranslator;
  readonly hostLabel: string;
  readonly state: SupervisorConnectionState;
  /** The environment's usual route, used when the failure does not name one. */
  readonly via: "relay" | "direct";
  /** The relay's last health check, which can name a cause before any connect attempt. */
  readonly relayStatus?: Pick<
    RelayEnvironmentStatusResponse,
    "status" | "endpointFailure" | "endpointStatus" | "offlineReason"
  > | null;
  readonly clientVersion?: string | undefined;
  readonly serverVersion?: string | null | undefined;
}

interface Located {
  readonly hop: ConnectionHop;
  readonly cause:
    | ConnectionFailureCause
    | "offline"
    | "outdated"
    | "released"
    | "session_pending"
    | null;
  /** The failure named no hop, so the hops before this one were never probed. */
  readonly guessed?: true;
}

const NOT_ANSWERING: ReadonlySet<ConnectionFailureCause> = new Set([
  "origin_unreachable",
  "invalid_response",
]);

function locate(input: ConnectionDiagnosisInput): Located | null {
  const failure = input.state.lastFailure;
  if (input.state.network === "offline" || input.state.phase === "offline") {
    return { hop: "device", cause: "offline" };
  }
  if (failure?._tag === "ConnectionBlockedError" && failure.serverUpdateRequired) {
    return { hop: "server", cause: "outdated" };
  }
  if (failure?.reason === "session-pending") {
    return { hop: "device", cause: "session_pending" };
  }
  if (failure?.hop !== undefined) {
    return { hop: failure.hop, cause: failure.failureCause ?? null };
  }
  if (failure !== null) {
    const unreachable =
      failure.reason === "network" ||
      failure.reason === "timeout" ||
      failure.reason === "transport";
    const via = failure.via ?? input.via;
    return {
      hop: unreachable && via === "relay" ? "tunnel" : "server",
      cause: null,
      guessed: true,
    };
  }
  const status = input.relayStatus;
  if (status?.status !== "offline") return null;
  if (status.offlineReason === "tunnel_released") return { hop: "tunnel", cause: "released" };
  const cause = status.endpointFailure ?? null;
  return { hop: cause !== null && NOT_ANSWERING.has(cause) ? "server" : "tunnel", cause };
}

function headline(
  host: string,
  located: Located,
  failure: ConnectionAttemptError | null,
  translate?: DiagnosisTranslator,
): string {
  switch (located.cause) {
    case "offline":
      return translate?.("offline", "This device is offline", host) ?? "This device is offline";
    case "session_pending":
      return (
        translate?.(
          "sessionPending",
          "This device is still loading its T3 Connect sign-in",
          host,
        ) ?? "This device is still loading its T3 Connect sign-in"
      );
    case "outdated":
      return (
        translate?.("outdated", `${host} runs an older T3 Code`, host) ??
        `${host} runs an older T3 Code`
      );
    case "clock_skew":
      return (
        translate?.("clock", "This device's clock is off", host) ?? "This device's clock is off"
      );
    case "not_linked":
      return (
        translate?.("notLinked", `${host} is not linked to your T3 Connect account`, host) ??
        `${host} is not linked to your T3 Connect account`
      );
    case "relay_error":
      return (
        translate?.("relayError", "T3 Connect returned an error", host) ??
        "T3 Connect returned an error"
      );
    case "tunnel_pending":
      return (
        translate?.("pending", `${host}'s tunnel is still being set up`, host) ??
        `${host}'s tunnel is still being set up`
      );
    case "tunnel_not_enabled":
      return (
        translate?.("disabled", `T3 Connect is not turned on for ${host}`, host) ??
        `T3 Connect is not turned on for ${host}`
      );
    case "released":
    case "tunnel_down":
      return (
        translate?.("tunnelOffline", `${host}'s tunnel is offline`, host) ??
        `${host}'s tunnel is offline`
      );
    case "origin_unreachable":
      return (
        translate?.("noAnswer", `Tunnel works, but T3 Code on ${host} did not answer`, host) ??
        `Tunnel works, but T3 Code on ${host} did not answer`
      );
    case "invalid_response":
      return (
        translate?.("invalidAnswer", `T3 Code on ${host} sent an unexpected answer`, host) ??
        `T3 Code on ${host} sent an unexpected answer`
      );
    case "dns":
      return (
        translate?.("dns", `${host}'s tunnel address did not resolve`, host) ??
        `${host}'s tunnel address did not resolve`
      );
    case "tls":
      return (
        translate?.("tls", `Secure connection to ${host}'s tunnel failed`, host) ??
        `Secure connection to ${host}'s tunnel failed`
      );
    case "refused":
      return (
        translate?.("refused", `${host}'s tunnel refused the connection`, host) ??
        `${host}'s tunnel refused the connection`
      );
    case "timeout":
      return (
        translate?.("timeout", `${host} did not answer in time`, host) ??
        `${host} did not answer in time`
      );
    case "unknown":
    case null:
      break;
  }
  switch (located.hop) {
    case "device":
      return (
        translate?.("deviceFailed", "This device could not prepare the connection", host) ??
        "This device could not prepare the connection"
      );
    case "relay":
      return failure?.reason === "authentication"
        ? (translate?.("auth", "T3 Connect did not accept this device's sign-in", host) ??
            "T3 Connect did not accept this device's sign-in")
        : (translate?.("relayUnreachable", "This device can't reach T3 Connect", host) ??
            "This device can't reach T3 Connect");
    case "tunnel":
      // The relay already reached the host when this device fails on its own.
      return failure?.reason === "network" ||
        failure?.reason === "transport" ||
        failure?.reason === "timeout"
        ? (translate?.("deviceTunnel", `This device can't reach ${host}'s tunnel`, host) ??
            `This device can't reach ${host}'s tunnel`)
        : (translate?.("relayTunnel", `T3 Connect could not reach ${host}'s tunnel`, host) ??
            `T3 Connect could not reach ${host}'s tunnel`);
    case "server":
      return failure?.reason === "authentication" || failure?.reason === "permission"
        ? (translate?.("serverAuth", `T3 Code on ${host} did not accept this device`, host) ??
            `T3 Code on ${host} did not accept this device`)
        : (translate?.("serverAnswer", `T3 Code on ${host} did not answer`, host) ??
            `T3 Code on ${host} did not answer`);
  }
}

function steps(
  host: string,
  located: Located,
  failure: ConnectionAttemptError | null,
  translate?: DiagnosisTranslator,
): string[] {
  const checkHost =
    translate?.(
      "checkHost",
      `On ${host}, check Settings > Sharing & access or run \`t3 connect status\`.`,
      host,
    ) ?? `On ${host}, check Settings > Sharing & access or run \`t3 connect status\`.`;
  switch (located.cause) {
    case "offline":
      return [
        translate?.(
          "internet",
          "Connect this device to the internet. T3 Code reconnects on its own.",
          host,
        ) ?? "Connect this device to the internet. T3 Code reconnects on its own.",
      ];
    case "session_pending":
      return [
        translate?.("waitMoment", "Wait a moment. T3 Code retries on its own.", host) ??
          "Wait a moment. T3 Code retries on its own.",
        translate?.(
          "reload",
          "If it keeps waiting, reload or restart T3 Code on this device.",
          host,
        ) ?? "If it keeps waiting, reload or restart T3 Code on this device.",
      ];
    case "outdated":
      return [
        translate?.("update", `Update T3 Code on ${host}.`, host) ?? `Update T3 Code on ${host}.`,
      ];
    case "clock_skew":
      return [
        translate?.(
          "autoTime",
          `Turn on automatic date and time on this device and on ${host}, then retry.`,
          host,
        ) ?? `Turn on automatic date and time on this device and on ${host}, then retry.`,
      ];
    case "not_linked":
      return [
        translate?.(
          "sameAccount",
          "Check that this device is signed in to the same T3 Connect account as the host.",
          host,
        ) ?? "Check that this device is signed in to the same T3 Connect account as the host.",
        translate?.(
          "enable",
          `On ${host}, open Settings > Sharing & access and turn T3 Connect on.`,
          host,
        ) ?? `On ${host}, open Settings > Sharing & access and turn T3 Connect on.`,
      ];
    case "tunnel_pending":
      return [
        translate?.("waitMinute", "Wait a minute. T3 Code retries on its own.", host) ??
          "Wait a minute. T3 Code retries on its own.",
        checkHost,
      ];
    case "relay_error":
      return [
        translate?.("waitMinutes", "Wait a few minutes. T3 Code retries on its own.", host) ??
          "Wait a few minutes. T3 Code retries on its own.",
        translate?.("report", "If it keeps failing, copy the diagnostics and report it.", host) ??
          "If it keeps failing, copy the diagnostics and report it.",
      ];
    case "tunnel_not_enabled":
      return [
        translate?.(
          "enable",
          `On ${host}, open Settings > Sharing & access and turn T3 Connect on.`,
          host,
        ) ?? `On ${host}, open Settings > Sharing & access and turn T3 Connect on.`,
      ];
    case "released":
    case "tunnel_down":
      return [
        translate?.(
          "awakeRunning",
          `Make sure ${host} is awake and T3 Code is running on it.`,
          host,
        ) ?? `Make sure ${host} is awake and T3 Code is running on it.`,
        checkHost,
        translate?.(
          "vpnHost",
          `A VPN or Tailscale exit node on ${host} can block the tunnel (port 7844). Turn it off or allow the tunnel.`,
          host,
        ) ??
          `A VPN or Tailscale exit node on ${host} can block the tunnel (port 7844). Turn it off or allow the tunnel.`,
      ];
    case "origin_unreachable":
    case "invalid_response":
      return [
        translate?.("restartHost", `Open or restart T3 Code on ${host}.`, host) ??
          `Open or restart T3 Code on ${host}.`,
        checkHost,
      ];
    // The relay saw these on its way to the host, so the fix is on the host.
    case "dns":
    case "tls":
    case "refused":
    case "timeout":
    case "unknown":
      return [
        translate?.("awakeOnline", `Make sure ${host} is awake and online.`, host) ??
          `Make sure ${host} is awake and online.`,
        checkHost,
      ];
    case null:
      break;
  }
  switch (located.hop) {
    case "device":
      return [
        translate?.("restartDevice", "Restart T3 Code on this device.", host) ??
          "Restart T3 Code on this device.",
        translate?.(
          "removeAdd",
          `If it keeps failing, remove ${host} from this device and add it again.`,
          host,
        ) ?? `If it keeps failing, remove ${host} from this device and add it again.`,
      ];
    case "relay":
      return failure?.reason === "authentication"
        ? [
            translate?.("signInAgain", "Sign out of T3 Connect and sign in again.", host) ??
              "Sign out of T3 Connect and sign in again.",
          ]
        : [
            translate?.("checkInternet", "Check this device's internet connection.", host) ??
              "Check this device's internet connection.",
            translate?.(
              "vpnDevice",
              "A VPN, firewall, or ad blocker on this device can block T3 Connect.",
              host,
            ) ?? "A VPN, firewall, or ad blocker on this device can block T3 Connect.",
          ];
    case "tunnel":
      return failure?.reason === "network" ||
        failure?.reason === "transport" ||
        failure?.reason === "timeout"
        ? [
            translate?.(
              "dnsDevice",
              "A VPN, firewall, or DNS filter on this device can block the tunnel.",
              host,
            ) ?? "A VPN, firewall, or DNS filter on this device can block the tunnel.",
            translate?.(
              "otherNetwork",
              "Try another network, or add a direct route such as a Tailscale address.",
              host,
            ) ?? "Try another network, or add a direct route such as a Tailscale address.",
          ]
        : [
            translate?.("awakeOnline", `Make sure ${host} is awake and online.`, host) ??
              `Make sure ${host} is awake and online.`,
            checkHost,
          ];
    case "server":
      return [
        translate?.("running", `Make sure T3 Code is running on ${host}.`, host) ??
          `Make sure T3 Code is running on ${host}.`,
        translate?.("retryCopy", "Retry. If it keeps failing, copy the diagnostics.", host) ??
          "Retry. If it keeps failing, copy the diagnostics.",
      ];
  }
}

function helpSection(
  located: Located,
  failure: ConnectionAttemptError | null,
): T3ConnectTroubleshootingSection {
  switch (located.cause) {
    case "offline":
      return "this-device-cant-reach-t3-connect";
    case "outdated":
      return "the-host-runs-an-older-t3-code";
    case "clock_skew":
      return "the-clock-is-off";
    case "session_pending":
    case "not_linked":
    case "tunnel_not_enabled":
      return "sign-in-account-or-link-problems";
    case "relay_error":
      return "t3-connect-returned-an-error";
    case "released":
    case "tunnel_down":
    case "tunnel_pending":
      return "the-hosts-tunnel-is-offline";
    case "origin_unreachable":
    case "invalid_response":
      return "the-tunnel-works-but-t3-code-does-not-answer";
    case "dns":
    case "tls":
    case "refused":
    case "timeout":
    case "unknown":
      return "the-t3-connect-address-does-not-resolve-or-answer";
    case null:
      break;
  }
  const onThisDevice =
    failure?.reason === "network" ||
    failure?.reason === "transport" ||
    failure?.reason === "timeout";
  switch (located.hop) {
    case "device":
      return "this-device-cant-reach-t3-connect";
    case "relay":
      return failure?.reason === "authentication"
        ? "sign-in-account-or-link-problems"
        : "this-device-cant-reach-t3-connect";
    case "tunnel":
      return onThisDevice ? "this-device-cant-reach-t3-connect" : "the-hosts-tunnel-is-offline";
    case "server":
      return failure?.reason === "authentication" || failure?.reason === "permission"
        ? "sign-in-account-or-link-problems"
        : "the-tunnel-works-but-t3-code-does-not-answer";
  }
}

const HOP_ORDER = {
  relay: ["device", "relay", "tunnel", "server"],
  direct: ["device", "server"],
} as const;

function hopLabel(hop: ConnectionHop, host: string, translate?: DiagnosisTranslator): string {
  switch (hop) {
    case "device":
      return translate?.("device", "This device", host) ?? "This device";
    case "relay":
      return translate?.("connect", "T3 Connect", host) ?? "T3 Connect";
    case "tunnel":
      return translate?.("tunnel", `${host} tunnel`, host) ?? `${host} tunnel`;
    case "server":
      return translate?.("server", `T3 Code on ${host}`, host) ?? `T3 Code on ${host}`;
  }
}

/**
 * Turns a connection state into what failed, in order, and what to try. Returns
 * null when nothing has failed. Web and mobile render this same model.
 */
export function presentConnectionDiagnosis(
  input: ConnectionDiagnosisInput,
): ConnectionDiagnosis | null {
  const located = locate(input);
  if (located === null) return null;
  const host = input.hostLabel;
  const failure = input.state.lastFailure;
  const relayPath =
    located.hop === "relay" ||
    located.hop === "tunnel" ||
    (failure === null && input.relayStatus?.status === "offline") ||
    (failure?.via ?? input.via) === "relay";
  const order: ReadonlyArray<ConnectionHop> = HOP_ORDER[relayPath ? "relay" : "direct"];
  const failedIndex = order.indexOf(located.hop);
  const hops = order.map((hop, index): ConnectionDiagnosisHop => ({
    hop,
    label: hopLabel(hop, host, input.translate),
    result:
      index === failedIndex
        ? "failed"
        : index < failedIndex && located.guessed !== true
          ? "ok"
          : "unchecked",
  }));

  // The relay health check only explains the state when no attempt has failed yet.
  const httpStatus = failure !== null ? failure.httpStatus : input.relayStatus?.endpointStatus;
  const facts: Array<readonly [string, string]> = [];
  const add = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") facts.push([label, String(value)]);
  };
  add("Cause", located.cause ?? failure?.reason);
  add("HTTP status", httpStatus);
  add("Attempts", input.state.attempt > 0 ? input.state.attempt : null);
  add(
    "Next retry",
    input.state.retryAt === null
      ? null
      : DateTime.formatIso(DateTime.makeUnsafe(input.state.retryAt)),
  );
  add("Route", relayPath ? "T3 Connect" : "Direct");
  add("App version", input.clientVersion);
  add("Host version", input.serverVersion);
  add("Error", failure?.detail);
  add("Trace ID", failure?.traceId);

  return {
    headline: headline(host, located, failure, input.translate),
    hops,
    steps: steps(host, located, failure, input.translate),
    facts,
    moreInfoUrl:
      relayPath || located.cause === "session_pending"
        ? t3ConnectTroubleshootingUrl(helpSection(located, failure))
        : null,
  };
}

const HOP_MARK = { ok: "ok", failed: "FAILED", unchecked: "not checked" } as const;

/** One plain-text block for bug reports. */
export function connectionDiagnosisText(hostLabel: string, diagnosis: ConnectionDiagnosis): string {
  return [
    `T3 Code connection to ${hostLabel}: ${diagnosis.headline}`,
    "",
    ...diagnosis.hops.map((hop) => `${hop.label}: ${HOP_MARK[hop.result]}`),
    "",
    ...diagnosis.facts.map(([label, value]) => `${label}: ${value}`),
    ...(diagnosis.moreInfoUrl ? ["", `More info: ${diagnosis.moreInfoUrl}`] : []),
  ].join("\n");
}
