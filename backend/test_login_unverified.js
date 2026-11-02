const axios = require('axios');

const testLogin = async () => {
    try {
        const payload = {
            email: 'test_verify@example.com',
            password: 'Password123!'
        };

        console.log('--- TESTING LOGIN (UNVERIFIED) ---');
        const res = await axios.post('http://localhost:5000/api/auth/login', payload);
        console.log('Response Status:', res.status);
    } catch (error) {
        console.log('Response Status:', error.response?.status);
        console.log('Response Data:', JSON.stringify(error.response?.data, null, 2));

        if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
            console.log('\nSUCCESS: Login blocked for unverified user.');
        } else {
            console.error('\nFAILURE: Login was not blocked correctly.');
        }
    }
};

testLogin();
