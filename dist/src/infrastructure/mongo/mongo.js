"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMongoCollections = initializeMongoCollections;
exports.getMongoDb = getMongoDb;
exports.closeMongoConnection = closeMongoConnection;
const mongodb_1 = require("mongodb");
const env_1 = require("../../config/env");
const requiredCollections = ['chat_rooms', 'chat_messages', 'activity_streams'];
let client;
let db;
async function initializeMongoCollections() {
    if (!env_1.env.mongoUrl) {
        return;
    }
    client = new mongodb_1.MongoClient(env_1.env.mongoUrl);
    await client.connect();
    db = client.db();
    const existingCollections = await db.listCollections().toArray();
    const existingNames = new Set(existingCollections.map((collection) => collection.name));
    for (const collectionName of requiredCollections) {
        if (!existingNames.has(collectionName)) {
            await db.createCollection(collectionName);
        }
    }
    await Promise.all([
        db.collection('chat_rooms').createIndex({ directKey: 1 }, { unique: true, sparse: true }),
        db.collection('chat_rooms').createIndex({ participants: 1, lastMessageAt: -1 }),
        db.collection('chat_messages').createIndex({ roomId: 1, createdAt: -1 }),
        db.collection('chat_messages').createIndex({ roomId: 1, isRead: 1, senderId: 1 }),
        db.collection('activity_streams').createIndex({ createdAt: -1 }),
        db.collection('activity_streams').createIndex({ actionType: 1, createdAt: -1 }),
        db.collection('activity_streams').createIndex({ facilityId: 1, createdAt: -1 }),
    ]);
}
function getMongoDb() {
    return db;
}
async function closeMongoConnection() {
    await client?.close();
    client = undefined;
    db = undefined;
}
