import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';
dotenv.config();

// Standard OpenAI gateway (since BYTez is failing/unauthorized)
const fallbackProvider = createOpenAI({
  apiKey: process.env.BYTEZ_API_KEY, 
  baseURL: 'https://api.bytez.com/v1',
});

async function main() {
  try {
    const result = await streamText({
      model: fallbackProvider('meta-llama/Meta-Llama-3-8B-Instruct'), // Known working open-source model string usually supported by Bytez
      messages: [{ role: 'user', content: 'Say "Working".' }],
      temperature: 0.1,
    });

    let resOutput = '';
    for await (const chunk of result.textStream) {
      resOutput += chunk;
    }
    console.log(`✅ Output: "${resOutput}"\n`);
  } catch (e) {
    console.log(`❌ Failed:`, e.message, '\n');
  }
}

main();
