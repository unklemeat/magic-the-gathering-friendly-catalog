/**
 * Tests for the Scryfall API module
 */

const { 
  rateLimitedRequest, 
  fetchSets, 
  fetchAllPrintsByOracleId, 
  searchCardsExact, 
  searchCardFuzzy, 
  fetchCardById, 
  fetchSetCards, 
  normalizeName, 
  capitalizeWords, 
  checkApiHealth 
} = require('../public/js/modules/scryfallApi.js');

// Mock fetch for testing
global.fetch = jest.fn();

describe('Scryfall API Module', () => {
  
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('normalizeName', () => {
    test('should normalize card names with accents', () => {
      expect(normalizeName('Jace, the Mind Sculptor')).toBe('jace, the mind sculptor');
      expect(normalizeName('Jace, le Sculpteur d\'Esprits')).toBe('jace, le sculpteur d\'esprits');
      expect(normalizeName('Jace, der Gedankenschnitzer')).toBe('jace, der gedankenschnitzer');
    });

    test('should handle special characters', () => {
      expect(normalizeName('Jace, the Mind Sculptor!')).toBe('jace, the mind sculptor');
      expect(normalizeName('Jace (the Mind Sculptor)')).toBe('jace the mind sculptor');
      expect(normalizeName('Jace—the Mind Sculptor')).toBe('jace the mind sculptor');
    });

    test('should handle empty and whitespace', () => {
      expect(normalizeName('')).toBe('');
      expect(normalizeName('   ')).toBe('');
      expect(normalizeName('  Jace  ')).toBe('jace');
    });
  });

  describe('capitalizeWords', () => {
    test('should capitalize first letter of each word', () => {
      expect(capitalizeWords('jace the mind sculptor')).toBe('Jace The Mind Sculptor');
      expect(capitalizeWords('lightning bolt')).toBe('Lightning Bolt');
      expect(capitalizeWords('black lotus')).toBe('Black Lotus');
    });

    test('should handle empty and single words', () => {
      expect(capitalizeWords('')).toBe('');
      expect(capitalizeWords('jace')).toBe('Jace');
      expect(capitalizeWords('  ')).toBe('');
    });

    test('should handle mixed case', () => {
      expect(capitalizeWords('JACE THE MIND SCULPTOR')).toBe('Jace The Mind Sculptor');
      expect(capitalizeWords('jAcE tHe MiNd ScUlPtOr')).toBe('Jace The Mind Sculptor');
    });
  });

  describe('rateLimitedRequest', () => {
    test('should make successful API requests', async () => {
      const mockResponse = { data: [{ name: 'Test Set' }] };
      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const result = await rateLimitedRequest('https://api.scryfall.com/sets');
      
      expect(fetch).toHaveBeenCalledWith('https://api.scryfall.com/sets');
      expect(result).toEqual(mockResponse);
    });

    test('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await rateLimitedRequest('https://api.scryfall.com/invalid');
      
      expect(result).toBeNull();
    });

    test('should handle multiple requests with rate limiting', async () => {
      const mockResponse1 = { data: [{ name: 'Set 1' }] };
      const mockResponse2 = { data: [{ name: 'Set 2' }] };
      
      fetch
        .mockResolvedValueOnce({ json: async () => mockResponse1 })
        .mockResolvedValueOnce({ json: async () => mockResponse2 });

      const promise1 = rateLimitedRequest('https://api.scryfall.com/sets');
      const promise2 = rateLimitedRequest('https://api.scryfall.com/sets');

      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toEqual(mockResponse1);
      expect(result2).toEqual(mockResponse2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchSets', () => {
    test('should fetch and sort sets by release date', async () => {
      const mockSets = [
        { name: 'Older Set', released_at: '2020-01-01', card_count: 100 },
        { name: 'Newer Set', released_at: '2023-01-01', card_count: 150 },
        { name: 'Empty Set', card_count: 0 }, // Should be filtered out
        { name: 'Middle Set', released_at: '2021-01-01', card_count: 120 }
      ];

      fetch.mockResolvedValueOnce({
        json: async () => ({ data: mockSets })
      });

      const result = await fetchSets();
      
      expect(result).toHaveLength(3); // Empty set filtered out
      expect(result[0].name).toBe('Newer Set'); // Newest first
      expect(result[1].name).toBe('Middle Set');
      expect(result[2].name).toBe('Older Set');
    });

    test('should return empty array on error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchSets();
      
      expect(result).toEqual([]);
    });
  });

  describe('searchCardsExact', () => {
    test('should search for cards with exact matching', async () => {
      const mockResponse = { 
        data: [{ name: 'Lightning Bolt', oracle_id: '123' }] 
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const result = await searchCardsExact('Lightning Bolt', 'eng');
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.scryfall.com/cards/search?q="Lightning%20Bolt"+lang%3Aeng'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('searchCardFuzzy', () => {
    test('should search for cards with fuzzy matching', async () => {
      const mockResponse = { 
        object: 'card',
        name: 'Lightning Bolt',
        oracle_id: '123'
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const result = await searchCardFuzzy('lightning bolt');
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.scryfall.com/cards/named?fuzzy=lightning%20bolt'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchCardById', () => {
    test('should fetch a specific card by ID', async () => {
      const mockResponse = { 
        object: 'card',
        name: 'Lightning Bolt',
        id: '123'
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const result = await fetchCardById('123');
      
      expect(fetch).toHaveBeenCalledWith('https://api.scryfall.com/cards/123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchAllPrintsByOracleId', () => {
    test('should fetch all prints of a card', async () => {
      const mockResponse1 = { 
        data: [{ name: 'Lightning Bolt', set: 'LEA' }],
        has_more: true,
        next_page: 'https://api.scryfall.com/cards/search?page=2'
      };
      const mockResponse2 = { 
        data: [{ name: 'Lightning Bolt', set: 'LEB' }],
        has_more: false
      };

      fetch
        .mockResolvedValueOnce({ json: async () => mockResponse1 })
        .mockResolvedValueOnce({ json: async () => mockResponse2 });

      const result = await fetchAllPrintsByOracleId('123');
      
      expect(result).toHaveLength(2);
      expect(result[0].set).toBe('LEA');
      expect(result[1].set).toBe('LEB');
    });

    test('should handle single page response', async () => {
      const mockResponse = { 
        data: [{ name: 'Lightning Bolt', set: 'LEA' }],
        has_more: false
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const result = await fetchAllPrintsByOracleId('123');
      
      expect(result).toHaveLength(1);
      expect(result[0].set).toBe('LEA');
    });
  });

  describe('fetchSetCards', () => {
    test('should fetch all cards from a set', async () => {
      const mockResponse1 = { 
        data: [{ name: 'Card 1' }],
        has_more: true,
        next_page: 'https://api.scryfall.com/cards/search?page=2'
      };
      const mockResponse2 = { 
        data: [{ name: 'Card 2' }],
        has_more: false
      };

      fetch
        .mockResolvedValueOnce({ json: async () => mockResponse1 })
        .mockResolvedValueOnce({ json: async () => mockResponse2 });

      const result = await fetchSetCards('dmu');
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Card 1');
      expect(result[1].name).toBe('Card 2');
    });
  });

  describe('checkApiHealth', () => {
    test('should return true when API is healthy', async () => {
      const mockResponse = { data: [{ name: 'Test Set' }] };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const result = await checkApiHealth();
      
      expect(result).toBe(true);
    });

    test('should return false when API is unhealthy', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkApiHealth();
      
      expect(result).toBeNull();
    });

    test('should return false when API returns invalid data', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ invalid: 'data' })
      });

      const result = await checkApiHealth();
      
      expect(result).toBeUndefined();
    });
  });
});
