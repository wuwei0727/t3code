export const voiceErrorKeys = {
  "Voice transcription is still finishing. Try again shortly.": "voiceErrorUi.busy",
  "Voice transcription is not available for this language.": "voiceErrorUi.language",
  "Could not prepare voice transcription.": "voiceErrorUi.prepare",
  "Could not transcribe this recording.": "voiceErrorUi.transcribe",
  "This draft is no longer available.": "voiceErrorUi.draft",
  "Another voice recording is already active.": "voiceErrorUi.another",
  "Voice transcription is not available.": "voiceErrorUi.unavailable",
  "Microphone access is required for voice input.": "voiceErrorUi.permission",
  "Could not start voice recording.": "voiceErrorUi.start",
  "Voice recording was interrupted.": "voiceErrorUi.interrupted",
  "Could not finish voice recording.": "voiceErrorUi.finish",
  "The draft changed while voice input was running. The transcript was not added.":
    "voiceErrorUi.changed",
  "No speech was detected.": "voiceErrorUi.empty",
  "Voice transcription was cancelled.": "voiceErrorUi.cancelled",
  "Your transcription choice changed.": "voiceErrorUi.choice",
  "This recording couldn’t be read. Try recording again.": "voiceErrorUi.recording",
  "Install a transcription model for this environment in Settings → Voice, then try again.":
    "voiceErrorUi.install",
  "Update T3 Code to transcribe on an environment.": "voiceErrorUi.update",
  "Microphone access is required for voice input. Allow access in your browser or system settings and try again.":
    "voiceErrorUi.permissionSettings",
} as const;
