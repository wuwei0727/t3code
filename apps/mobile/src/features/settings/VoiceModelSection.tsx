import { useLanguage } from "../../i18n/LanguageProvider";
import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { useNavigation } from "@react-navigation/native";
import {
  cancelEnvironmentSpeechModelDownload,
  downloadEnvironmentSpeechModel,
  selectEnvironmentSpeechModel,
} from "@t3tools/client-runtime/voice-input";
import {
  AuthSettingsWriteScope,
  type EnvironmentId,
  type EnvironmentSpeechModel,
} from "@t3tools/contracts";
import { AsyncResult } from "effect/reactivity";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Platform, Text as NativeText, View } from "react-native";

import { SymbolView } from "../../components/ui/AppSymbol";
import { AppText as Text } from "../../components/ui/AppText";
import * as Dialog from "../../components/ui/Dialog";
import { ListActionRow } from "../../components/ui/ListActionRow";
import { ListChoiceRow } from "../../components/ui/ListChoiceRow";
import { ListRow } from "../../components/ui/ListRow";
import { Progress } from "../../components/ui/Progress";
import { formatBytes } from "../../lib/formatBytes";
import { useEnvironmentScope } from "../../state/session";
import {
  runSpeech,
  voiceConnectionAtom,
  voiceSpeechModelsAtom,
  voiceSpeechStatusAtom,
} from "../voice-input/voiceDestination";

const isDownloading = (model: EnvironmentSpeechModel) =>
  model.state === "downloading" || model.state === "verifying";

export function useVoiceModels(environmentId: EnvironmentId, label: string) {
  const { t } = useLanguage();
  const connection = useAtomValue(voiceConnectionAtom(environmentId));
  const statusAtom = voiceSpeechStatusAtom(environmentId);
  const modelsAtom = voiceSpeechModelsAtom(environmentId);
  const status = AsyncResult.getOrElse(useAtomValue(statusAtom), () => null);
  const modelsResult = useAtomValue(modelsAtom);
  const refreshStatus = useAtomRefresh(statusAtom);
  const refreshModels = useAtomRefresh(modelsAtom);
  const canManage = useEnvironmentScope(environmentId, AuthSettingsWriteScope);
  const [requested, setRequested] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const models = AsyncResult.getOrElse(modelsResult, () => null)?.models ?? [];
  const downloading = requested !== null || models.some(isDownloading);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- polls the environment's download progress while one runs
  useEffect(() => {
    if (!downloading) return;
    const timer = setInterval(refreshModels, 1_000);
    return () => clearInterval(timer);
  }, [downloading, refreshModels]);

  const run = async (title: string, work: () => Promise<unknown>, downloadId?: string) => {
    if (downloadId) setRequested(downloadId);
    else setBusy(true);
    try {
      await work();
    } catch (error) {
      Dialog.alert(title, error instanceof Error ? error.message : String(error));
    }
    if (downloadId) setRequested(null);
    else setBusy(false);
    refreshModels();
    refreshStatus();
  };
  const ready = connection !== null && status?.supported === true;
  return {
    connection,
    status,
    models,
    loading: modelsResult._tag === "Initial",
    canManage,
    requested,
    busy,
    downloading,
    label,
    download: (model: EnvironmentSpeechModel) => {
      if (!ready) return;
      Dialog.confirm({
        title: t("voiceModels.downloadConfirm", { model: model.name }),
        message: t("voiceModels.downloadHelp", {
          environment: label,
          size: formatBytes(model.size),
        }),
        confirmText: t("voiceModels.download"),
        onConfirm: () =>
          void run(
            t("voiceModels.downloadFailed"),
            async () => {
              await runSpeech(downloadEnvironmentSpeechModel(connection, model.id));
              if (model.id !== status.modelId)
                await runSpeech(selectEnvironmentSpeechModel(connection, model.id));
            },
            model.id,
          ),
      });
    },
    select: (model: EnvironmentSpeechModel) => {
      if (!ready || model.active) return;
      void run(t("voiceModels.selectFailed"), () =>
        runSpeech(selectEnvironmentSpeechModel(connection, model.id)),
      );
    },
    cancel: (model: EnvironmentSpeechModel) => {
      if (!ready) return;
      void run(t("voiceModels.cancelFailed"), () =>
        runSpeech(cancelEnvironmentSpeechModelDownload(connection, model.id)),
      );
    },
  };
}

export type VoiceModels = ReturnType<typeof useVoiceModels>;

