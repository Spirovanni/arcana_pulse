const { Client, Storage, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function testStorage() {
  try {
    const bucket = await storage.updateBucket('69b6148a000ce565e917', 'Arcana_bucket_01', ['read("any")']);
    console.log('Bucket permissions updated to:', bucket.$permissions);
  } catch (err) {
    console.error('API error:', err.message);
  }
}

testStorage();
