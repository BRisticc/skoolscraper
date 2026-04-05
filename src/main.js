import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { generateStartUrls } from './niches.js';

await Actor.init();

const input = await Actor.getInput() || {};
const maxItems = input.maxItems !== undefined ? input.maxItems : 99999;
const maxScrolls = input.maxScrolls !== undefined ? input.maxScrolls : 999;

// Existing URLs from Google Sheet for deduplication
const existingUrls = input.existingUrls || [];
const existingUrlsSet = new Set(existingUrls.map(u => u.toLowerCase().replace('/about', '').split('?')[0].trim()));

// Track processed communities across requests to avoid duplicates within a run
const processedInThisRun = new Set();
let totalSaved = 0;

const proxyConfiguration = await Actor.createProxyConfiguration();

function parseMembersCount(str) {
    if (!str) return 0;
    let clean = str.replace(/,/g, '').toLowerCase().replace('members', '').trim();
    let multiplier = 1;
    if (clean.endsWith('k')) { multiplier = 1000; clean = clean.replace('k', ''); }
    else if (clean.endsWith('m')) { multiplier = 1000000; clean = clean.replace('m', ''); }
    return Math.floor(parseFloat(clean) * multiplier) || 0;
}

function parseMonthlyPrice(str) {
    if (!str) return 0;
    const match = str.match(/\$([0-9,.]+)/);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
    return 0;
}

