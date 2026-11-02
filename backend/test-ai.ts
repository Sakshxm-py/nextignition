import { config } from 'dotenv';
import path from 'path';
import axios from 'axios';

config({ path: path.resolve(__dirname, '.env') });

const testOpenRouter = async () => {
    console.log('Testing OpenRouter model:', process.env.OPENROUTER_MODEL);
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free',
                messages: [
                    { role: 'system', content: 'You are an AI assistant.' },
                    { role: 'user', content: 'Give me a 1-sentence sales pitch for a revolutionary new smart coffee mug.' }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('--- OpenRouter Response ---');
        console.log(response.data.choices[0].message.content);
        console.log('---------------------------');
    } catch (e: any) {
        console.error('OpenRouter Error:', e?.response?.data || e.message);
    }
};

const testBytez = async () => {
    console.log('\nTesting Bytez/Gemini directly using Bytez.js API if available or failing gracefully...');
    try {
        const Bytez = require('bytez.js');
        const sdk = new Bytez(process.env.BYTEZ_API_KEY);
        const modelName = process.env.BYTEZ_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
        console.log('Bytez Model:', modelName);
        const model = sdk.model(modelName);

        const { error, output } = await model.run([
            { role: 'system', content: 'You are an AI assistant.' },
            { role: 'user', content: 'Give me a 1-sentence sales pitch for a flying skateboard.' }
        ]);

        if (error) {
            console.error('Bytez Error Returned:', error);
            return;
        }

        console.log('--- Bytez Response ---');
        console.log(output);
        console.log('----------------------');
    } catch (e: any) {
        console.error('Bytez Exception:', e.message);
    }
};

const run = async () => {
    await testOpenRouter();
    await testBytez();
};

run();
