import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

export const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
    audioSource: 'voice_recognition',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

export async function requestMicPermission(): Promise<boolean> {
  const permission = await requestRecordingPermissionsAsync();
  return permission.granted;
}

export async function configureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldRouteThroughEarpiece: false,
  });
}

export async function resetAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
  });
}

export async function deleteRecording(uri: string | null): Promise<void> {
  if (!uri || uri.startsWith('blob:')) return;

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // A temporary recording should never prevent the next interview question.
  }
}

export function normalizeMetering(metering?: number): number {
  if (metering === undefined || !Number.isFinite(metering)) return 0;
  // Expo reports decibels from roughly -160 (silence) to 0 (maximum).
  return Math.max(0, Math.min(1, (metering + 60) / 60));
}
