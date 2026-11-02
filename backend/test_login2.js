const run = async () => {
    try {
        const res = await fetch('https://nextignition-l3b5.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'expert1@example.com', password: 'password123' })
        });
        const data = await res.json();
        console.log('Login:', data);

        const chatRes = await fetch('https://nextignition-l3b5.onrender.com/api/ignition/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + data.token },
            body: JSON.stringify({ message: 'hi' })
        });
        const chatData = await chatRes.text();
        console.log('Chat Status:', chatRes.status);
        console.log('Chat:', chatData);
    } catch (e) {
        console.error(e);
    }
};
run();
