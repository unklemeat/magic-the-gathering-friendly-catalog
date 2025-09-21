/**
 * Scryfall API module for Magic: The Gathering card data
 * Handles rate limiting, card searches, and set management
 */

const SCRYFALL_API = "https://api.scryfall.com";

// Rate limiting variables
let requestQueue = [];
let isProcessing = false;

/**
 * Rate-limited request function to respect Scryfall's API limits
 * Max 10 requests per second with 150ms delay between requests
 * @param {string} url - The API URL to request
 * @returns {Promise<Object|null>} The API response or null if error
 */
export async function rateLimitedRequest(url) {
  return new Promise((resolve) => {
    requestQueue.push({ url, resolve });
    processQueue();
  });
}

/**
 * Process the request queue with rate limiting
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  while (requestQueue.length > 0) {
    const { url, resolve } = requestQueue.shift();
    try {
      const response = await fetch(url);
      const data = await response.json();
      resolve(data);
    } catch (error) {
      console.error("API Error:", error);
      resolve(null);
    }
    // Wait 150ms between requests for safety margin
    await new Promise(r => setTimeout(r, 150));
  }
  isProcessing = false;
}

/**
 * Fetch all Magic: The Gathering sets from Scryfall
 * @returns {Promise<Array>} Array of set objects sorted by release date (newest first)
 */
export async function fetchSets() {
  try {
    const response = await rateLimitedRequest(`${SCRYFALL_API}/sets`);
    if (response && response.data) {
      // Sort sets by release date, from newest to oldest
      return response.data
        .filter(set => set.card_count > 0)
        .sort((a, b) => new Date(b.released_at) - new Date(a.released_at));
    }
    return [];
  } catch (error) {
    console.error("Error fetching sets:", error);
    return [];
  }
}

/**
 * Fetch all prints of a card by its oracle ID
 * @param {string} oracleId - The oracle ID of the card
 * @returns {Promise<Array>} Array of all print objects for the card
 */
export async function fetchAllPrintsByOracleId(oracleId) {
  let allPrints = [];
  let url = `${SCRYFALL_API}/cards/search?q=oracleid%3A${oracleId}&unique=prints&order=released`;
  
  while (url) {
    const response = await rateLimitedRequest(url);
    if (!response || !response.data) {
      break;
    }
    allPrints = allPrints.concat(response.data);
    url = response.has_more ? response.next_page : null;
  }
  
  return allPrints;
}

/**
 * Search for cards by name with exact matching, forcing English language.
 * This provides a stable baseline card object.
 * @param {string} cardName - The name of the card to search for
 * @returns {Promise<Object|null>} The search result or null if not found
 */
export async function searchCardsExact(cardName) {
  const exactSearchUrl = `${SCRYFALL_API}/cards/search?q=!"${encodeURIComponent(cardName)}"+lang%3Aen&unique=cards`;
  return await rateLimitedRequest(exactSearchUrl);
}

/**
 * Search for a specific Italian print of a card by its Oracle ID.
 * @param {string} oracleId - The Oracle ID of the card.
 * @returns {Promise<Object|null>} The Italian card data or null if not found.
 */
export async function fetchItalianVersion(oracleId) {
    if (!oracleId) return null;
    const italianSearchUrl = `${SCRYFALL_API}/cards/search?q=oracleid%3A${oracleId}+lang%3Ait&unique=cards`;
    const result = await rateLimitedRequest(italianSearchUrl);
    
    if (result && result.data && result.data.length > 0) {
        // Return the first available Italian version
        return result.data[0];
    }
    return null;
}


/**
 * Search for a card by name using fuzzy matching
 * @param {string} cardName - The name of the card to search for
 * @returns {Promise<Object|null>} The card object or null if not found
 */
export async function searchCardFuzzy(cardName) {
  const namedSearchUrl = `${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
  return await rateLimitedRequest(namedSearchUrl);
}

/**
 * Fetch a specific card by its ID
 * @param {string} cardId - The Scryfall ID of the card
 * @returns {Promise<Object|null>} The card object or null if not found
 */
export async function fetchCardById(cardId) {
  return await rateLimitedRequest(`${SCRYFALL_API}/cards/${cardId}`);
}

/**
 * Fetch cards from a specific set
 * @param {string} setCode - The set code (e.g., 'dmu', 'bro')
 * @returns {Promise<Array>} Array of card objects from the set
 */
export async function fetchSetCards(setCode) {
  let allCards = [];
  let url = `${SCRYFALL_API}/cards/search?order=set&q=set%3A${setCode}&unique=prints`;

  try {
    while (url) {
      const response = await rateLimitedRequest(url);
      if (!response || !response.data) {
        break;
      }
      allCards = allCards.concat(response.data);
      url = response.has_more ? response.next_page : null;
    }
  } catch (error) {
    console.error("Error fetching set cards:", error);
  }
  
  return allCards;
}

/**
 * Normalize card name by removing special characters and accents
 * @param {string} name - The card name to normalize
 * @returns {string} The normalized name
 */
export function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s\-'",]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Capitalize the first letter of each word
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
export function capitalizeWords(str) {
  return str.split(' ').map(word => {
    if (word.length > 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return '';
  }).join(' ').trim();
}

/**
 * Check if the API is responding
 * @returns {Promise<boolean>} True if API is responding, false otherwise
 */
export async function checkApiHealth() {
  try {
    const response = await rateLimitedRequest(`${SCRYFALL_API}/sets`);
    return response && response.data && Array.isArray(response.data);
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
}