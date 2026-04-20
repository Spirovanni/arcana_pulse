require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

async function main() {
  const client = new Client();
  client
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT)
      .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
      console.log('Creating attribute `membershipType` on users collection...');
      await databases.createStringAttribute(
          process.env.APPWRITE_DATABASE_ID || 'arcana_pulse',
          'users',
          'membershipType',
          50,
          false,
          'standard'
      );
      console.log('Successfully requested attribute creation.');
  } catch (error) {
      if (error.code === 409) {
          console.log('Attribute membershipType already exists.');
      } else {
          console.error('Error creating attribute:', error.message);
      }
  }
}

main();
