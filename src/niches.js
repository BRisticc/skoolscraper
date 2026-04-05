/**
 * NICHE KEYWORD DATABASE — Community & Lifestyle Focused
 * Real topics people build communities around.
 * Platforms and software tools are intentionally excluded.
 */

const NICHE_KEYWORDS = [

    // ===== HEALTH & FITNESS =====
    "fitness", "gym", "workout", "exercise", "weight loss",
    "fat loss", "body transformation", "muscle building", "bodybuilding",
    "strength training", "powerlifting", "weightlifting", "olympic lifting",
    "crossfit", "hiit", "cardio", "calisthenics", "bodyweight training",
    "home workout", "yoga", "pilates", "barre", "stretching", "flexibility",
    "mobility", "foam rolling", "recovery", "injury prevention", "rehab",
    "running", "marathon", "half marathon", "5k", "10k", "couch to 5k",
    "trail running", "ultra marathon", "spartan race", "tough mudder",
    "cycling", "triathlon", "swimming", "rowing", "kayaking", "hiking",
    "rock climbing", "bouldering", "surfing", "snowboarding", "skiing",
    "golf", "tennis", "pickleball", "basketball", "soccer", "volleyball",
    "boxing", "mma", "muay thai", "bjj", "jiu jitsu", "wrestling",
    "martial arts", "self defense", "kickboxing", "karate", "judo",
    "personal trainer", "fitness coach", "online coaching",
    "fitness business", "gym owner", "fitness marketing",
    "sports performance", "athletic training", "speed training",
    "nutrition", "meal prep", "diet", "macro counting",
    "keto", "paleo", "vegan", "plant based", "carnivore diet",
    "intermittent fasting", "supplements", "protein",
    "biohacking", "longevity", "anti aging", "sleep optimization",
    "cold plunge", "sauna", "breathwork",
    "womens fitness", "mens fitness", "senior fitness", "over 40 fitness",
    "prenatal fitness", "postnatal fitness", "kids fitness", "youth sports",
    "bodybuilding competition", "physique", "bikini competition",
    "home gym", "garage gym", "kettlebell", "resistance bands",

    // ===== MENTAL HEALTH & WELLBEING =====
    "mental health", "anxiety", "depression", "stress management",
    "therapy", "counseling", "mindset", "mindfulness", "meditation",
    "breathwork", "journaling", "gratitude", "affirmations",
    "burnout recovery", "trauma healing", "grief", "emotional healing",
    "shadow work", "inner child", "self love", "self esteem", "confidence",
    "boundaries", "codependency", "people pleasing", "perfectionism",
    "imposter syndrome", "overthinking", "anger management",
    "social anxiety", "panic attacks", "ocd", "ptsd",
    "productivity", "focus", "deep work", "time management",
    "morning routine", "daily habits", "atomic habits",
    "stoicism", "philosophy", "wisdom",

    // ===== NUTRITION & HEALTH =====
    "gut health", "microbiome", "digestive health", "inflammation",
    "skin care", "holistic health", "functional medicine", "naturopathy",
    "ayurveda", "traditional chinese medicine", "acupuncture",
    "hormone health", "hormone optimization", "testosterone",
    "womens health", "pcos", "endometriosis", "fertility", "menopause",
    "thyroid", "diabetes", "autoimmune", "chronic fatigue", "chronic pain",
    "cancer survivor", "heart health", "blood pressure",
    "clean eating", "whole food", "organic food", "food freedom",
    "intuitive eating", "body positivity",
    "essential oils", "herbalism", "homeopathy",
    "red light therapy", "infrared sauna",
    "collagen", "bone broth", "adaptogens", "nootropics",

    // ===== PERSONAL DEVELOPMENT =====
    "personal development", "self improvement", "self help",
    "growth mindset", "success mindset", "motivation", "discipline",
    "productivity", "goal setting", "vision board", "leadership",
    "communication skills", "public speaking", "charisma", "influence",
    "emotional intelligence", "networking", "professional networking",
    "career development", "career change", "remote work", "digital nomad",
    "work life balance", "time freedom", "financial freedom",
    "reading", "book club", "speed reading", "learning",
    "memory training", "accelerated learning",
    "purpose", "fulfillment", "meaning", "ikigai",
    "men community", "masculinity", "manhood", "mens group",
    "women empowerment", "women community", "female leaders",
    "dating", "relationships", "marriage", "couples",
    "dating coach", "attraction", "divorce recovery", "co parenting",
    "parenting", "fatherhood", "motherhood", "conscious parenting",
    "single mom", "single dad", "blended family",
    "teen development", "youth empowerment",

    // ===== SPIRITUALITY =====
    "spirituality", "spiritual growth", "spiritual awakening",
    "manifestation", "law of attraction", "abundance mindset",
    "energy healing", "reiki", "chakra", "crystal healing",
    "astrology", "tarot", "numerology", "human design",
    "shamanism", "plant medicine", "consciousness",
    "prayer", "faith", "christian community", "bible study",
    "church community", "ministry", "worship",
    "yoga philosophy", "meditation teacher",
    "sound healing", "sound bath", "breathwork",

    // ===== BUSINESS & ENTREPRENEURSHIP =====
    "business", "entrepreneurship", "startup", "small business",
    "online business", "business coaching", "business growth",
    "solopreneur", "side hustle", "passive income",
    "women in business", "young entrepreneur", "serial entrepreneur",
    "business mastermind", "accountability group", "ceo group",
    "business scaling", "business systems", "delegation",
    "franchise", "local business", "home business",
    "business exit", "sell my business",
    "make money online", "income streams",
    "high ticket", "high ticket sales", "high ticket coaching",

    // ===== MARKETING & SALES =====
    "marketing", "digital marketing", "content marketing", "email marketing",
    "social media marketing", "influencer marketing", "affiliate marketing",
    "copywriting", "sales", "sales coaching", "cold outreach",
    "lead generation", "personal brand", "brand building",
    "facebook ads", "instagram ads", "tiktok ads", "google ads",
    "seo", "organic traffic", "content strategy",
    "agency", "smma", "social media agency", "marketing agency",

    // ===== CONTENT CREATION =====
    "content creator", "youtube", "youtuber", "youtube growth",
    "tiktok creator", "tiktok growth", "instagram growth",
    "podcasting", "podcast growth", "newsletter", "blogging",
    "video editing", "video production", "thumbnail design",
    "live streaming", "faceless youtube", "youtube automation",
    "short form content", "reels", "ugc creator",
    "influencer", "brand deals", "sponsorship",
    "community building", "audience building",

    // ===== COACHING =====
    "coaching", "life coaching", "executive coaching",
    "health coaching", "wellness coaching", "nutrition coaching",
    "fitness coaching", "mindset coaching", "relationship coaching",
    "career coaching", "group coaching", "coaching program",
    "coaching business", "coaching certification",
    "transformational coaching", "nlp",

    // ===== REAL ESTATE =====
    "real estate", "real estate investing", "rental property",
    "house flipping", "wholesale real estate", "multifamily investing",
    "airbnb", "short term rental", "real estate agent",
    "property management", "commercial real estate",
    "land investing", "storage units", "laundromat",

    // ===== FINANCE & INVESTING =====
    "financial freedom", "personal finance", "financial literacy",
    "investing", "stock market", "options trading", "swing trading",
    "day trading", "forex trading", "crypto", "bitcoin",
    "index funds", "dividend investing", "retirement planning",
    "tax strategy", "budgeting", "debt free", "wealth building",
    "generational wealth", "financial coaching",
    "trading", "trading psychology", "technical analysis",
    "price action", "prop firm", "funded trader",

    // ===== CREATIVE ARTS =====
    "photography", "photographer", "portrait photography",
    "wedding photography", "landscape photography",
    "food photography", "travel photography",
    "drone photography", "film photography",
    "videography", "wedding videography", "documentary",
    "graphic design", "logo design", "brand design",
    "illustration", "digital art", "painting", "watercolor",
    "drawing", "sketching", "animation", "motion graphics",
    "3d modeling", "blender art", "sculpture", "ceramics", "pottery",
    "jewelry making", "woodworking", "carpentry",
    "sewing", "knitting", "crochet", "embroidery", "quilting",
    "candle making", "soap making", "floral design",
    "calligraphy", "hand lettering", "tattoo artist",
    "interior design", "home decor", "home staging",

    // ===== MUSIC =====
    "music", "musician", "music production", "songwriting",
    "guitar", "piano", "drums", "singing", "vocal training",
    "beat making", "hip hop producer", "dj", "djing",
    "music business", "music marketing", "spotify growth",
    "ableton", "fl studio", "logic pro",
    "mixing", "mastering", "audio engineering",
    "music teacher", "music lessons",
    "jazz", "blues", "country", "classical music",

    // ===== WRITING & PUBLISHING =====
    "writing", "author", "fiction writing", "novel writing",
    "self publishing", "kindle publishing", "book launch",
    "copywriting", "ghostwriting", "content writing",
    "screenwriting", "poetry", "creative writing",
    "blogging", "journalism",

    // ===== TRAVEL & LIFESTYLE =====
    "travel", "travel hacking", "budget travel", "luxury travel",
    "digital nomad", "van life", "rv living", "backpacking",
    "solo travel", "adventure travel", "expat", "living abroad",
    "sailing", "boating", "camping", "glamping",
    "scuba diving", "freediving", "surfing",
    "hunting", "fishing", "fly fishing",
    "sustainability", "zero waste", "minimalism",
    "tiny house", "off grid", "homesteading", "permaculture",
    "gardening", "urban farming", "beekeeping",

    // ===== FOOD & BEVERAGE =====
    "cooking", "chef", "culinary", "baking", "bread making",
    "pastry", "cake decorating", "meal prep", "recipe",
    "food blog", "restaurant owner", "food truck", "catering",
    "wine", "sommelier", "coffee", "barista", "craft beer", "home brewing",
    "fermentation", "kombucha", "sourdough",
    "vegan cooking", "plant based cooking",

    // ===== PETS & ANIMALS =====
    "dog training", "puppy training", "dog behavior",
    "dog grooming", "pet business", "pet photography",
    "horse", "horseback riding", "equestrian",
    "animal rescue", "pet sitting",

    // ===== KIDS & FAMILY =====
    "homeschool", "homeschooling", "child development",
    "family travel", "kids activities", "special needs parenting",
    "autism parent", "adhd parent", "pregnancy", "postpartum", "breastfeeding",
    "fertility", "adoption", "foster parent",

    // ===== GAMING & HOBBIES =====
    "gaming", "esports", "game streaming", "twitch streamer",
    "chess", "poker", "board game", "tabletop rpg", "dungeons dragons",
    "magic gathering", "sports cards", "trading cards",
    "stand up comedy", "acting", "improv theater",
    "dance", "salsa", "ballroom dance", "hip hop dance", "ballet",
    "yoga teacher", "pilates instructor",
    "lego", "model building", "rc cars", "drone racing",
    "aquascaping", "bonsai", "orchid growing", "houseplants",
    "stargazing", "astrophotography", "bird watching",
    "archery", "shooting sports", "disc golf",
    "bowling", "billiards",
    "crossfit community", "spartan community",

    // ===== PROFESSIONAL & CAREER =====
    "consulting", "freelancing", "virtual assistant",
    "ecommerce", "dropshipping", "amazon fba", "etsy seller",
    "print on demand",
    "real estate agent", "mortgage broker",
    "lawyer", "attorney", "legal", "law firm",
    "doctor", "nurse", "therapist", "dentist",
    "teacher", "tutor", "homeschool teacher",
    "nonprofit", "charity", "social impact", "volunteer",
    "veteran", "military", "military spouse",
    "faith based", "church growth", "ministry",

    // ===== SPECIFIC COMMUNITIES =====
    "mastermind", "accountability", "peer group", "mens group", "womens group",
    "paid community", "membership community",
    "wealth", "millionaire mindset",
    "recovery", "sobriety", "addiction recovery",
    "cancer community", "chronic illness", "invisible illness",
    "lgbtq community", "minority entrepreneur",
    "black entrepreneur", "latina entrepreneur",
    "over 50", "retiree", "second career",
    "college student", "young professional", "millennial",
];

