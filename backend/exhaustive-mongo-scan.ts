import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const url = process.env.MONGODB_URI!;

async function run() {
    const client = new MongoClient(url);
    await client.connect();
    
    const adminDb = client.db('admin');
    const dbsInfo = await adminDb.admin().listDatabases();
    console.log("Databases found:", dbsInfo.databases.map(db => db.name));
    
    for (const dbInfo of dbsInfo.databases) {
        const db = client.db(dbInfo.name);
        const collections = await db.listCollections().toArray();
        console.log(`DB: ${dbInfo.name} has ${collections.length} collections.`);
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`  - ${col.name}: ${count} docs`);
        }
    }

    await client.close();
    process.exit(0);
}

run();
