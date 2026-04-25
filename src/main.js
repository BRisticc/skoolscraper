import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { generateStartUrls } from './niches.js';

await Actor.init();

const input = await Actor.getInput() || {};
const maxItems       = input.maxItems       ?? 99999;
const maxScrolls     = input.maxScrolls     ?? 999;
const includeFree    = input.includeFree    ?? false;  // include free communities
const paidOnly       = input.paidOnly       ?? false;  // paid-only mode (ignores free)
const minMRR         = input.minMRR         ?? 10000;  // applies only to paid
const minMembers     = input.minMembers     ?? 0;      // 0 = no minimum
const maxMembers     = input.maxMembers     ?? null;   // null = no maximum

// Existing URLs from Google Sheet for deduplication
const existingUrls = input.existingUrls || [];
const existingUrlsSet = new Set(
    existingUrls.map(u => u.toLowerCase().replace('/about', '').split('?')[0].trim())
);

const processedInThisRun = new Set();
let totalSaved = 0;

const proxyConfiguration = await Actor.createProxyConfiguration();

function parseMembersCount(str) {
    if (!str) return 0;
    let clean = str.replace(/,/g, '').toLowerCase().replace('members', '').trim();
    let multiplier = 1;
    if (clean.endsWith('k')) { multiplier = 1000; clean = clean.replace('k', ''); }
    else if (clean.endsWith('m')) { multiplier = 1_000_000; clean = clean.replace('m', ''); }
    return Math.floor(parseFloat(clean) * multiplier) || 0;
}

function parseMonthlyPrice(str) {
    if (!str) return 0;
    const match = str.match(/\$([0-9,.]+)/);
    if (match) return parseFloat(match[1].replace(/,/g, ''));
    return 0;
}

function passesFilters(membersCount, monthlyPrice, log, slug) {
    const isFree = monthlyPrice <= 0;

    // Mode checks
    if (isFree && !includeFree) {
        log.info(`[SKIP-FREE] ${slug}`);
        return false;
    }
    if (!isFree && paidOnly === false && includeFree && !input.paidOnly) {
        // both modes allowed — fall through
    }
    if (!isFree && input.paidOnly) {
        // keep paid
    }

    // Member count filter
    if (minMembers > 0 && membersCount < minMembers) {
        log.info(`[SKIP-MEMBERS] ${slug} has ${membersCount} members (min ${minMembers})`);
        return false;
    }
    if (maxMembers !== null && membersCount > maxMembers) {
        log.info(`[SKIP-MEMBERS] ${slug} has ${membersCount} members (max ${maxMembers})`);
        return false;
    }

    // MRR filter — only for paid communities
    if (!isFree) {
        const estimatedMRR = membersCount * monthlyPrice;
        if (estimatedMRR < minMRR) {
            log.info(`[SKIP-MRR] ${slug} MRR ~$${estimatedMRR} (${membersCount} × $${monthlyPrice})`);
            return false;
        }
    }

    return true;
}

