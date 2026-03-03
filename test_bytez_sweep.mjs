import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';
dotenv.config();

const provider = createOpenAI({
  apiKey: process.env.BYTEZ_API_KEY, 
  baseURL: 'https://api.bytez.com/v1',
});

const candidates = [
  'meta-llama/Llama-2-7b-chat-hf',
  'meta-llama/Meta-Llama-3-8B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.2',
  'Qwen/Qwen1.5-7B-Chat',
  'google/gemma-7b-it',
  'HuggingFaceH4/zephyr-7b-beta',
  'openai/gpt-3.5-turbo'
];

async function main() {
  for (const modelId of candidates) {
    console.log(`Checking ${modelId}...`);
    try {
      const result = await streamText({
        model: provider(modelId),
        messages: [{ role: 'user', content: 'Say "Working".' }],
        temperature: 0.1,
      });

      let resOutput = '';
      for await (const chunk of result.textStream) {
        resOutput += chunk;
      }
      console.log(`✅ Success for ${modelId}: "${resOutput}"\n`);
      return; // Stop on first success
    } catch (e) {
      const errStr = e.message || String(e);
      if (errStr.includes('404')) {
        console.log(`  ❌ 404 Not Found\n`);
      } else {
        console.log(`  ❌ Error:`, errStr.substring(0, 100), '\n');
      }
    }
  }
}

main();
