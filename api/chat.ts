import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { AcademicLevel, GenerateTopicRequest } from '../types';
import { GEMINI_MODEL_PRO, getPromptForAcademicLevel } from '../constants';

// Log API_KEY status at the module level for early debugging in Vercel logs
console.log(`Module loaded: API_KEY is ${process.env.API_KEY ? 'defined' : 'NOT defined'} at module level.`);

export default async function (req: VercelRequest, res: VercelResponse) {
  // === Start of top-level try-catch ===
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { keywords, fieldOfStudy, academicLevel }: GenerateTopicRequest = req.body;

    if (!keywords || !fieldOfStudy || !academicLevel) {
      return res.status(400).json({ error: 'Missing required parameters (keywords, fieldOfStudy, academicLevel).' });
    }

    if (
      academicLevel !== AcademicLevel.Masters &&
      academicLevel !== AcademicLevel.PhD
    ) {
      return res.status(400).json({ error: 'Invalid academic level. Must be "کارشناسی ارشد" or "دکتری".' });
    }

    if (!process.env.API_KEY) {
      console.error('SERVER_ERROR: API_KEY environment variable is not set. Please ensure it is configured in Vercel.');
      return res.status(500).json({ error: 'خطای پیکربندی سرور: کلید API Gemini موجود نیست. لطفاً متغیر محیطی API_KEY را در Vercel تنظیم کنید.' });
    }

    // Create a new GoogleGenAI instance for each request to ensure it uses the latest API key from env
    // Moved here to ensure API_KEY check passes before instantiation
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = getPromptForAcademicLevel(academicLevel, fieldOfStudy, keywords);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL_PRO,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7, // A bit creative but still focused
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 2000,
        thinkingConfig: { thinkingBudget: 512 }
      }
    });

    for await (const chunk of stream) {
      const textChunk = chunk.text;
      if (textChunk) {
        // Each chunk should be a complete JSON object followed by a newline
        res.write(JSON.stringify({ text: textChunk, done: false }) + '\n');
      }
    }

    // Signal completion
    res.write(JSON.stringify({ text: '', done: true }) + '\n'); 
    res.end();

  } catch (error: unknown) {
    // Log detailed error information to Vercel logs
    console.error('TOP_LEVEL_SERVER_ERROR: An unhandled error occurred in the Vercel API route.');
    if (error instanceof Error) {
      console.error('TOP_LEVEL_SERVER_ERROR: Error message:', error.message);
      console.error('TOP_LEVEL_SERVER_ERROR: Error stack:', error.stack);
    } else if (typeof error === 'object' && error !== null) {
      console.error('TOP_LEVEL_SERVER_ERROR: Detailed error object:', JSON.stringify(error));
    } else {
      console.error('TOP_LEVEL_SERVER_ERROR: Unknown error type:', error);
    }

    if (!res.headersSent) {
      // If no headers sent, it means the error occurred before streaming started.
      res.status(500).json({
        error: 'خطا در سرور (500): یک خطای غیرمنتظره در اجرای تابع رخ داد. لطفاً لاگ‌های Vercel را برای جزئیات بیشتر بررسی کنید.'
      });
    } else {
      // If headers already sent (streaming started), send an error chunk and end.
      // This ensures the client knows streaming stopped unexpectedly.
      res.write(JSON.stringify({ error: 'یک خطای غیرمنتظره در حین استریم رخ داد.', done: true }) + '\n');
      res.end();
    }
  }
  // === End of top-level try-catch ===
}