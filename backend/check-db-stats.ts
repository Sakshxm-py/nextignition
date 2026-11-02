import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const mongoUrl = process.env.MONGODB_URI!;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("--- Supabase Stats ---");
    const tables = ['events', 'users', 'startups', 'conversations', 'messages', 'news_articles', 'podcast_episodes'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table ${table} error: ${error.message}`);
        } else {
            console.log(`Table ${table}: ${count} rows`);
        }
    }

    console.log("\n--- MongoDB Stats ---");
    const client = new MongoClient(mongoUrl);
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
}

run();
