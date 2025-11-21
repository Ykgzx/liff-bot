import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Add MONGODB_URI to .env');
}

const uri = process.env.MONGODB_URI;
let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  // ใช้ globalThis เพื่อป้องกันการสร้าง connection ซ้ำใน dev
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  client = await globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  await client.connect();
}

export default client;