function ModelStats(props: { readonly model: EnvironmentSpeechModel; readonly language: string }) {
  const { t, locale } = useLanguage();
  const { model, language } = props;
  const languageNames = useMemo(
    () =>
      typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames(locale, { type: "language" })
        : null,
    [locale],
  );
  const languageLabel = (code: string) => languageNames?.of(code) ?? code.toUpperCase();
  const data = model.benchmark;
  const code = !data
    ? undefined
    : data.accuracy[language]
      ? language
      : (model.languages.find((candidate) => data.accuracy[candidate]) ?? model.languages[0]);
  const score = code ? data?.accuracy[code] : undefined;
  const parts: ReadonlyArray<readonly [string, ReactNode]> = [
    ...(code && score
      ? ([
          [
            "score",
            <>
              {languageLabel(code)}{" "}
              <Text className="font-t3-medium text-foreground">{score.grade}</Text> (
              {t("voiceModels.errorPercent", { percent: score.errorPercent })})
            </>,
          ],
        ] as const)
      : []),
    ...(data && data.secondsPer30s.accelerated !== null
      ? ([
          [
            "speed",
            <>
              <Text className="font-t3-medium text-foreground">
                {data.secondsPer30s.accelerated} s
              </Text>{" "}
              / 30 s
            </>,
          ],
        ] as const)
      : []),
    // A single-language model's score already names its language.
    ...(model.languages.length > 1
      ? ([
          [
            "languages",
            <>
              <SymbolView
                name="globe"
                size={13}
                tintColorClassName="accent-icon-muted"
                type="monochrome"
                weight="regular"
              />{" "}
              {model.languages.length}
            </>,
          ],
        ] as const)
      : score
        ? []
        : ([["languages", languageLabel(model.languages[0] ?? "")]] as const)),
    ["size", formatBytes(model.size)],
  ];
  return (
    <Text textRole="footnote" className="text-foreground-muted tabular-nums">
      {parts.map(([key, part], index) => (
        // Plain Text inherits the muted footnote style; AppText would reset it.
        <NativeText key={key}>
          {index > 0 ? " · " : null}
          {part}
        </NativeText>
      ))}
    </Text>
  );
}

function DownloadedGlyph() {
  return (
    <View className="size-6">
      <SymbolView
        name="tray.and.arrow.down"
        size={Platform.OS === "android" ? 24 : 22}
        tintColorClassName="accent-icon"
        type="monochrome"
        weight="regular"
      />
      <View className="absolute -right-1.5 -bottom-1 size-3.5 items-center justify-center rounded-full bg-primary ring-2 ring-grouped-card">
        <SymbolView
          name="checkmark"
          size={9}
          tintColorClassName="accent-primary-foreground"
          type="monochrome"
          weight="bold"
        />
      </View>
    </View>
  );
}

export function VoiceModelRow(props: {
  readonly model: EnvironmentSpeechModel;
  readonly voice: VoiceModels;
  readonly separated: boolean;
  /** The language whose benchmark score to show, when the model has one. */
  readonly language: string;
}) {
  const { t } = useLanguage();
  const { model, voice, separated } = props;
  const meta = <ModelStats model={model} language={props.language} />;
  if (model.state === "installed")
    return (
      <ListChoiceRow
        leading={<DownloadedGlyph />}
        label={model.name}
        description={model.description}
        meta={meta}
        selected={model.active}
        separated={separated}
        disabled={!voice.canManage || voice.busy || voice.downloading}
        onPress={() => voice.select(model)}
      />
    );
  const progress = model.downloaded === undefined ? undefined : model.downloaded / model.size;
  if (isDownloading(model) || voice.requested === model.id)
    return (
      <View className={separated ? "border-t border-border-subtle" : ""}>
        <ListActionRow
          icon="xmark"
          label={model.name}
          description={
            model.state === "verifying"
              ? t("voiceModels.verifying")
              : t("voiceModels.downloadProgress", { percent: Math.round((progress ?? 0) * 100) })
          }
          disabled={!voice.canManage || voice.busy}
          onPress={() => voice.cancel(model)}
        />
        <Progress
          className="bg-grouped-card px-4 pb-3"
          value={model.state === "verifying" ? undefined : progress}
          label={t("voiceModels.progressLabel", { model: model.name })}
        />
      </View>
    );
  return (
    <View className={separated ? "border-t border-border-subtle" : ""}>
      <ListActionRow
        icon="tray.and.arrow.down"
        label={model.name}
        description={model.description}
        meta={meta}
        disabled={!voice.canManage || voice.busy || voice.downloading}
        onPress={() => voice.download(model)}
      />
    </View>
  );
}

/** The environment's local-model method: chosen by its mark, opens the model list. */
export function LocalModelChoice(props: {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const voice = useVoiceModels(props.environmentId, props.label);
  const { status } = voice;
  const open = () =>
    navigation.navigate("SettingsVoiceModels", { environmentId: props.environmentId });
  if (!voice.connection || !status || !status.supported)
    return (
      <ListChoiceRow
        label={t("voiceModels.local")}
        description={
          !voice.connection
            ? t("voiceModels.unavailable")
            : status?.supported === false
              ? status.reason
              : t("voiceModels.checking")
        }
        selected={props.selected}
        disabled
        onPress={() => {}}
      />
    );

  const active = status.state === "missing-model" ? null : status;
  const pending = voice.models.find(isDownloading);
  const progress =
    pending?.downloaded === undefined ? undefined : pending.downloaded / pending.size;
  return (
    <ListRow
      label={active?.model ?? t("voiceModels.local")}
      description={
        pending
          ? pending.state === "verifying"
            ? t("voiceModels.verifyingModel", { model: pending.name })
            : t("voiceModels.downloadingModel", {
                model: pending.name,
                percent: Math.round((progress ?? 0) * 100),
              })
          : active
            ? t("voiceModels.localSize", { size: formatBytes(active.size) })
            : voice.canManage
              ? t("voiceModels.chooseDownload")
              : t("voiceModels.addOnEnvironment", { environment: props.label })
      }
      selected={props.selected}
      onPress={() => {
        if (!props.selected) props.onSelect();
        // Switching to an installed model needs no further step.
        if (props.selected || !active) open();
      }}
    />
  );
}
