// lib/mongodb.ts
import { MongoClient } from "mongodb";

// ตรวจสอบก่อนใช้งาน
if (!process.env.MONGODB_URI) {
  throw new Error("Please add MONGODB_URI to your environment variables");
}

const uri = process.env.MONGODB_URI; // ✅ ตอนนี้ type คือ string

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri);
    globalWithMongo._mongoClient.connect();
  }
  client = globalWithMongo._mongoClient;
} else {
  client = new MongoClient(uri);
}

export async function getDb() {
  await client.connect();
  return client.db("liffmembership");
}