// ============================================================
// SCRAPE A SINGLE COMMUNITY ABOUT PAGE
// Called directly from the discovery handler — no queue needed!
// ============================================================
async function scrapeCommunityAbout(context, communityData, log) {
    const aboutUrl = communityData.url;
    const slug = aboutUrl.split('/')[3] || aboutUrl;

    // Skip if already processed in this run
    const normalizedUrl = aboutUrl.toLowerCase().replace('/about', '').split('?')[0];
    if (processedInThisRun.has(normalizedUrl)) {
        log.info(`[SKIP-DUPLICATE] Already processed in this run: ${slug}`);
        return;
    }
    // Skip if already in our Google Sheet
    if (existingUrlsSet.has(normalizedUrl)) {
        log.info(`[SKIP-DB] Already in database: ${slug}`);
        return;
    }

    const membersCount = parseMembersCount(communityData.membersRaw);
    const monthlyPrice = parseMonthlyPrice(communityData.priceRaw);

    if (monthlyPrice <= 0) { log.info(`[SKIP-FREE] ${slug} is free`); return; }
    if (membersCount < 50) { log.info(`[SKIP-SIZE] ${slug} has ${membersCount} members`); return; }

    processedInThisRun.add(normalizedUrl);

    // Open a new tab for this community
    const communityPage = await context.newPage();
    try {
        // Block resources for speed
        await communityPage.route('**/*', route => {
            if (['image', 'stylesheet', 'font', 'media'].includes(route.request().resourceType())) {
                route.abort().catch(() => {});
            } else {
                route.continue().catch(() => {});
            }
        });

        log.info(`[SCRAPING] ${slug} (${membersCount} members, $${monthlyPrice}/mo)`);
        await communityPage.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await communityPage.waitForTimeout(800);

        const detail = await communityPage.evaluate(() => {
            const title = document.title || '';
            const bodyText = document.body.textContent || '';
            const allLinks = Array.from(document.querySelectorAll('a[href]'));
            const images = Array.from(document.querySelectorAll('img[alt]'));

            const socialLinks = { instagram: null, facebook: null, youtube: null, tiktok: null, twitter: null, linkedin: null, website: null };

            for (const a of allLinks) {
                const href = (a.getAttribute('href') || '').toLowerCase();
                if (!href.startsWith('http') && !href.startsWith('www.')) continue;
                if (href.includes('instagram.com')) socialLinks.instagram = href;
                else if (href.includes('facebook.com') && !href.includes('facebook.com/sharer')) socialLinks.facebook = href;
                else if (href.includes('youtube.com') || href.includes('youtu.be')) socialLinks.youtube = href;
                else if (href.includes('tiktok.com')) socialLinks.tiktok = href;
                else if (href.includes('twitter.com') || href.includes('x.com')) socialLinks.twitter = href;
                else if (href.includes('linkedin.com')) socialLinks.linkedin = href;
                else if (!href.includes('skool.com')) { if (!socialLinks.website) socialLinks.website = href; }
            }

            // Regex fallbacks for unlinked URLs
            const regexes = {
                instagram: /instagram\.com\/[^\s\"\'<>\)]+/i,
                youtube: /(youtube\.com|youtu\.be)\/[^\s\"\'<>\)]+/i,
                tiktok: /tiktok\.com\/(@)?[^\s\"\'<>\)]+/i,
                linkedin: /linkedin\.com\/in\/[^\s\"\'<>\)]+/i
            };
            for (const [key, regex] of Object.entries(regexes)) {
                if (!socialLinks[key]) {
                    const match = bodyText.match(regex);
                    if (match) socialLinks[key] = match[0].startsWith('http') ? match[0] : 'https://' + match[0];
                }
            }
            if (!socialLinks.website) {
                const anyDomain = bodyText.match(/(https?:\/\/[^\s\"\'<>\)]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                if (anyDomain) {
                    const d = anyDomain[0].toLowerCase();
                    if (!d.includes('skool.com') && !d.includes('instagram.com') && !d.includes('facebook') && !d.includes('youtube') && !d.includes('tiktok') && !d.includes('twitter') && !d.includes('x.com')) {
                        socialLinks.website = d.startsWith('http') ? d : 'https://' + d;
                    }
                }
            }

            // Founder name from avatar alt
            let founderName = null;
            for (const img of images) {
                const alt = img.getAttribute('alt');
                if (alt && alt.length > 2 && alt !== 'Skool' && !title.includes(alt)) { founderName = alt; break; }
            }

            return {
                title: title.replace(' | Skool', '').trim(),
                description: bodyText.substring(0, 1000).replace(/\n\s*\n/g, '\n').trim(),
                socialLinks,
                founderName
            };
        });

        // Language filter
        const textToCheck = (detail.description + ' ' + detail.title).toLowerCase();
        const nonEnglishPatterns = [
            /\b(comunidad|aprende|negocio|dinero|gratis|bienvenid|curso|ayuda|emprender|ganar|vender|español|únete|cómo)\b/,
            /\b(benvenut|impara|comunità|gratuito|corso|lavoro|vendere|gruppo|italiano|guadagn)\b/,
            /\b(comunidade|aprenda|negócio|dinheiro|trabalh|português|ganhar)\b/,
            /\b(communauté|apprendre|gratuit|travail|vendre|français|bienvenue)\b/,
            /\b(willkommen|lernen|kostenlos|verdienen|deutsch|gemeinschaft)\b/,
        ];
        if (nonEnglishPatterns.some(p => p.test(textToCheck)) || /[ñçüöäãõàèìòùáéíóúâêîôû]{2,}/.test(textToCheck)) {
            log.info(`[SKIP-LANG] ${slug} - non-English detected`);
            return;
        }

        const averageMRR = membersCount * monthlyPrice;
        const finalDataset = {
            communityName: detail.title || slug,
            communityLink: aboutUrl.replace('/about', ''),
            founderName: detail.founderName || 'Not Found',
            membersCount,
            monthlyPrice,
            averageMRR,
            communityInfo: detail.description.substring(0, 500) + '...',
            website: detail.socialLinks.website || 'N/A',
            linkedin: detail.socialLinks.linkedin || 'N/A',
            instagram: detail.socialLinks.instagram || 'N/A',
            youtube: detail.socialLinks.youtube || 'N/A',
            tiktok: detail.socialLinks.tiktok || 'N/A',
            facebook: detail.socialLinks.facebook || 'N/A',
        };

        await Actor.pushData(finalDataset);
        totalSaved++;
        log.info(`✅ SAVED [${totalSaved}] "${finalDataset.communityName}" | $${monthlyPrice}/mo | ${membersCount} members | MRR: $${averageMRR}`);

    } catch (err) {
        log.warning(`[ERROR] Failed to scrape ${aboutUrl}: ${err.message}`);
    } finally {
        await communityPage.close().catch(() => {});
    }
}

// ============================================================
// CRAWLER — Only handles Discovery pages
// Communities are processed INLINE (no queue needed)
// ============================================================
const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 999999,
    maxConcurrency: 5,
    browserPoolOptions: {
        retireBrowserAfterPageCount: 20,
    },
    headless: true,
    navigationTimeoutSecs: 60,
    requestHandlerTimeoutSecs: 600, // 10 min per discovery page (includes inline community scraping)

    preNavigationHooks: [
        async ({ page }) => {
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

    async requestHandler({ page, request, log }) {
        log.info(`Processing discovery: ${request.url}`);

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Scroll to load all communities on this discovery page
        let previousHeight = 0;
        let noChangeCount = 0;
        for (let i = 0; i < maxScrolls; i++) {
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.waitForTimeout(1500);
            const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            if (currentHeight === previousHeight) {
                noChangeCount++;
                if (noChangeCount >= 2) { log.info(`Reached bottom.`); break; }
                log.info(`Scroll unchanged, giving extra time...`);
                await page.waitForTimeout(1500);
            } else {
                noChangeCount = 0;
            }
            previousHeight = currentHeight;
        }

        // Extract community cards from discovery page
        const communities = await page.evaluate(() => {
            const results = [];
            const cards = Array.from(document.querySelectorAll('a[href]'));
            for (const a of cards) {
                const href = a.getAttribute('href') || '';
                let cleanHref = href.split('?')[0].replace(/\/about$/, '');
                if (!cleanHref.startsWith('/') || cleanHref.split('/').length !== 2) continue;
                if (['/discovery', '/explore', '/login', '/home'].some(p => cleanHref.startsWith(p))) continue;

                const cardText = a.closest('[class]')?.textContent || a.textContent || '';
                const priceMatch = cardText.match(/\$([0-9,.]+)\s*\/\s*month/i);
                const membersMatch = cardText.match(/([\d,.]+[km]?)\s*members?/i);
                if (!priceMatch) continue;

                results.push({
                    slug: cleanHref,
                    url: 'https://www.skool.com' + cleanHref + '/about',
                    priceRaw: '$' + priceMatch[1] + '/month',
                    membersRaw: membersMatch ? membersMatch[1] + ' members' : '0 members'
                });
            }
            // Deduplicate by slug
            const seen = new Set();
            return results.filter(r => { if (seen.has(r.slug)) return false; seen.add(r.slug); return true; });
        });

        log.info(`Found ${communities.length} paid community cards on this page.`);

        // Process each community IMMEDIATELY (inline) — no queue!
        const context = page.context();
        let savedFromThisPage = 0;
        for (const c of communities) {
            if (totalSaved >= maxItems) { log.info(`Reached maxItems (${maxItems}). Stopping.`); break; }
            await scrapeCommunityAbout(context, c, log);
            savedFromThisPage++;
        }
        log.info(`Discovery page done. Saved ${savedFromThisPage} new communities.`);
    },

    failedRequestHandler({ request, log }) {
        log.error(`Request failed: ${request.url}`);
    },
});

// Start with discovery pages
const rawUrls = generateStartUrls();
console.log(`Loaded ${rawUrls.length} discovery URLs.`);

const startUrls = rawUrls.map(url => ({ url, userData: { label: 'DISCOVERY' } }));

await crawler.run(startUrls);

console.log(`\n🎉 DONE! Total communities saved: ${totalSaved}`);
await Actor.exit();
