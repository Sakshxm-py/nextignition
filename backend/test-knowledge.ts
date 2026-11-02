import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecretkey123';
const API_URL = 'https://nextignition-l3b5.onrender.com/api/knowledge-content';

const test = async () => {
    try {
        const token = jwt.sign({ id: 'test-user-id', role: 'expert' }, JWT_SECRET);
        console.log('Testing with token:', token);
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success:', response.data);
    } catch (error: any) {
        console.log('Error status:', error.response?.status);
        console.log('Error message:', error.response?.data?.message || error.message);
    }
};

test();
