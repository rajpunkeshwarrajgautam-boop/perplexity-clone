import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { vectorSearch } from '@/lib/vector-store';

const bytezProvider = createOpenAI({
  apiKey: process.env.BYTEZ_API_KEY,
  baseURL: 'https://api.bytez.com/v1'
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const latestMessage = messages[messages.length - 1];

  let searchResults: any[] = [];
  try {
    searchResults = await vectorSearch(latestMessage.content, 4);
  } catch (err) {
    console.error('Vector search failed or not initialized', err);
  }
  
  // Format citations header
  let citationsHeader = '';
  let contextString = '';

  if (searchResults.length > 0) {
    citationsHeader = '### 📚 Sources Found:\n\n';
    searchResults.forEach((res, index) => {
      citationsHeader += `- **[${index + 1}]** \`${res.doc.filename.replace('.pdf', '')}\` (relevance: ${(res.score*100).toFixed(0)}%)\n`;
      contextString += `[Source ${index + 1}: ${res.doc.filename}]\n${res.doc.content}\n\n`;
    });
    citationsHeader += '---\n\n';
  }

  const fullMessages = [
    {
      role: 'system',
      content: 
        `You are a highly accurate, concise AI assistant similar to Perplexity. You ALWAYS prioritize the provided context segments below to answer questions. 
If the context segments don't contain the answer, state that, then try your best.
ALWAYS use Markdown to format your response. Use bolding and bullet points for readability.

--- Context Segments ---
${contextString}`
    },
    ...messages,
  ];

  const result = streamText({
    model: bytezProvider('gpt-4o-mini'),
    messages: fullMessages,
  });

  return result.toDataStreamResponse();
}
