import * as FileSystem from 'expo-file-system/legacy';
import { STTProvider } from '../types';
import { createProviderError, fetchWithTimeout } from './http';

function getAudioMetadata(audioUri: string): { mimeType: string; fileName: string } {
  const isWebm = audioUri.startsWith('blob:') || audioUri.toLowerCase().includes('.webm');
  return isWebm
    ? { mimeType: 'audio/webm', fileName: 'recording.webm' }
    : { mimeType: 'audio/m4a', fileName: 'recording.m4a' };
}

async function readAudioBytes(audioUri: string): Promise<Uint8Array> {
  if (audioUri.startsWith('blob:') || audioUri.startsWith('http')) {
    const response = await fetch(audioUri);
    return new Uint8Array(await response.arrayBuffer());
  }

  const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return bytes;
}

async function transcribeWithWhisper(
  audioUri: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const { mimeType, fileName } = getAudioMetadata(audioUri);
  const formData = new FormData();

  if (audioUri.startsWith('blob:')) {
    const audioResponse = await fetch(audioUri);
    formData.append('file', await audioResponse.blob(), fileName);
  } else {
    formData.append('file', {
      uri: audioUri,
      type: mimeType,
      name: fileName,
    } as any);
  }
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    },
    45_000,
    signal
  );

  if (!response.ok) {
    throw await createProviderError('OpenAI transcription', response);
  }

  const result = (await response.json()) as { text?: string };
  return result.text?.trim() || '';
}

async function transcribeWithDeepgram(
  audioUri: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const bytes = await readAudioBytes(audioUri);
  const { mimeType } = getAudioMetadata(audioUri);
  const query = new URLSearchParams({
    model: 'nova-2',
    language: 'en',
    smart_format: 'true',
    punctuate: 'true',
  });

  const response = await fetchWithTimeout(
    `https://api.deepgram.com/v1/listen?${query.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': mimeType,
      },
      body: bytes.buffer as ArrayBuffer,
    },
    45_000,
    signal
  );

  if (!response.ok) {
    throw await createProviderError('Deepgram transcription', response);
  }

  const result = (await response.json()) as {
    results?: {
      channels?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
    };
  };
  return result.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';
}

export async function transcribeAudio(
  audioUri: string,
  provider: STTProvider,
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error(`No API key configured for ${provider}. Open Settings to add one.`);
  }

  switch (provider) {
    case 'openai_whisper':
      return transcribeWithWhisper(audioUri, apiKey.trim(), signal);
    case 'deepgram':
      return transcribeWithDeepgram(audioUri, apiKey.trim(), signal);
  }
}
