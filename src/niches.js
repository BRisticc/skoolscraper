const NICHE_KEYWORDS = [
    // Join / access
    "join",
    "join free",
    "join now",
    "join us",
    "join the community",
    "join for free",
    "free to join",

    // Community / group
    "community",
    "free community",
    "online community",
    "private community",
    "group",
    "free group",
    "mastermind",

    // Learning / coaching
    "free training",
    "free coaching",
    "free course",
    "free masterclass",
    "free challenge",
    "free workshop",
    "free membership",
    "free access",

    // Since / niche flavour
    "since",
    "exclusive",
    "connect",
    "network",
    "members",
    "tribe",
    "inner circle",
    "accountability",
];

/**
 * Generates URL array for Skool Discovery search.
 * Broad discovery pages (all sort orders) + keyword searches.
 */
export function generateStartUrls() {
    const seen = new Set();
    const urls = [];

    const addUrl = (url) => {
        if (!seen.has(url)) { urls.push(url); seen.add(url); }
    };

    // ── 1. BROAD DISCOVERY — all sort orders ──────────────────────────
    // s=m = most members, s=p = most popular, s=l = lowest price, s=n = newest
    for (const sort of ['', '?s=m', '?s=p', '?s=l', '?s=n']) {
        addUrl(`https://www.skool.com/discovery${sort}`);
    }

    // ── 2. ALL SKOOL CATEGORIES ────────────────────────────────────────
    const categories = [
        'health-&-fitness',
        'personal-development',
        'business',
        'arts-&-crafts',
        'sports',
        'relationships',
        'spirituality',
        'education',
        'finance',
        'food-&-drink',
        'travel',
        'pets',
        'hobbies',
        'music',
        'gaming',
        'technology',
        'other',
    ];
    for (const cat of categories) {
        addUrl(`https://www.skool.com/discovery?c=${cat}`);
        addUrl(`https://www.skool.com/discovery?c=${cat}&s=m`);
        addUrl(`https://www.skool.com/discovery?c=${cat}&s=p`);
    }

    // ── 3. KEYWORD SEARCHES ───────────────────────────────────────────
    for (const keyword of NICHE_KEYWORDS) {
        const encoded = encodeURIComponent(keyword).replace(/%20/g, '+');
        addUrl(`https://www.skool.com/discovery?q=${encoded}`);
    }

    return urls;
}

export { NICHE_KEYWORDS };
