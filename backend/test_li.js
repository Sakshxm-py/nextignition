const axios = require('axios');

async function testLinkedIn(url) {
    try {
        const mlRes = await axios.get(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
            timeout: 10000,
            validateStatus: () => true
        });
        
        console.log("mlRes title:", mlRes.data?.data?.title);

        if (mlRes.data?.status === 'success') {
            const title = String(mlRes.data.data?.title || '');
            
            if (title.includes('Sign Up | LinkedIn') || title.includes('Page Not Found') || title.includes('Security Verification')) {
                console.log("Returning FALSE for title:", title);
                return false; 
            }
            if (title && title.includes('| LinkedIn')) {
                console.log("Returning TRUE for title:", title);
                return true;
            }
        }
    } catch (e) {
        console.log("error:", e.message);
    }
    console.log("Falling back");

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
        timeout: 8000,
        validateStatus: (status) => status < 500 || status === 999
    });

    console.log("Response status:", response.status);

    if (response.status === 999) {
        const isValidFormat = /linkedin\.com\/(in|company)\/[\w-]+\/?/.test(url);
        console.log("Regex fallback:", isValidFormat);
        return isValidFormat;
    }

    return true;
}

async function run() {
    console.log("\n--- Testing rohan ---");
    let res1 = await testLinkedIn('https://www.linkedin.com/in/rohan-untawale-76');
    console.log("Final rohan:", res1);
    
    console.log("\n--- Testing invalid ---");
    let res2 = await testLinkedIn('https://www.linkedin.com/in/asdfasdfasdfasdfasdf');
    console.log("Final invalid:", res2);

    console.log("\n--- Testing valid gates ---");
    let res3 = await testLinkedIn('https://www.linkedin.com/in/williamhgates');
    console.log("Final gates:", res3);
}

run();
