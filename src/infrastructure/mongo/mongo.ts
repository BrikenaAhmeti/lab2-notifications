import { MongoClient } from 'mongodb';

import { env } from '../../config/env';

const requiredCollections = ['chat_rooms', 'chat_messages', 'activity_streams'];

let client: MongoClient | undefined;

export async function initializeMongoCollections() {
    if (!env.mongoUrl) {
        return;
    }

    client = new MongoClient(env.mongoUrl);
    await client.connect();

    const db = client.db();
    const existingCollections = await db.listCollections().toArray();
    const existingNames = new Set(existingCollections.map((collection) => collection.name));

    for (const collectionName of requiredCollections) {
        if (!existingNames.has(collectionName)) {
            await db.createCollection(collectionName);
        }
    }
}

export async function closeMongoConnection() {
    await client?.close();
}
