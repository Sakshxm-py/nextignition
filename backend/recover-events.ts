import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.MONGODB_URI!;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const client = new MongoClient(url);
    await client.connect();
    
    const adminDb = client.db('admin');
    const dbsInfo = await adminDb.admin().listDatabases();
    
    for (const dbInfo of dbsInfo.databases) {
        if (dbInfo.name === 'admin' || dbInfo.name === 'local') continue;
        const db = client.db(dbInfo.name);
        const collections = await db.listCollections().toArray();
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            if (count > 0) {
                console.log(`DB: ${dbInfo.name} -> Collection: ${col.name} (${count} documents)`);
            }
        }
    }

    await client.close();
    process.exit(0);
}

run();
