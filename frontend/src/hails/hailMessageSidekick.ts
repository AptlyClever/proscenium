/** Message Sidekick preview — stable-phase CSS variables from compose payload. */

export type MessageEntityPayload = {
  text?: string;
  sidekick_id?: string;
  entrance_style?: string;
  exit_style?: string;
  entrance_ms?: number;
  exit_ms?: number;
  opacity?: number;
  exit_offset_ms?: number;
  stable_hold_ms?: number;
};

export type MessageSidekickPreviewStyle = {
  cssVars: Record<string, string>;
  entranceStyle: string;
  exitStyle: string;
};

export function resolveMessageSidekickPreviewStyle(
  messageEntity: MessageEntityPayload | null | undefined,
  stableHoldMs: number,
): MessageSidekickPreviewStyle | null {
  if (!messageEntity?.text?.trim()) {
    return null;
  }
  const entranceMs = Math.max(80, Number(messageEntity.entrance_ms) || 480);
  const exitMs = Math.max(80, Number(messageEntity.exit_ms) || 360);
  const holdMs = Math.max(entranceMs + exitMs, Number(messageEntity.stable_hold_ms) || stableHoldMs);
  const exitOffsetMs = Math.max(0, Number(messageEntity.exit_offset_ms) ?? holdMs - exitMs);
  const opacity = Math.min(1, Math.max(0.2, Number(messageEntity.opacity) || 0.92));

  return {
    entranceStyle: messageEntity.entrance_style || "fade",
    exitStyle: messageEntity.exit_style || "fade",
    cssVars: {
      "--hail-message-entrance-ms": `${entranceMs}ms`,
      "--hail-message-exit-ms": `${exitMs}ms`,
      "--hail-message-stable-hold-ms": `${holdMs}ms`,
      "--hail-message-exit-offset-ms": `${exitOffsetMs}ms`,
      "--hail-message-opacity": String(opacity),
    },
  };
}
