
import axios from 'axios';
const API_URL = 'http://localhost:5000/api';

async function diagnose() {
    console.log('--- Diagnosis Start ---');
    try {
        const health = await axios.get(`${API_URL}/auth/me`).catch(e => e.response);
        console.log('Auth API Status:', health ? health.status : 'Offline');

        // Test pipeline endpoint if possible (needs token)
        // For now, just check if the server is responsive
        const routes = [
            '/startups',
            '/communities',
            '/ai/chat'
        ];
        for (const route of routes) {
            const res = await axios.get(`${API_URL}${route}`).catch(e => e.response);
            console.log(`Route ${route}:`, res ? res.status : 'No response');
        }

    } catch (error) {
        console.error('Diagnosis failed:', error.message);
    }
    console.log('--- Diagnosis End ---');
}

diagnose();
