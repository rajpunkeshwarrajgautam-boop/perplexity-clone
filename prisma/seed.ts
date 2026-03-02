import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a User
  const user = await prisma.user.upsert({
    where: { email: 'admin@perplexityclone.local' },
    update: {},
    create: {
      email: 'admin@perplexityclone.local',
      name: 'RAG Admin',
    },
  });

  // Create a Chat Session for the user
  const chat = await prisma.chat.create({
    data: {
      title: 'First RAG Conversation',
      userId: user.id,
      messages: {
        create: [
          { role: 'user', content: 'What is RAG?' },
          { role: 'assistant', content: 'Retrieval-Augmented Generation (RAG) is an AI architecture that retrieves context from a local vector store before generating an answer.' },
        ],
      },
    }
  });

  console.log(`Database seeded with test user [${user.email}] and sample chat.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