// ============================================================
// SCRAPE A SINGLE COMMUNITY ABOUT PAGE
// ============================================================
async function scrapeCommunityAbout(context, communityData, log) {
    const aboutUrl = communityData.url;
    const slug = aboutUrl.split('/')[3] || aboutUrl;

    const normalizedUrl = aboutUrl.toLowerCase().replace('/about', '').split('?')[0];
    if (processedInThisRun.has(normalizedUrl)) {
        log.info(`[SKIP-DUPLICATE] ${slug}`);
        return;
    }
    if (existingUrlsSet.has(normalizedUrl)) return;

    const membersCount = parseMembersCount(communityData.membersRaw);
    const monthlyPrice = parseMonthlyPrice(communityData.priceRaw);

    if (!passesFilters(membersCount, monthlyPrice, log, slug)) return;

    processedInThisRun.add(normalizedUrl);

    const communityPage = await context.newPage();
    try {
        await communityPage.route('**/*', route => {
            if (['image', 'stylesheet', 'font', 'media'].includes(route.request().resourceType())) {
                route.abort().catch(() => {});
            } else {
                route.continue().catch(() => {});
            }
        });

        const isFree = monthlyPrice <= 0;
        log.info(`[SCRAPING] ${slug} (${membersCount} members, ${isFree ? 'FREE' : '$' + monthlyPrice + '/mo'})`);

        await communityPage.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await communityPage.waitForTimeout(800);

        const detail = await communityPage.evaluate(() => {
            const title    = document.title || '';
            const bodyText = document.body.textContent || '';
            const allLinks = Array.from(document.querySelectorAll('a[href]'));
            const images   = Array.from(document.querySelectorAll('img[alt]'));

            const socialLinks = {
                instagram: null, facebook: null, youtube: null,
                tiktok: null, twitter: null, linkedin: null, website: null,
            };

            for (const a of allLinks) {
                const href = (a.getAttribute('href') || '').toLowerCase();
                if (!href.startsWith('http') && !href.startsWith('www.')) continue;
                if (href.includes('instagram.com'))                                   socialLinks.instagram = href;
                else if (href.includes('facebook.com') && !href.includes('sharer'))  socialLinks.facebook  = href;
                else if (href.includes('youtube.com') || href.includes('youtu.be'))  socialLinks.youtube   = href;
                else if (href.includes('tiktok.com'))                                 socialLinks.tiktok    = href;
                else if (href.includes('twitter.com') || href.includes('x.com'))     socialLinks.twitter   = href;
                else if (href.includes('linkedin.com'))                               socialLinks.linkedin  = href;
                else if (!href.includes('skool.com') && !socialLinks.website)        socialLinks.website   = href;
            }

            // Regex fallbacks for unlinked URLs in body text
            const regexes = {
                instagram: /instagram\.com\/[^\s"'<>)]+/i,
                youtube:   /(youtube\.com|youtu\.be)\/[^\s"'<>)]+/i,
                tiktok:    /tiktok\.com\/(@)?[^\s"'<>)]+/i,
                linkedin:  /linkedin\.com\/in\/[^\s"'<>)]+/i,
            };
            for (const [key, regex] of Object.entries(regexes)) {
                if (!socialLinks[key]) {
                    const match = bodyText.match(regex);
                    if (match) socialLinks[key] = match[0].startsWith('http') ? match[0] : 'https://' + match[0];
                }
            }
            if (!socialLinks.website) {
                const anyDomain = bodyText.match(/(https?:\/\/[^\s"'<>)]+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
                if (anyDomain) {
                    const d = anyDomain[0].toLowerCase();
                    const skip = ['skool.com', 'instagram.com', 'facebook', 'youtube', 'tiktok', 'twitter', 'x.com'];
                    if (!skip.some(s => d.includes(s))) {
                        socialLinks.website = d.startsWith('http') ? d : 'https://' + d;
                    }
                }
            }

            let founderName = null;
            for (const img of images) {
                const alt = img.getAttribute('alt');
                if (alt && alt.length > 2 && alt !== 'Skool' && !title.includes(alt)) {
                    founderName = alt;
                    break;
                }
            }

            return {
                title:       title.replace(' | Skool', '').trim(),
                description: bodyText.substring(0, 1000).replace(/\n\s*\n/g, '\n').trim(),
                socialLinks,
                founderName,
            };
        });

        // Language filter — English only
        const textToCheck = (detail.description + ' ' + detail.title).toLowerCase();
        const nonEnglishPatterns = [
            /\b(comunidad|aprende|negocio|dinero|gratis|bienvenid|curso|ayuda|emprender|ganar|vender|español|únete|cómo)\b/,
            /\b(benvenut|impara|comunità|gratuito|corso|lavoro|vendere|gruppo|italiano|guadagn)\b/,
            /\b(comunidade|aprenda|negócio|dinheiro|trabalh|português|ganhar)\b/,
            /\b(communauté|apprendre|gratuit|travail|vendre|français|bienvenue)\b/,
            /\b(willkommen|lernen|kostenlos|verdienen|deutsch|gemeinschaft)\b/,
        ];
        if (
            nonEnglishPatterns.some(p => p.test(textToCheck)) ||
            /[ñçüöäãõàèìòùáéíóúâêîôû]{2,}/.test(textToCheck)
        ) {
            log.info(`[SKIP-LANG] ${slug}`);
            return;
        }

        const isFree       = monthlyPrice <= 0;
        const estimatedMRR = isFree ? 0 : membersCount * monthlyPrice;

        const record = {
            communityName: detail.title || slug,
            communityLink: aboutUrl.replace('/about', ''),
            founderName:   detail.founderName || 'Not Found',
            membersCount,
            monthlyPrice,
            isFree,
            estimatedMRR,
            communityInfo: detail.description.substring(0, 500) + '...',
            website:   detail.socialLinks.website   || 'N/A',
            linkedin:  detail.socialLinks.linkedin  || 'N/A',
            instagram: detail.socialLinks.instagram || 'N/A',
            youtube:   detail.socialLinks.youtube   || 'N/A',
            tiktok:    detail.socialLinks.tiktok    || 'N/A',
            facebook:  detail.socialLinks.facebook  || 'N/A',
        };

        await Actor.pushData(record);
        totalSaved++;
        log.info(
            `✅ SAVED [${totalSaved}] "${record.communityName}" | ` +
            `${isFree ? 'FREE' : '$' + monthlyPrice + '/mo'} | ` +
            `${membersCount} members${isFree ? '' : ' | MRR: $' + estimatedMRR}`
        );

    } catch (err) {
        log.warning(`[ERROR] ${aboutUrl}: ${err.message}`);
    } finally {
        await communityPage.close().catch(() => {});
    }
}

// ============================================================
// CRAWLER — Discovery pages only, communities processed inline
// ============================================================
const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 999999,
    maxConcurrency: 5,
    browserPoolOptions: { retireBrowserAfterPageCount: 20 },
    headless: true,
    navigationTimeoutSecs: 60,
    requestHandlerTimeoutSecs: 600,

    preNavigationHooks: [
        async ({ page }) => {
            await page.route('**/*', route => {
                if (['image', 'stylesheet', 'font', 'media'].includes(route.request().resourceType())) {
                    route.abort().catch(() => {});
                } else {
                    route.continue().catch(() => {});
                }
            });
        },
    ],

    async requestHandler({ page, request, log }) {
        log.info(`Processing discovery: ${request.url}`);

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);

        // Scroll to load all communities
        let previousHeight = 0;
        let noChangeCount  = 0;
        for (let i = 0; i < maxScrolls; i++) {
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            await page.waitForTimeout(1500);
            const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
            if (currentHeight === previousHeight) {
                noChangeCount++;
                if (noChangeCount >= 2) { log.info('Reached bottom.'); break; }
                await page.waitForTimeout(1500);
            } else {
                noChangeCount = 0;
            }
            previousHeight = currentHeight;
        }

        // Extract community cards
        // Handles both PAID ($X/month) and FREE cards
        const communities = await page.evaluate((includeFreeArg) => {
            const results = [];
            const seen    = new Set();
            const allLinks = Array.from(document.querySelectorAll('a[href]'));

            for (const a of allLinks) {
                const href = a.getAttribute('href') || '';
                let cleanHref = href.split('?')[0].replace(/\/about$/, '').replace(/\/$/, '');

                if (!cleanHref.match(/^\/[a-z0-9][a-z0-9-]{1,60}$/i)) continue;
                if (/^\/(discovery|explore|login|home|settings|profile|feed|messages|notifications|search)/.test(cleanHref)) continue;
                if (seen.has(cleanHref)) continue;

                // Walk up the DOM to find the card container
                let container = a;
                for (let i = 0; i < 8; i++) {
                    container = container.parentElement;
                    if (!container) break;
                    const t = container.textContent || '';

                    // Paid card: has "$X/month"
                    const priceMatch = t.match(/\$([0-9,.]+)\s*\/\s*month/i);
                    if (priceMatch) {
                        const membersMatch = t.match(/([\d,.]+\s*[km]?)\s*members?/i);
                        results.push({
                            slug:       cleanHref,
                            url:        'https://www.skool.com' + cleanHref + '/about',
                            priceRaw:   '$' + priceMatch[1] + '/month',
                            membersRaw: membersMatch ? membersMatch[0].trim() : '0 members',
                            cardType:   'paid',
                        });
                        seen.add(cleanHref);
                        break;
                    }

                    // Free card: has "Free" label or "$0/month"
                    if (includeFreeArg) {
                        const hasFreeLabel = /\bfree\b/i.test(t);
                        const hasZeroPrice = /\$0\s*\/\s*month/i.test(t);
                        if ((hasFreeLabel || hasZeroPrice) && t.includes('members')) {
                            const membersMatch = t.match(/([\d,.]+\s*[km]?)\s*members?/i);
                            results.push({
                                slug:       cleanHref,
                                url:        'https://www.skool.com' + cleanHref + '/about',
                                priceRaw:   '$0/month',
                                membersRaw: membersMatch ? membersMatch[0].trim() : '0 members',
                                cardType:   'free',
                            });
                            seen.add(cleanHref);
                            break;
                        }
                    }
                }
            }

            return results;
        }, includeFree);

        const paid = communities.filter(c => c.cardType === 'paid').length;
        const free = communities.filter(c => c.cardType === 'free').length;
        log.info(`Found ${communities.length} cards (paid: ${paid}, free: ${free})`);

        const context = page.context();
        for (const c of communities) {
            if (totalSaved >= maxItems) { log.info(`Reached maxItems (${maxItems}). Stopping.`); break; }
            await scrapeCommunityAbout(context, c, log);
        }
    },

    failedRequestHandler({ request, log }) {
        log.error(`Request failed: ${request.url}`);
    },
});

const startUrls = generateStartUrls().map(url => ({ url, userData: { label: 'DISCOVERY' } }));
console.log(`Loaded ${startUrls.length} discovery URLs.`);

await crawler.run(startUrls);

console.log(`\n🎉 DONE! Total communities saved: ${totalSaved}`);
await Actor.exit();
