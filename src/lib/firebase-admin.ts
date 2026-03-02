import * as admin from 'firebase-admin';

let app;

// Ensure we only initialize once, even with Next.js fast refresh/build workers
if (!admin.apps.length) {
  try {
    const pk = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (pk && process.env.FIREBASE_PROJECT_ID) {
        app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: pk,
            }),
        });
    } else {
        app = admin.initializeApp({ projectId: 'demo-next-build' });
    }
  } catch (error) {
    console.warn('Firebase admin intialization gracefully caught:', error);
    app = admin.app(); // grab default if it somehow threw 'already exists'
  }
} else {
  app = admin.app();
}

const db = admin.firestore();

export { db, admin };
