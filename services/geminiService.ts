
import { GenerateTopicRequest, GenerateTopicResponseChunk } from '../types';

/**
 * Streams generated research topics from the Vercel API Route.
 *
 * @param request The request object containing keywords, field of study, and academic level.
 * @returns An async generator that yields chunks of text and a 'done' status.
 */
export async function* generateTopicsStream(
  request: GenerateTopicRequest,
): AsyncGenerator<GenerateTopicResponseChunk> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `خطا در سرور: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('پاسخ دریافتی خالی است.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete JSON objects from the buffer, each line is expected to be a JSON object
      let lastNewlineIndex;
      while ((lastNewlineIndex = buffer.indexOf('\n')) !== -1) {
        const jsonLine = buffer.substring(0, lastNewlineIndex).trim();
        buffer = buffer.substring(lastNewlineIndex + 1);

        if (jsonLine) {
          try {
            const chunk: GenerateTopicResponseChunk = JSON.parse(jsonLine);
            yield chunk;
          } catch (parseError) {
            console.error('خطا در تجزیه JSON:', parseError, 'خط خام:', jsonLine);
            // In case of malformed JSON, we can skip it or yield an error indication
          }
        }
      }
    }
    // Yield any remaining buffer content as the final chunk, marking it as done.
    // This handles cases where the last chunk might not end with a newline.
    if (buffer.trim()) {
        try {
            const chunk: GenerateTopicResponseChunk = JSON.parse(buffer.trim());
            yield chunk;
        } catch (parseError) {
            console.error('خطا در تجزیه JSON نهایی:', parseError, 'خط خام:', buffer.trim());
        }
    }

    yield { text: '', done: true }; // Signal completion
  } catch (error: unknown) {
    console.error('خطا در generateTopicsStream:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('خطای ناشناخته‌ای در حین تولید موضوعات رخ داد.');
  }
}
    