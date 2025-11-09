
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { AcademicLevel, GenerateTopicRequest } from '../types';
import { GEMINI_MODEL_PRO, getPromptForAcademicLevel } from '../constants';

export default async function (req: VercelRequest, res: VercelResponse) {
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
    console.error('API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Server configuration error: Gemini API key is missing. Please set the API_KEY environment variable in Vercel.' });
  }

  try {
    // Create a new GoogleGenAI instance for each request to ensure it uses the latest API key from env
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
    console.error('Error calling Gemini API:', error);
    if (!res.headersSent) {
      // If no headers sent, it means the error occurred before streaming started.
      res.status(500).json({ error: 'Failed to generate topics from Gemini API. Please check your API key and network connection.' });
    } else {
      // If headers already sent (streaming started), send an error chunk and end.
      // This ensures the client knows streaming stopped unexpectedly.
      res.write(JSON.stringify({ error: 'An unexpected error occurred during streaming.', done: true }) + '\n');
      res.end();
    }
  }
}
    