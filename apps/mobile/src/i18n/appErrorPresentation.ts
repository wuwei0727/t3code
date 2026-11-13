import type { UiTranslator } from "./translator";

const keys = {
  "Relay environment listing timed out. Your DNS or firewall may be blocking T3 Connect. Try another network, such as a different Wi-Fi or mobile data.":
    "appError.relayDiscoveryTimeout",
  "The PDF could not be loaded.": "pdfAndroid.loadFailed",
  "No video received from the device. Reconnect to try again.": "deviceStream.noVideo",
  "Could not receive the device stream. Reconnect to try again.": "deviceStream.receiveFailed",
  "Could not display the device stream. Reconnect to try again.": "deviceStream.displayFailed",
  "This browser cannot receive the device's WebRTC stream.": "deviceStream.webRtcUnavailable",
  "This browser cannot decode the Android stream (WebCodecs unavailable).":
    "deviceStream.androidDecoderUnavailable",
  "This browser cannot decode this device's stream (WebCodecs unavailable).":
    "deviceStream.decoderUnavailable",
  "Device viewer stopped unexpectedly.": "deviceStream.unexpected",
  "Reconnect to this environment and try again.": "appError.reconnect",
  "The attachment is unavailable.": "appError.attachment",
  "The local file is unavailable.": "appError.localFile",
  "Could not read this file.": "appError.readFile",
  "This connection cannot change attachments.": "appError.attachmentsPermission",
  "This connection cannot update the thread's branch.": "appError.branchPermission",
  "Sign in to T3 Connect to connect this environment.": "appError.connectLogin",
  "The T3 Connect session is unavailable.": "appError.connectSession",
  "SSH environments are only available in the desktop app.": "appError.sshDesktop",
  "Checking for updates timed out. Try again.": "appError.updateTimeout",
  "Git action failed.": "appError.gitFailed",
  "Failed to refresh branches.": "appError.branchesFailed",
  "Try again.": "threadProjectUi.retry",
  "Reconnect to this environment and try again. The file may have been moved or deleted.":
    "appError.fileMoved",
} as const;

export function appErrorText(message: string, t: UiTranslator): string {
  const unsupportedCodec = /^This browser cannot decode ([A-Za-z0-9][A-Za-z0-9._-]*)\.$/.exec(
    message,
  );
  if (unsupportedCodec?.[1])
    return t("deviceStream.unsupportedCodec", { codec: unsupportedCodec[1] });
  const decoderError = /^Video decoder: ([\s\S]+)$/.exec(message);
  if (decoderError?.[1]) return t("deviceStream.decoderError", { detail: decoderError[1] });
  const missingFile = /^The file was not found at (.+)\.$/.exec(message);
  if (missingFile?.[1]) return t("appError.fileNotFound", { path: missingFile[1] });
  return Object.hasOwn(keys, message) ? t(keys[message as keyof typeof keys]) : message;
}
