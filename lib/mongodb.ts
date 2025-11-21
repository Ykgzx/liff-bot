import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
let client;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error("Add MONGODB_URI to .env");
}

if (process.env.NODE_ENV === "development") {
  // ป้องกันการสร้าง client ซ้ำตอน hot reload
  if (!(global as any)._mongoClient) {
    (global as any)._mongoClient = new MongoClient(uri).connect();
  }
  clientPromise = (global as any)._mongoClient;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export default clientPromise;
