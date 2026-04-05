import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID = 'default';
process.env.APIFY_LOCAL_STORAGE_DIR = './storage';
process.env.APIFY_IS_AT_HOME = '1';

// I just want to make sure it compiles and runs locally without errors.
