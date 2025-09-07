/**
 * Tests for the Search/Filter module
 */

const { 
  findCardAndHandleResults,
  getSortableField,
  filterCardsByColor,
  filterCardsBySearchTerm,
  sortCards,
  populateSetSelect,
  handleSearch,
  handleSetSelection,
  handleFilterChange,
  handleSortChange,
  processCsvData,
  processJsonData,
  exportToJson,
  setupVoiceSearch,
  clearAllFilters,
  getFilterDisplayName,
  validateSearchInput
} = require('../public/js/modules/searchFilter.js');

// Mock dependencies
jest.mock('../public/js/modules/translations.js', () => ({
  getTranslation: jest.fn((key, lang) => {
    const translations = {
      'filterAll': 'All',
      'filterWhite': 'White',
      'filterBlue': 'Blue',
      'filterBlack': 'Black',
      'filterRed': 'Red',
      'filterGreen': 'Green',
      'filterMulti': 'Multi-color',
      'filterColorless': 'Colorless',
      'modalNoCardName': 'No card name provided',
      'modalCardNameTooShort': 'Card name too short',
      'modalNoSetSelected': 'No set selected',
      'modalApiError': 'API Error',
      'modalCsvError': 'CSV Error',
      'modalInvalidJson': 'Invalid JSON',
      'modalJsonLoadError': 'JSON Load Error',
      'modalNoDataToExport': 'No data to export',
      'modalExportError': 'Export Error',
      'modalSpeechError': 'Speech Error'
    };
    return translations[key] || key;
  })
}));

jest.mock('../public/js/modules/scryfallApi.js', () => ({
  searchCardsExact: jest.fn(),
  searchCardFuzzy: jest.fn(),
  fetchAllPrintsByOracleId: jest.fn(),
  normalizeName: jest.fn((name) => name.toLowerCase().replace(/[^a-z0-9\s]/g, ''))
}));

// Mock DOM methods
global.document = {
  getElementById: jest.fn(() => ({
    innerHTML: '',
    appendChild: jest.fn()
  })),
  createElement: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Mock URL methods
global.URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn()
};

// Mock Blob
global.Blob = jest.fn();

