import { LLMProvider, RoleType } from '../types';
import { buildSystemPrompt, buildUserMessage } from '../config/systemPrompts';
import { createProviderError, fetchWithTimeout } from './http';

type ChunkHandler = (partialAnswer: string) => void;

function consumeOpenAIEvent(
  eventText: string,
  currentAnswer: string
): { answer: string; done: boolean } {
  let answer = currentAnswer;
  let done = false;

  for (const line of eventText.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;

    const data = line.slice(5).trim();
    if (!data) continue;
    if (data === '[DONE]') {
      done = true;
      continue;
    }

    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      answer += parsed.choices?.[0]?.delta?.content || '';
    } catch {
      // Keep the buffered stream alive if a provider sends a non-JSON event.
    }
  }

  return { answer, done };
}

async function readOpenAIStream(
  response: Response,
  onChunk: ChunkHandler
): Promise<string> {
  let fullAnswer = '';

  if (!response.body) {
    const rawStream = await response.text();
    for (const event of rawStream.split(/\r?\n\r?\n/)) {
      const result = consumeOpenAIEvent(event, fullAnswer);
      fullAnswer = result.answer;
      if (fullAnswer) onChunk(fullAnswer);
      if (result.done) break;
    }
    return fullAnswer.trim();
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || '';

    for (const event of events) {
      const result = consumeOpenAIEvent(event, fullAnswer);
      fullAnswer = result.answer;
      finished ||= result.done;
      if (fullAnswer) onChunk(fullAnswer);
      if (finished) break;
    }

    if (done) break;
  }

  if (buffer.trim() && !finished) {
    const result = consumeOpenAIEvent(buffer, fullAnswer);
    fullAnswer = result.answer;
    if (fullAnswer) onChunk(fullAnswer);
  }

  return fullAnswer.trim();
}

async function generateWithOpenAI(
  question: string,
  systemPrompt: string,
  apiKey: string,
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: buildUserMessage(question) },
        ],
        max_tokens: 600,
        temperature: 0.7,
        stream: Boolean(onChunk),
      }),
    },
    45_000,
    signal
  );

  if (!response.ok) {
    throw await createProviderError('OpenAI answer', response);
  }

  if (onChunk) {
    return readOpenAIStream(response, onChunk);
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return result.choices?.[0]?.message?.content?.trim() || '';
}

async function generateWithGemini(
  question: string,
  systemPrompt: string,
  apiKey: string,
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    `gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: 'user', parts: [{ text: buildUserMessage(question) }] },
        ],
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7,
        },
      }),
    },
    45_000,
    signal
  );

  if (!response.ok) {
    throw await createProviderError('Gemini answer', response);
  }

  const result = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const answer = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  if (answer && onChunk) onChunk(answer);
  return answer;
}

export async function generateAnswer(
  question: string,
  role: RoleType,
  resume: string,
  jobDescription: string,
  provider: LLMProvider,
  apiKey: string,
  onChunk?: ChunkHandler,
  signal?: AbortSignal
): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error(`No API key configured for ${provider}. Open Settings to add one.`);
  }

  if (!question.trim()) {
    throw new Error('No question detected. Please try recording again.');
  }

  const systemPrompt = buildSystemPrompt(role, resume, jobDescription);
  const answer =
    provider === 'openai'
      ? await generateWithOpenAI(
          question,
          systemPrompt,
          apiKey.trim(),
          onChunk,
          signal
        )
      : await generateWithGemini(
          question,
          systemPrompt,
          apiKey.trim(),
          onChunk,
          signal
        );

  if (!answer) {
    throw new Error('The AI returned an empty answer. Please try again.');
  }

  return answer;
}
