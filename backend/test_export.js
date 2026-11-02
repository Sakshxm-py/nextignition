const { verifySocialAccount } = require('./dist/utils/socialVerifier');

async function test() {
    let li1 = await verifySocialAccount('linkedin', 'https://www.linkedin.com/in/rohan-untawale-76');
    console.log('rohan:', li1);

    let tw1 = await verifySocialAccount('twitter', 'https://twitter.com/asdfasdfasdfasdfasdf');
    console.log('twitter asdf:', tw1);

    let ig1 = await verifySocialAccount('instagram', 'https://instagram.com/nonexistent999999xyz');
    console.log('instagram fake:', ig1);
}
test();
