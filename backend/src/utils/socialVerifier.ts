import axios from 'axios';

/**
 * Verifies if a social account exists by checking URL reachability.
 * For GitHub, it uses the public API.
 * For others, it attempts a GET request with a browser-like User-Agent.
 * 
 * @param platform Platform name: linkedin, twitter, github, instagram, website
 * @param url Full profile URL
 * @returns boolean true if account appears to exist, false otherwise
 */
export const verifySocialAccount = async (platformRaw: string, url: string): Promise<boolean> => {
    const platform = String(platformRaw || '').toLowerCase();
    console.log(`[SocialVerifier] Checking: ${platform} at ${url}`);
    try {
        // Simple URL structure check
        if (!/^https?:\/\//i.test(url)) {
            console.warn('[SocialVerifier] Invalid URL format (missing https://)');
            return false;
        }

        // Platform-specific logic
        if (platform === 'github') {
            const username = url.split('github.com/')[1]?.split('/')[0];
            if (username) {
                const apiRes = await axios.get(`https://api.github.com/users/${username}`, {
                    validateStatus: (status) => status === 200 || status === 404,
                });
                console.log(`[SocialVerifier] GitHub API: ${apiRes.status}`);
                return apiRes.status === 200;
            }
        }

        if (platform === 'twitter') {
            const usernameMatch = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
            if (usernameMatch && usernameMatch[1]) {
                const username = usernameMatch[1];
                try {
                    const apiRes = await axios.get(`https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${username}`);
                    
                    // The syndication API will return an empty string/object instead of an array if the user does NOT exist,
                    // and it will return an array with an object containing user data if they DO exist.
                    if (Array.isArray(apiRes.data) && apiRes.data.length > 0) {
                        return true;
                    }
                    
                    // If it returned data but it's not a populated array, they likely don't exist
                    return false;
                } catch (e) {
                    // Fallback if widget API fails
                }
            }
        }

        if (platform === 'instagram') {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    },
                    timeout: 8000,
                    validateStatus: () => true
                });
                if (response.status === 404) return false;
                
                const html = String(response.data || '');
                // Fake/deleted accounts often return a generic 200 "Instagram" login-like page without "photos and videos"
                if (html.includes('<title>Instagram</title>') && !html.includes('photos and videos')) {
                    return false;
                }
                if (html.toLowerCase().includes('page not found')) {
                    return false;
                }
                return true; 
            } catch (e: any) {
                if (e.response?.status === 404) return false;
            }
        }

        if (platform === 'linkedin') {
            try {
                // Use a proxy API since LinkedIn aggressive blocks raw HTTP requests with 999.
                // Microlink will return "Sign Up | LinkedIn" if the profile is invalid.
                const mlRes = await axios.get(`https://api.microlink.io?url=${encodeURIComponent(url)}`, {
                    timeout: 10000,
                    validateStatus: () => true
                });
                
                if (mlRes.data?.status === 'success') {
                    const title = String(mlRes.data.data?.title || '');
                    
                    if (title.includes('Sign Up | LinkedIn') || title.includes('Page Not Found') || title.includes('Security Verification')) {
                        return false; 
                    }
                    if (title && title.includes('| LinkedIn')) {
                        return true;
                    }
                }
            } catch (e) {
                // Ignore microlink fetch errors and fallthrough
            }
        }

        // Default behavior: check URL reachability for website, linkedin, etc.
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 8000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500 || status === 999, // allow 4xx to be handled manually, 999 for linkedin
        });

        if (response.status === 404) return false;
        
        // If LinkedIn blocks us entirely with 999, we'll validate the regex.
        // It's highly restrictive on real-time bot checking, so we assume valid if format matches.
        if (platform === 'linkedin' && response.status === 999) {
            return /linkedin\.com\/(in|company)\/[\w-]+\/?/.test(url);
        }

        if (response.status >= 400 && response.status !== 403 && response.status !== 401 && response.status !== 999) return false;

        const html = String(response.data || '').toLowerCase();

        // Basic check for common "not found" indicators in HTML content
        const notFoundPatterns = [
            'page not found',
            'this account doesn\'t exist',
            'account not found',
            'page isn\'t available',
            'broken link'
        ];

        if (platform === 'linkedin' && (html.includes('profile not found') || html.includes('not found'))) return false;

        // If it's a 403/401/999 but the URL looks correct, assume valid due to bot protection
        if (response.status === 403 || response.status === 401 || response.status === 999) {
            return true;
        }

        return true;
    } catch (error: any) {
        // Network errors or timeouts
        if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
            console.error(`Network error/timeout for ${platform}:`, error.message);
        } else {
            console.error(`Scraper error for ${platform}:`, error.message);
        }
    }

    // FINAL FALLBACK: If real checks failed/blocked, trust URL pattern as last resort
    const fallbackPatterns: Record<string, RegExp> = {
        linkedin: /linkedin\.com\/(in|company)\/[\w-]+\/?/i,
        twitter: /(twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}/i,
        github: /github\.com\/[a-zA-Z0-9-]{1,39}/i,
        instagram: /instagram\.com\/[a-zA-Z0-9._]{1,30}/i,
        website: /^https?:\/\//i
    };

    if (platform && fallbackPatterns[platform] && fallbackPatterns[platform].test(url)) {
        console.log(`[SocialVerifier] Final fallback match for ${platform}: ${url}`);
        return true;
    }

    console.warn(`[SocialVerifier] All verification methods failed for ${platform}: ${url}`);
    return false;
};