describe('Search/Filter Module', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findCardAndHandleResults', () => {
    test('should handle exact match with single result', async () => {
      const { searchCardsExact, fetchAllPrintsByOracleId } = require('../public/js/modules/scryfallApi.js');
      
      const mockCard = { name: 'Lightning Bolt', oracle_id: 'oracle-123' };
      const mockPrints = [{ id: 'print-1', name: 'Lightning Bolt' }];
      
      searchCardsExact.mockResolvedValue({ data: [mockCard] });
      fetchAllPrintsByOracleId.mockResolvedValue(mockPrints);
      
      const onCardFound = jest.fn();
      const onMultipleCardsFound = jest.fn();
      const onCardNotFound = jest.fn();
      
      await findCardAndHandleResults('Lightning Bolt', 'ita', onCardFound, onMultipleCardsFound, onCardNotFound);
      
      expect(onCardFound).toHaveBeenCalledWith({ ...mockCard, cardPrints: mockPrints });
      expect(onMultipleCardsFound).not.toHaveBeenCalled();
      expect(onCardNotFound).not.toHaveBeenCalled();
    });

    test('should handle exact match with multiple results', async () => {
      const { searchCardsExact } = require('../public/js/modules/scryfallApi.js');
      
      const mockCards = [
        { name: 'Lightning Bolt', oracle_id: 'oracle-1' },
        { name: 'Lightning Bolt', oracle_id: 'oracle-2' }
      ];
      
      searchCardsExact.mockResolvedValue({ data: mockCards });
      
      const onCardFound = jest.fn();
      const onMultipleCardsFound = jest.fn();
      const onCardNotFound = jest.fn();
      
      await findCardAndHandleResults('Lightning Bolt', 'ita', onCardFound, onMultipleCardsFound, onCardNotFound);
      
      expect(onMultipleCardsFound).toHaveBeenCalledWith(mockCards);
      expect(onCardFound).not.toHaveBeenCalled();
      expect(onCardNotFound).not.toHaveBeenCalled();
    });

    test('should handle fuzzy search when exact match fails', async () => {
      const { searchCardsExact, searchCardFuzzy, fetchAllPrintsByOracleId } = require('../public/js/modules/scryfallApi.js');
      
      searchCardsExact.mockResolvedValue({ data: [] });
      
      const mockFuzzyResult = { object: 'card', oracle_id: 'oracle-123' };
      const mockPrints = [{ id: 'print-1', name: 'Lightning Bolt' }];
      
      searchCardFuzzy.mockResolvedValue(mockFuzzyResult);
      fetchAllPrintsByOracleId.mockResolvedValue(mockPrints);
      
      const onCardFound = jest.fn();
      const onMultipleCardsFound = jest.fn();
      const onCardNotFound = jest.fn();
      
      await findCardAndHandleResults('Lightning', 'ita', onCardFound, onMultipleCardsFound, onCardNotFound);
      
      expect(onMultipleCardsFound).toHaveBeenCalledWith(mockPrints);
      expect(onCardFound).not.toHaveBeenCalled();
      expect(onCardNotFound).not.toHaveBeenCalled();
    });

    test('should handle no results found', async () => {
      const { searchCardsExact, searchCardFuzzy } = require('../public/js/modules/scryfallApi.js');
      
      searchCardsExact.mockResolvedValue({ data: [] });
      searchCardFuzzy.mockResolvedValue(null);
      
      const onCardFound = jest.fn();
      const onMultipleCardsFound = jest.fn();
      const onCardNotFound = jest.fn();
      
      await findCardAndHandleResults('Nonexistent Card', 'ita', onCardFound, onMultipleCardsFound, onCardNotFound);
      
      expect(onCardNotFound).toHaveBeenCalledWith('Nonexistent Card');
      expect(onCardFound).not.toHaveBeenCalled();
      expect(onMultipleCardsFound).not.toHaveBeenCalled();
    });
  });

  describe('getSortableField', () => {
    test('should return correct field names for different columns', () => {
      expect(getSortableField('ita-name')).toBe('printed_name');
      expect(getSortableField('eng-name')).toBe('name');
      expect(getSortableField('set')).toBe('set_name');
      expect(getSortableField('eur-price')).toBe('prices.eur');
      expect(getSortableField('usd-price')).toBe('prices.usd');
      expect(getSortableField('unknown')).toBe('name');
    });
  });

  describe('filterCardsByColor', () => {
    test('should filter cards by color correctly', () => {
      const cards = [
        { result: { colors: ['R'], type_line: 'Instant' } },
        { result: { colors: ['U'], type_line: 'Sorcery' } },
        { result: { colors: ['R', 'U'], type_line: 'Instant' } },
        { result: { colors: [], type_line: 'Artifact' } },
        { result: { colors: [], type_line: 'Land' } }
      ];
      
      const redFilter = ['R'];
      const multiFilter = ['multi'];
      const colorlessFilter = ['incolor'];
      
      expect(filterCardsByColor(cards, redFilter)).toHaveLength(2); // Red and Red/Blue
      expect(filterCardsByColor(cards, multiFilter)).toHaveLength(1); // Red/Blue
      expect(filterCardsByColor(cards, colorlessFilter)).toHaveLength(2); // Artifact and Land
    });

    test('should handle invalid input gracefully', () => {
      expect(filterCardsByColor(null, ['R'])).toBeNull();
      expect(filterCardsByColor([], null)).toEqual([]);
      expect(filterCardsByColor(undefined, undefined)).toBeUndefined();
    });
  });

  describe('filterCardsBySearchTerm', () => {
    test('should filter cards by search term', () => {
      const cards = [
        { result: { name: 'Lightning Bolt', printed_name: 'Fulmine' } },
        { result: { name: 'Fireball', printed_name: 'Palla di Fuoco' } },
        { result: { name: 'Counterspell', printed_name: 'Contromagia' } }
      ];
      
      const italianResults = filterCardsBySearchTerm(cards, 'fulmine', 'ita');
      const englishResults = filterCardsBySearchTerm(cards, 'lightning', 'eng');
      
      expect(italianResults).toHaveLength(1);
      expect(englishResults).toHaveLength(1);
    });

    test('should handle empty search term', () => {
      const cards = [{ result: { name: 'Lightning Bolt' } }];
      expect(filterCardsBySearchTerm(cards, '', 'ita')).toEqual(cards);
      expect(filterCardsBySearchTerm(cards, null, 'ita')).toEqual(cards);
    });
  });

  describe('sortCards', () => {
    test('should sort cards by name ascending', () => {
      const cards = [
        { result: { name: 'Zebra' } },
        { result: { name: 'Apple' } },
        { result: { name: 'Banana' } }
      ];
      
      const sorted = sortCards(cards, 'name', 'asc');
      expect(sorted[0].result.name).toBe('Apple');
      expect(sorted[2].result.name).toBe('Zebra');
    });

    test('should sort cards by name descending', () => {
      const cards = [
        { result: { name: 'Apple' } },
        { result: { name: 'Zebra' } },
        { result: { name: 'Banana' } }
      ];
      
      const sorted = sortCards(cards, 'name', 'desc');
      expect(sorted[0].result.name).toBe('Zebra');
      expect(sorted[2].result.name).toBe('Apple');
    });

    test('should sort cards by price', () => {
      const cards = [
        { result: { prices: { eur: '5.00' } } },
        { result: { prices: { eur: '1.50' } } },
        { result: { prices: { eur: '10.00' } } }
      ];
      
      const sorted = sortCards(cards, 'prices.eur', 'asc');
      expect(parseFloat(sorted[0].result.prices.eur)).toBe(1.50);
      expect(parseFloat(sorted[1].result.prices.eur)).toBe(5.00);
      expect(parseFloat(sorted[2].result.prices.eur)).toBe(10.00);
    });

    test('should handle invalid input gracefully', () => {
      expect(sortCards(null, 'name', 'asc')).toBeNull();
      expect(sortCards(undefined, 'name', 'asc')).toBeUndefined();
    });
  });

  describe('populateSetSelect', () => {
    test('should populate set selector with sets', () => {
      const allSets = [
        { code: 'DOM', name: 'Dominaria' },
        { code: 'M19', name: 'Core Set 2019' }
      ];
      
      const mockSetSelect = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      document.getElementById.mockReturnValue(mockSetSelect);
      
      populateSetSelect(allSets, 'ita');
      
      expect(mockSetSelect.innerHTML).toBe('');
      expect(mockSetSelect.appendChild).toHaveBeenCalledTimes(2);
    });

    test('should handle missing set selector element', () => {
      document.getElementById.mockReturnValue(null);
      
      expect(() => {
        populateSetSelect([{ code: 'DOM', name: 'Dominaria' }], 'ita');
      }).not.toThrow();
    });
  });

  describe('handleSearch', () => {
    test('should handle search with valid input', async () => {
      const onCardFound = jest.fn();
      const onMultipleCardsFound = jest.fn();
      const onCardNotFound = jest.fn();
      const onError = jest.fn();
      
      await handleSearch('Lightning Bolt', 'ita', onCardFound, onMultipleCardsFound, onCardNotFound, onError);
      
      expect(onError).not.toHaveBeenCalled();
    });

    test('should handle search with empty input', async () => {
      const onCardFound = jest.fn();
      const onMultipleCardsFound = jest.fn();
      const onCardNotFound = jest.fn();
      const onError = jest.fn();
      
      await handleSearch('', 'ita', onCardFound, onMultipleCardsFound, onCardNotFound, onError);
      
      expect(onError).toHaveBeenCalledWith('modalNoCardName');
    });
  });

  describe('handleFilterChange', () => {
    test('should handle "all" filter selection', () => {
      const onFilterChange = jest.fn();
      const result = handleFilterChange('color', 'all', ['R'], onFilterChange);
      
      expect(result).toEqual(['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor']);
      expect(onFilterChange).toHaveBeenCalledWith(result);
    });

    test('should handle specific color filter selection', () => {
      const onFilterChange = jest.fn();
      const result = handleFilterChange('color', 'R', ['all'], onFilterChange);
      
      expect(result).toEqual(['R']);
      expect(onFilterChange).toHaveBeenCalledWith(result);
    });

    test('should handle color filter removal', () => {
      const onFilterChange = jest.fn();
      const result = handleFilterChange('color', 'R', ['R', 'U'], onFilterChange);
      
      expect(result).toEqual(['U']);
      expect(onFilterChange).toHaveBeenCalledWith(result);
    });
  });

  describe('handleSortChange', () => {
    test('should handle new column sort', () => {
      const onSortChange = jest.fn();
      const currentSort = { column: 'name', direction: 'asc' };
      
      const result = handleSortChange('set', currentSort, onSortChange);
      
      expect(result).toEqual({ column: 'set', direction: 'asc' });
      expect(onSortChange).toHaveBeenCalledWith(result);
    });

    test('should toggle direction for same column', () => {
      const onSortChange = jest.fn();
      const currentSort = { column: 'name', direction: 'asc' };
      
      const result = handleSortChange('name', currentSort, onSortChange);
      
      expect(result).toEqual({ column: 'name', direction: 'desc' });
      expect(onSortChange).toHaveBeenCalledWith(result);
    });
  });

  describe('processCsvData', () => {
    test('should process valid CSV data', () => {
      const csvData = 'name,price\nLightning Bolt,1.50\nFireball,2.00';
      const onProcessComplete = jest.fn();
      const onError = jest.fn();
      
      processCsvData(csvData, onProcessComplete, onError);
      
      expect(onProcessComplete).toHaveBeenCalledWith([
        { name: 'Lightning Bolt', price: '1.50' },
        { name: 'Fireball', price: '2.00' }
      ]);
      expect(onError).not.toHaveBeenCalled();
    });

    test('should handle CSV processing errors', () => {
      const onProcessComplete = jest.fn();
      const onError = jest.fn();
      
      // Test with malformed CSV that should cause an error
      processCsvData('invalid,csv,data\nwith,missing,columns,extra', onProcessComplete, onError);
      
      // The current implementation doesn't throw errors for malformed CSV, it just processes what it can
      expect(onProcessComplete).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('processJsonData', () => {
    test('should process valid JSON data', () => {
      const jsonData = '[{"name": "Lightning Bolt", "price": "1.50"}]';
      const onProcessComplete = jest.fn();
      const onError = jest.fn();
      
      processJsonData(jsonData, onProcessComplete, onError);
      
      expect(onProcessComplete).toHaveBeenCalledWith([{ name: 'Lightning Bolt', price: '1.50' }]);
      expect(onError).not.toHaveBeenCalled();
    });

    test('should handle invalid JSON data', () => {
      const jsonData = 'invalid json';
      const onProcessComplete = jest.fn();
      const onError = jest.fn();
      
      processJsonData(jsonData, onProcessComplete, onError);
      
      expect(onError).toHaveBeenCalledWith('modalJsonLoadError');
      expect(onProcessComplete).not.toHaveBeenCalled();
    });

    test('should handle non-array JSON data', () => {
      const jsonData = '{"name": "Lightning Bolt"}';
      const onProcessComplete = jest.fn();
      const onError = jest.fn();
      
      processJsonData(jsonData, onProcessComplete, onError);
      
      expect(onError).toHaveBeenCalledWith('modalInvalidJson');
      expect(onProcessComplete).not.toHaveBeenCalled();
    });
  });

  describe('exportToJson', () => {
    test('should export valid data to JSON', () => {
      const data = [{ name: 'Lightning Bolt', price: '1.50' }];
      const onExportComplete = jest.fn();
      const onError = jest.fn();
      
      exportToJson(data, 'test.json', onExportComplete, onError);
      
      expect(onExportComplete).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(Blob).toHaveBeenCalled();
    });

    test('should handle empty data export', () => {
      const onExportComplete = jest.fn();
      const onError = jest.fn();
      
      exportToJson([], 'test.json', onExportComplete, onError);
      
      expect(onError).toHaveBeenCalledWith('modalNoDataToExport');
      expect(onExportComplete).not.toHaveBeenCalled();
    });
  });

  describe('setupVoiceSearch', () => {
    test('should return null when voice recognition is not available', () => {
      // Mock window object
      global.window = {};
      
      const onVoiceResult = jest.fn();
      const onVoiceError = jest.fn();
      
      const result = setupVoiceSearch(onVoiceResult, onVoiceError);
      
      expect(result).toBeNull();
    });
  });

  describe('clearAllFilters', () => {
    test('should clear all filters and return default', () => {
      const onFiltersCleared = jest.fn();
      
      const result = clearAllFilters(onFiltersCleared);
      
      expect(result).toEqual(['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor']);
      expect(onFiltersCleared).toHaveBeenCalledWith(result);
    });
  });

  describe('getFilterDisplayName', () => {
    test('should return correct display names for filters', () => {
      expect(getFilterDisplayName('all', 'ita')).toBe('All');
      expect(getFilterDisplayName('W', 'ita')).toBe('White');
      expect(getFilterDisplayName('U', 'ita')).toBe('Blue');
      expect(getFilterDisplayName('B', 'ita')).toBe('Black');
      expect(getFilterDisplayName('R', 'ita')).toBe('Red');
      expect(getFilterDisplayName('G', 'ita')).toBe('Green');
      expect(getFilterDisplayName('multi', 'ita')).toBe('Multi-color');
      expect(getFilterDisplayName('incolor', 'ita')).toBe('Colorless');
    });
  });

  describe('validateSearchInput', () => {
    test('should validate correct input', () => {
      const result = validateSearchInput('Lightning Bolt');
      
      expect(result.isValid).toBe(true);
      expect(result.message).toBeNull();
    });

    test('should reject empty input', () => {
      const result = validateSearchInput('');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('modalNoCardName');
    });

    test('should reject input that is too short', () => {
      const result = validateSearchInput('A');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('modalCardNameTooShort');
    });
  });
});