/**
 * Generates URL array for Skool Discovery search.
 */
export function generateStartUrls() {
    // Start with general discovery pages by category
    const urls = [
        'https://www.skool.com/discovery',
        'https://www.skool.com/discovery?c=health-&-fitness',
        'https://www.skool.com/discovery?c=personal-development',
        'https://www.skool.com/discovery?c=business',
        'https://www.skool.com/discovery?c=arts-&-crafts',
        'https://www.skool.com/discovery?c=sports',
        'https://www.skool.com/discovery?c=relationships',
        'https://www.skool.com/discovery?c=spirituality',
        'https://www.skool.com/discovery?c=education',
        'https://www.skool.com/discovery?c=finance',
        'https://www.skool.com/discovery?c=food-&-drink',
        'https://www.skool.com/discovery?c=travel',
        'https://www.skool.com/discovery?c=pets',
        'https://www.skool.com/discovery?c=hobbies',
    ];

    const seen = new Set(urls);
    for (const keyword of NICHE_KEYWORDS) {
        const encoded = encodeURIComponent(keyword).replace(/%20/g, '+');
        const url = `https://www.skool.com/discovery?q=${encoded}`;
        if (!seen.has(url)) {
            urls.push(url);
            seen.add(url);
        }
    }

    return urls;
}

export { NICHE_KEYWORDS };
