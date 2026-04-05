import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

await Actor.init();

const input = await Actor.getInput() || {};
const maxItems = input.maxItems !== undefined ? input.maxItems : 99999;
const maxScrolls = input.maxScrolls !== undefined ? input.maxScrolls : 999;

const proxyConfiguration = await Actor.createProxyConfiguration();

// Helper to parse "1.3k" -> 1300
function parseMembersCount(str) {
    if (!str) return 0;
    let clean = str.replace(/,/g, '').toLowerCase().replace('members', '').trim();
    let multiplier = 1;
    if (clean.endsWith('k')) {
        multiplier = 1000;
        clean = clean.replace('k', '');
    } else if (clean.endsWith('m')) {
        multiplier = 1000000;
        clean = clean.replace('m', '');
    }
    return Math.floor(parseFloat(clean) * multiplier) || 0;
}

// Helper to parse "$49/month" -> 49
function parseMonthlyPrice(str) {
    if (!str) return 0;
    const match = str.match(/\$([0-9,.]+)/);
    if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
}

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 1000,
    maxConcurrency: 3, // Ograničava na max 3 tabova odjednom da ne bi pukla RAM memorija
    browserPoolOptions: {
        retireBrowserAfterPageCount: 10, // Ristartuje browser svakih 10 uradjenih stranica, čisteći sav iscureli RAM
    },
    headless: true,
    navigationTimeoutSecs: 60,
    
    preNavigationHooks: [
        async ({ page }) => {
            // Block images, fonts, and CSS to drastically reduce CPU usage and speed up page load
            await page.route('**/*', route => {
                const req = route.request();
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                    route.abort().catch(() => {});
                } else {
                    route.continue().catch(() => {});
                }
            });
        }
    ],

    async requestHandler({ page, request, log, enqueueLinks }) {
        // --- 1. Handle Discovery Page ---
        if (request.url.includes('/discovery')) {
            log.info(`Processing discovery page: ${request.url}`);
            
            // Wait for initial load
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(500);
            
            // Scroll down to load more communities
            let previousHeight = 0;
            let noChangeCount = 0;
            for (let i = 0; i < maxScrolls; i++) {
                log.info(`Scrolling down... (${i+1}/${maxScrolls})`);
                await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
                await page.waitForTimeout(1500); // sačeka 1.5s novo učitavanje
                
                const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
                if (currentHeight === previousHeight) {
                    noChangeCount++;
                    if (noChangeCount >= 2) { // mora 2 puta zaredom da omane da bismo prekinuli
                        log.info('Reached the bottom of the discovery page.');
                        break;
                    }
                    log.info('Scroll height unchanged, giving it extra time...');
                    await page.waitForTimeout(1500); // bonus čekanje
                } else {
                    noChangeCount = 0;
                }
                previousHeight = currentHeight;
            }
            
            // NOVO: Routing do drugih kategorija kako bi našao više (ako smo na početnoj discovery stranici)
            if (request.url === 'https://www.skool.com/discovery') {
                const categoryLinks = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a[href]'));
                    const cats = links.map(a => a.getAttribute('href')).filter(h => h && h.includes('?c='));
                    return [...new Set(cats)];
                });
                
                log.info(`Found ${categoryLinks.length} new categories for deep research. Queueing them...`);
                for (const cat of categoryLinks) {
                    let fullUrl = cat.startsWith('http') ? cat : 'https://www.skool.com' + cat;
                    await crawler.addRequests([fullUrl]);
                }
            }
            
            // Extract all community cards
            const communities = await page.evaluate(() => {
                const results = [];
                // Find all anchor tags that look like discovery cards
                const links = document.querySelectorAll('a[href]');
                
                for (const a of links) {
                    const href = a.getAttribute('href');
                    // Ensure it's a community link and not generic
                    if (href && href.startsWith('/') && href.length > 2 && 
                        !href.startsWith('/discovery') && !href.startsWith('/signup') && 
                        !href.startsWith('/login') && !href.startsWith('/about')) {
                        
                        // Clean href (remove UTMs)
                        const cleanHref = href.split('?')[0];
                        
                        // Extract text components softly
                        const text = a.textContent.toLowerCase();
                        
                        // Only get ones that have a price containing $ or month
                        let priceText = '';
                        let membersText = '';
                        
                        // We look for spans that might have price and members
                        const spans = a.querySelectorAll('span');
                        for (const span of spans) {
                            if (span.textContent.includes('$') || span.textContent.toLowerCase().includes('month')) {
                                priceText = span.textContent;
                            }
                            if (span.textContent.toLowerCase().includes('member')) {
                                membersText = span.textContent;
                            }
                        }
                        
                        // If not found in spans, we try a fallback regex on the whole card
                        if (!priceText && text.includes('$')) {
                            const pMatch = a.textContent.match(/\$[0-9,]+(\/month)?/i);
                            if (pMatch) priceText = pMatch[0];
                        }
                        if (!membersText && text.includes('member')) {
                            const mMatch = a.textContent.match(/[0-9.,kKmM]+\s*members?/i);
                            if (mMatch) membersText = mMatch[0];
                        }
                        
                        let finalPath = cleanHref;
                        if (!finalPath.endsWith('/about')) {
                            finalPath = finalPath + '/about';
                        }
                        
                        if (cleanHref && priceText && priceText.includes('$')) {
                            results.push({
                                slug: cleanHref,
                                url: 'https://www.skool.com' + finalPath,
                                priceRaw: priceText,
                                membersRaw: membersText
                            });
                        }
                    }
                }
                return results;
            });
            
            // Remove duplicates
            const uniqueCommunities = [];
            const seen = new Set();
            for (const c of communities) {
                if (!seen.has(c.slug)) {
                    seen.add(c.slug);
                    uniqueCommunities.push(c);
                }
            }
            
            log.info(`Found ${uniqueCommunities.length} PAID communities. Queueing their about pages...`);
            
            // Enqueue paid communities
            let queuedCount = 0;
            for (const c of uniqueCommunities) {
                const checkPrice = parseMonthlyPrice(c.priceRaw);
                if (checkPrice <= 0) {
                    log.info(`Skipping community ${c.slug} because its parsed price is 0`);
                    continue;
                }
                const checkMembers = parseMembersCount(c.membersRaw);
                if (checkMembers < 50) {
                    log.info(`Skipping community ${c.slug} because it has less than 50 members (${checkMembers})`);
                    continue;
                }

                if (queuedCount >= maxItems) {
                    log.info(`Reached maxItems limit of ${maxItems}.`);
                    break;
                }
                
                await crawler.addRequests([{
                    url: c.url,
                    userData: {
                        label: 'COMMUNITY_ABOUT',
                        communityData: c
                    }
                }]);
                queuedCount++;
            }
        } 
        // --- 2. Handle Community About Page ---
        else if (request.userData.label === 'COMMUNITY_ABOUT') {
            log.info(`Scraping Paid Community Details: ${request.url}`);
            
            const { communityData } = request.userData;
            
            // Wait for community page React to hydrate fully (0.5s instead of 3s)
            await page.waitForLoadState('domcontentloaded');
            await page.waitForTimeout(500);
            
            const detail = await page.evaluate(() => {
                const title = document.title || '';
                const bodyText = document.body.textContent || '';
                
                // Get all links
                const allLinks = Array.from(document.querySelectorAll('a[href]'));
                const images = Array.from(document.querySelectorAll('img[alt]'));
                
                // Social Links mapping
                const socialLinks = {
                    instagram: null,
                    facebook: null,
                    youtube: null,
                    tiktok: null,
                    twitter: null,
                    linkedin: null,
                    website: null
                };
                
                // External links to try and find websites and socials
                for (const a of allLinks) {
                    const href = (a.getAttribute('href') || '').toLowerCase();
                    if (!href.startsWith('http') && !href.startsWith('www.')) continue;
                    
                    if (href.includes('instagram.com')) socialLinks.instagram = href;
                    else if (href.includes('facebook.com')) socialLinks.facebook = href;
                    else if (href.includes('youtube.com') || href.includes('youtu.be')) socialLinks.youtube = href;
                    else if (href.includes('tiktok.com')) socialLinks.tiktok = href;
                    else if (href.includes('twitter.com') || href.includes('x.com')) socialLinks.twitter = href;
                    else if (href.includes('linkedin.com')) socialLinks.linkedin = href;
                    else if (!href.includes('skool.com')) socialLinks.website = href; // taking first non-skool link as website
                }
                
                // Fallback: Use Regex to find unlinked text URLs in the description body
                const regexes = {
                    instagram: /instagram\.com\/[^\s\"\'\<\>\)]+/i,
                    facebook: /facebook\.com\/[^\s\"\'\<\>\)]+/i,
                    youtube: /(youtube\.com|youtu\.be)\/[^\s\"\'\<\>\)]+/i,
                    tiktok: /tiktok\.com\/(@)?[^\s\"\'\<\>\)]+/i,
                    twitter: /(twitter\.com|x\.com)\/[^\s\"\'\<\>\)]+/i,
                    linkedin: /linkedin\.com\/in\/[^\s\"\'\<\>\)]+/i
                };

                for (const [key, regex] of Object.entries(regexes)) {
                    if (!socialLinks[key]) {
                        const match = bodyText.match(regex);
                        if (match) {
                            socialLinks[key] = match[0].startsWith('http') ? match[0] : 'https://www.' + match[0];
                        }
                    }
                }
                
                // Final fallback for purely text website
                if (!socialLinks.website) {
                    const anyDomain = bodyText.match(/(https?:\/\/[^\s\"\'\<\>\)]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                    if (anyDomain) {
                        const d = anyDomain[0].toLowerCase();
                        if (!d.includes('skool.com') && !d.includes('instagram.com') && !d.includes('facebook') && !d.includes('youtube') && !d.includes('tiktok') && !d.includes('twitter') && !d.includes('x.com')) {
                            socialLinks.website = d.startsWith('http') ? d : 'https://' + d;
                        }
                    }
                }
                
                // Founder info: Skool usually puts founder name in the alt attribute of an avatar image next to "By <name>"
                let founderName = null;
                for (const img of images) {
                    const alt = img.getAttribute('alt');
                    // Skip generic alts
                    if (alt && alt.length > 2 && alt !== 'Skool' && !title.includes(alt)) {
                        founderName = alt;
                        break;
                    }
                }
                
                return {
                    title: title.replace(' | Skool', '').trim(),
                    description: bodyText.substring(0, 1000).replace(/\n\s*\n/g, '\n').trim(),
                    socialLinks,
                    founderName
                };
            });
            
            const membersCount = parseMembersCount(communityData.membersRaw);
            const monthlyPrice = parseMonthlyPrice(communityData.priceRaw);
            const averageMRR = membersCount * monthlyPrice;
            
            if (monthlyPrice <= 0) {
                log.info(`Skipping saving dataset for ${request.url} because monthlyPrice = 0`);
                return; // Sigurna provera da nista ne kosta 0 na izlazu
            }
            if (membersCount < 50) {
                log.info(`Skipping saving dataset for ${request.url} because it has less than 50 members (${membersCount})`);
                return;
            }
            
            const finalDataset = {
                communityName: detail.title || communityData.slug.replace(/\//g, ''),
                communityLink: request.url.replace('/about', ''), // Main community link
                founderName: detail.founderName || 'Not Found',
                membersCount: membersCount,
                monthlyPrice: monthlyPrice,
                averageMRR: averageMRR,
                courseNumbers: 'N/A - Hidden in Paid Communities',
                communityInfo: detail.description.substring(0, 500) + '...',
                socialMedia: {
                    instagram: detail.socialLinks.instagram || 'N/A',
                    facebook: detail.socialLinks.facebook || 'N/A',
                    youtube: detail.socialLinks.youtube || 'N/A',
                    tiktok: detail.socialLinks.tiktok || 'N/A',
                    website: detail.socialLinks.website || 'N/A'
                }
            };
            
            await Actor.pushData(finalDataset);
        }
    },
    
    // Failed requests
    failedRequestHandler({ request, log }) {
        log.error(`Request ${request.url} failed too many times.`);
    },
});

await crawler.run(['https://www.skool.com/discovery']);
await Actor.exit();
