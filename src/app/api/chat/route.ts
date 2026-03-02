import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { vectorSearch } from '@/lib/vector-store';
import { db } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';



export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bytezProvider = createOpenAI({
    apiKey: process.env.BYTEZ_API_KEY,
    baseURL: 'https://api.bytez.com/v1'
  });

  const { messages, chatId } = await req.json();
  const latestMessage = messages[messages.length - 1];

  let currentChatId = chatId;
  
  if (!currentChatId) {
    const chatRef = await db.collection('chats').add({
      title: latestMessage.content.substring(0, 50),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    currentChatId = chatRef.id;
  } else {
    await db.collection('chats').doc(currentChatId).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.log('Chat update error (might not exist)', err));
  }

  await db.collection('chats').doc(currentChatId).collection('messages').add({
    role: 'user',
    content: latestMessage.content,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  let searchResults: any[] = [];
  try {
    searchResults = await vectorSearch(latestMessage.content, 4);
  } catch (err) {
    console.error('Vector search failed or not initialized', err);
  }
  
  let citationsHeader = '';
  let contextString = '';

  if (searchResults.length > 0) {
    citationsHeader = '### 📚 Sources Found:\n\n';
    searchResults.forEach((res, index) => {
      citationsHeader += `- **[${index + 1}]** \`${res.doc.filename?.replace('.pdf', '') || res.doc.metadata?.source || 'Source'}\` (relevance: ${(res.score*100).toFixed(0)}%)\n`;
      contextString += `[Source ${index + 1}: ${res.doc.filename || res.doc.metadata?.source || 'Source'}]\n${res.doc.content}\n\n`;
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
    messages: fullMessages as any,
    onFinish: async (info) => {
       const aiMessage = citationsHeader + info.text;
       await db.collection('chats').doc(currentChatId).collection('messages').add({
        role: 'assistant',
        content: aiMessage,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

  // Attach chatId as metadata chunk 0 on the generic stream
  const response = result.toTextStreamResponse();
  const reader = response.body?.getReader();
  
  if (!reader) return response;

  const stream = new ReadableStream({
    async start(controller) {
      // Send chat ID first
      controller.enqueue(new TextEncoder().encode(`e:${JSON.stringify({ chatId: currentChatId })}\n`));
      
      // Send citations block first
      if (citationsHeader) {
          controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(citationsHeader)}\n`));
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    }
  });

  return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
