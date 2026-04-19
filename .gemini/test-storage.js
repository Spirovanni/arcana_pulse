const { Client, Storage, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env.local' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function testStorage() {
  try {
    console.log('Listing buckets...');
    const result = await storage.listBuckets();
    console.log(`Found ${result.total} buckets.`);
    result.buckets.forEach(b => console.log(' - ' + b.$id + ' : ' + b.name));
  } catch (err) {
    console.error('API error:', err.message);
  }
}

testStorage();
