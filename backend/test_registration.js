const axios = require('axios');

const testRegistration = async () => {
    try {
        const payload = {
            name: 'Final Test User',
            email: 'final_test_' + Date.now() + '@example.com',
            password: 'Password123!',
            role: 'founder'
        };

        console.log('--- TESTING FINAL REGISTRATION (NEW EMAIL) ---');
        const res = await axios.post('http://localhost:5000/api/auth/register', payload);
        console.log('Response Status:', res.status);
        console.log('Response Data:', JSON.stringify(res.data, null, 2));

        if (res.data.requiresVerification) {
            console.log('\nSUCCESS: Registration requires verification.');
            console.log('Please check your Mailtrap inbox for the OTP.');
        }
    } catch (error) {
        console.error('Error during registration test:', error.response?.data || error.message);
    }
};

testRegistration();
