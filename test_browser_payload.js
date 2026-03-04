const z = require('zod');

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content').max(32_000),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  chatId: z.string().optional(),
  focusMode: z.enum(['All', 'Academic', 'Writing', 'Web']).default('All'),
  isProSearch: z.boolean().default(false),
  modelConfig: z.object({
    temperature: z.number().min(0).max(1).default(0.4),
    modelName: z.enum(['sonar', 'gpt-4o', 'claude-3-5-sonnet', 'grok-2']).default('sonar'),
  }).optional(),
});

const payloadFromBrowser = {
  messages: [
    {
      id: "1719283719827",
      role: "user",
      content: "What is Agentic RAG?",
    },
    {
      id: "1719283719827-ai",
      role: "assistant",
      content: "I don't know.",
      sources: [] 
    },
    {
      id: "1719283719828",
      role: "user",
      content: "Why not?",
    }
  ],
  chatId: null,      // Ah!! React null vs undefined
  focusMode: "All",
  isProSearch: true,
  modelConfig: { modelName: "sonar", temperature: 0.3 }
};

const result = chatRequestSchema.safeParse(payloadFromBrowser);
console.log(result.success ? "Passed" : result.error.issues);
