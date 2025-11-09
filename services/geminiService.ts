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
      let errorMessage = `خطا در سرور: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (jsonParseError) {
        // If response.json() fails, it means the server sent a non-JSON error.
        // Read it as plain text for better debugging and display.
        const responseText = await response.text();
        console.error('خطا در تجزیه پاسخ خطا به عنوان JSON. پاسخ خام:', responseText);
        errorMessage = `خطا در سرور (${response.status}): ${responseText || response.statusText}`;
      }
      throw new Error(errorMessage);
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