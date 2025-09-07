/**
 * Tests for the Collection Management module
 */

const { 
  addCardToCollection,
  deleteCardFromCollection,
  fetchAndRenderCollectionPage,
  calculateAndDisplayTotalValue,
  renderCollectionCards,
  addCardToDeck,
  removeCardFromDeck,
  removeCardFromAllDecksByOracleId,
  handleSetChange,
  handleDeleteCard,
  processCsvFile,
  processJsonFile,
  exportCollectionToJson,
  exportDecksToJson,
  handlePagination,
  handlePageSizeChange,
  handleCollectionSearch,
  resetCollectionFilters,
  getCollectionStatistics
} = require('../public/js/modules/collectionManagement.js');

// Mock dependencies
jest.mock('../public/js/modules/translations.js', () => ({
  getTranslation: jest.fn((key, lang) => {
    const translations = {
      'modalNoCardName': 'No card name provided',
      'modalCsvError': 'CSV Error',
      'modalJsonLoadError': 'JSON Load Error'
    };
    return translations[key] || key;
  })
}));

jest.mock('../public/js/modules/firebase.js', () => ({
  fetchCollectionPage: jest.fn(),
  getAllCollectionCards: jest.fn(),
  addCardToCollection: jest.fn(),
  updateCardInCollection: jest.fn(),
  removeCardFromCollection: jest.fn(),
  addCardToDeck: jest.fn(),
  removeCardFromDeck: jest.fn(),
  removeCardFromAllDecksByOracleId: jest.fn()
}));

jest.mock('../public/js/modules/ui.js', () => ({
  renderTable: jest.fn(),
  updatePaginationUI: jest.fn(),
  calculateAndDisplayTotalValue: jest.fn(),
  renderCollectionCards: jest.fn(),
  toggleProgress: jest.fn(),
  updateProgressText: jest.fn()
}));

jest.mock('../public/js/modules/searchFilter.js', () => ({
  processCsvData: jest.fn(),
  processJsonData: jest.fn(),
  exportToJson: jest.fn()
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

// Mock FileReader
global.FileReader = jest.fn(() => ({
  readAsText: jest.fn(),
  onload: null
}));

describe('Collection Management Module', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addCardToCollection', () => {
    test('should add card to collection successfully', async () => {
      const { addCardToCollection: firebaseAddCardToCollection } = require('../public/js/modules/firebase.js');
      
      firebaseAddCardToCollection.mockResolvedValue(true);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await addCardToCollection({ name: 'Lightning Bolt' }, 'user123', onSuccess, onError);
      
      expect(firebaseAddCardToCollection).toHaveBeenCalledWith('user123', { name: 'Lightning Bolt' });
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    test('should handle error when adding card fails', async () => {
      const { addCardToCollection: firebaseAddCardToCollection } = require('../public/js/modules/firebase.js');
      
      firebaseAddCardToCollection.mockResolvedValue(false);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await addCardToCollection({ name: 'Lightning Bolt' }, 'user123', onSuccess, onError);
      
      expect(onError).toHaveBeenCalledWith('Error adding card to collection');
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('deleteCardFromCollection', () => {
    test('should delete card from collection successfully', async () => {
      const { removeCardFromCollection } = require('../public/js/modules/firebase.js');
      
      removeCardFromCollection.mockResolvedValue();
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await deleteCardFromCollection('card123', 'user123', onSuccess, onError);
      
      expect(removeCardFromCollection).toHaveBeenCalledWith('user123', 'card123');
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    test('should handle error when deleting card fails', async () => {
      const { removeCardFromCollection } = require('../public/js/modules/firebase.js');
      
      removeCardFromCollection.mockRejectedValue(new Error('Delete failed'));
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await deleteCardFromCollection('card123', 'user123', onSuccess, onError);
      
      expect(onError).toHaveBeenCalledWith('Error deleting card from collection');
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('fetchAndRenderCollectionPage', () => {
    test('should fetch and render collection page successfully', async () => {
      const { fetchCollectionPage } = require('../public/js/modules/firebase.js');
      const { renderTable, updatePaginationUI, toggleProgress } = require('../public/js/modules/ui.js');
      
      const mockPageData = {
        cards: [{ id: '1', result: { name: 'Lightning Bolt' } }],
        hasMore: true,
        lastVisible: { id: '1' },
        firstVisible: { id: '1' }
      };
      
      fetchCollectionPage.mockResolvedValue(mockPageData);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await fetchAndRenderCollectionPage(
        'first', 'user123', 50, [null], null, 1, ['all'], 'ita', onSuccess, onError
      );
      
      expect(toggleProgress).toHaveBeenCalledWith(true);
      expect(fetchCollectionPage).toHaveBeenCalledWith('user123', 'first', 50, [null], null);
      expect(renderTable).toHaveBeenCalled();
      expect(updatePaginationUI).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(mockPageData.cards);
      expect(toggleProgress).toHaveBeenCalledWith(false);
      expect(result).toEqual({
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: mockPageData.lastVisible,
        firstVisible: mockPageData.firstVisible
      });
    });

    test('should handle error when fetching collection page fails', async () => {
      const { fetchCollectionPage } = require('../public/js/modules/firebase.js');
      const { toggleProgress } = require('../public/js/modules/ui.js');
      
      fetchCollectionPage.mockRejectedValue(new Error('Fetch failed'));
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await fetchAndRenderCollectionPage(
        'first', 'user123', 50, [null], null, 1, ['all'], 'ita', onSuccess, onError
      );
      
      expect(onError).toHaveBeenCalledWith('Error loading data. Check console for details.');
      expect(onSuccess).not.toHaveBeenCalled();
      expect(toggleProgress).toHaveBeenCalledWith(false);
      expect(result).toBeNull();
    });
  });

  describe('calculateAndDisplayTotalValue', () => {
    test('should calculate and display total value successfully', async () => {
      const { getAllCollectionCards } = require('../public/js/modules/firebase.js');
      const { calculateAndDisplayTotalValue: uiCalculateAndDisplayTotalValue } = require('../public/js/modules/ui.js');
      
      const mockCards = [
        { result: { prices: { eur: '1.50', usd: '1.75' } } },
        { result: { prices: { eur: '2.25', usd: '2.50' } } }
      ];
      
      getAllCollectionCards.mockResolvedValue(mockCards);
      uiCalculateAndDisplayTotalValue.mockResolvedValue();
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await calculateAndDisplayTotalValue('user123', 'app123', 'ita', onSuccess, onError);
      
      expect(getAllCollectionCards).toHaveBeenCalledWith('user123');
      expect(uiCalculateAndDisplayTotalValue).toHaveBeenCalledWith(mockCards, 'ita');
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('addCardToDeck', () => {
    test('should add card to deck successfully', async () => {
      const { addCardToDeck: firebaseAddCardToDeck } = require('../public/js/modules/firebase.js');
      
      firebaseAddCardToDeck.mockResolvedValue();
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await addCardToDeck(
        { name: 'Lightning Bolt' }, 'user123', 'deck123', { cards: [] }, onSuccess, onError
      );
      
      expect(firebaseAddCardToDeck).toHaveBeenCalledWith('user123', 'deck123', { name: 'Lightning Bolt' }, []);
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('removeCardFromDeck', () => {
    test('should remove card from deck successfully', async () => {
      const { removeCardFromDeck: firebaseRemoveCardFromDeck } = require('../public/js/modules/firebase.js');
      
      firebaseRemoveCardFromDeck.mockResolvedValue();
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await removeCardFromDeck('card123', 'user123', 'deck123', { cards: [] }, onSuccess, onError);
      
      expect(firebaseRemoveCardFromDeck).toHaveBeenCalledWith('user123', 'deck123', 'card123', []);
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('removeCardFromAllDecksByOracleId', () => {
    test('should remove card from all decks successfully', async () => {
      const { removeCardFromAllDecksByOracleId: firebaseRemoveCardFromAllDecksByOracleId } = require('../public/js/modules/firebase.js');
      
      firebaseRemoveCardFromAllDecksByOracleId.mockResolvedValue(3);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await removeCardFromAllDecksByOracleId('oracle123', 'user123', onSuccess, onError);
      
      expect(firebaseRemoveCardFromAllDecksByOracleId).toHaveBeenCalledWith('user123', 'oracle123');
      expect(onSuccess).toHaveBeenCalledWith(3);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('handleSetChange', () => {
    test('should handle set change successfully', async () => {
      const { updateCardInCollection } = require('../public/js/modules/firebase.js');
      
      updateCardInCollection.mockResolvedValue();
      
      const mockEvent = { target: { value: 'print123' } };
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await handleSetChange(mockEvent, 'card123', 'user123', onSuccess, onError);
      
      expect(updateCardInCollection).toHaveBeenCalledWith('user123', 'card123', { printId: 'print123' });
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteCard', () => {
    test('should handle card deletion successfully', async () => {
      const { removeCardFromCollection } = require('../public/js/modules/firebase.js');
      
      removeCardFromCollection.mockResolvedValue();
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await handleDeleteCard('card123', 'user123', onSuccess, onError);
      
      expect(removeCardFromCollection).toHaveBeenCalledWith('user123', 'card123');
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('processCsvFile', () => {
    test('should process CSV file successfully', () => {
      const { processCsvData } = require('../public/js/modules/searchFilter.js');
      const { addCardToCollection: firebaseAddCardToCollection } = require('../public/js/modules/firebase.js');
      
      const mockFile = { name: 'test.csv' };
      const mockData = [{ name: 'Lightning Bolt' }, { name: 'Fireball' }];
      
      processCsvData.mockImplementation((csvData, onProcessComplete, onError) => {
        onProcessComplete(mockData);
      });
      
      firebaseAddCardToCollection.mockResolvedValue(true);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const onProgress = jest.fn();
      
      processCsvFile(mockFile, 'user123', 'app123', onSuccess, onError, onProgress);
      
      expect(onProgress).toHaveBeenCalledWith('Processing CSV data...');
      expect(onSuccess).toHaveBeenCalledWith(2);
    });

    test('should handle missing file', () => {
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const onProgress = jest.fn();
      
      processCsvFile(null, 'user123', 'app123', onSuccess, onError, onProgress);
      
      expect(onError).toHaveBeenCalledWith('modalNoCardName');
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('processJsonFile', () => {
    test('should process JSON file successfully', () => {
      const { processJsonData } = require('../public/js/modules/searchFilter.js');
      const { addCardToCollection: firebaseAddCardToCollection } = require('../public/js/modules/firebase.js');
      
      const mockFile = { name: 'test.json' };
      const mockData = [{ name: 'Lightning Bolt' }, { name: 'Fireball' }];
      
      processJsonData.mockImplementation((jsonData, onProcessComplete, onError) => {
        onProcessComplete(mockData);
      });
      
      firebaseAddCardToCollection.mockResolvedValue(true);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const onProgress = jest.fn();
      
      processJsonFile(mockFile, 'user123', 'app123', onSuccess, onError, onProgress);
      
      expect(onProgress).toHaveBeenCalledWith('Processing JSON data...');
      expect(onSuccess).toHaveBeenCalledWith(2);
    });
  });

  describe('exportCollectionToJson', () => {
    test('should export collection to JSON successfully', () => {
      const { exportToJson } = require('../public/js/modules/searchFilter.js');
      
      const mockData = [{ name: 'Lightning Bolt' }, { name: 'Fireball' }];
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      exportCollectionToJson(mockData, 'collection.json', onSuccess, onError);
      
      expect(exportToJson).toHaveBeenCalledWith(mockData, 'collection.json', onSuccess, onError);
    });
  });

  describe('exportDecksToJson', () => {
    test('should export decks to JSON successfully', () => {
      const { exportToJson } = require('../public/js/modules/searchFilter.js');
      
      const mockDecks = [{ name: 'Deck 1' }, { name: 'Deck 2' }];
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      exportDecksToJson(mockDecks, 'decks.json', onSuccess, onError);
      
      expect(exportToJson).toHaveBeenCalledWith(mockDecks, 'decks.json', onSuccess, onError);
    });
  });

  describe('handlePagination', () => {
    test('should handle pagination successfully', async () => {
      const { fetchAndRenderCollectionPage } = require('../public/js/modules/collectionManagement.js');
      
      const mockPaginationState = {
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: null
      };
      
      const mockResult = {
        currentPage: 2,
        pageFirstDocs: [null, { id: '1' }],
        lastVisible: { id: '1' },
        firstVisible: { id: '1' }
      };
      
      fetchAndRenderCollectionPage.mockResolvedValue(mockResult);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await handlePagination(
        'next', mockPaginationState, 'user123', 50, ['all'], 'ita', onSuccess, onError
      );
      
      expect(fetchAndRenderCollectionPage).toHaveBeenCalledWith(
        'next', 'user123', 50, [null], null, 1, ['all'], 'ita', onSuccess, onError
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('handlePageSizeChange', () => {
    test('should handle page size change successfully', async () => {
      const { fetchAndRenderCollectionPage } = require('../public/js/modules/collectionManagement.js');
      
      const mockPaginationState = {
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: null
      };
      
      const mockResult = {
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: null,
        firstVisible: null
      };
      
      fetchAndRenderCollectionPage.mockResolvedValue(mockResult);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await handlePageSizeChange(
        100, mockPaginationState, 'user123', ['all'], 'ita', onSuccess, onError
      );
      
      expect(fetchAndRenderCollectionPage).toHaveBeenCalledWith(
        'first', 'user123', 100, [null], null, 1, ['all'], 'ita', onSuccess, onError
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('handleCollectionSearch', () => {
    test('should handle collection search successfully', async () => {
      const { fetchAndRenderCollectionPage } = require('../public/js/modules/collectionManagement.js');
      
      const mockPaginationState = {
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: null
      };
      
      const mockResult = {
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: null,
        firstVisible: null
      };
      
      fetchAndRenderCollectionPage.mockResolvedValue(mockResult);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await handleCollectionSearch(
        'lightning', mockPaginationState, 'user123', 50, ['all'], 'ita', onSuccess, onError
      );
      
      expect(fetchAndRenderCollectionPage).toHaveBeenCalledWith(
        'first', 'user123', 50, [null], null, 1, ['all'], 'ita', onSuccess, onError
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('resetCollectionFilters', () => {
    test('should reset collection filters successfully', async () => {
      const { fetchAndRenderCollectionPage } = require('../public/js/modules/collectionManagement.js');
      
      const mockPaginationState = {
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: null
      };
      
      const mockResult = {
        currentPage: 1,
        pageFirstDocs: [null],
        lastVisible: null,
        firstVisible: null
      };
      
      fetchAndRenderCollectionPage.mockResolvedValue(mockResult);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      const result = await resetCollectionFilters(
        mockPaginationState, 'user123', 50, ['all'], 'ita', onSuccess, onError
      );
      
      expect(fetchAndRenderCollectionPage).toHaveBeenCalledWith(
        'first', 'user123', 50, [null], null, 1, ['all'], 'ita', onSuccess, onError
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getCollectionStatistics', () => {
    test('should get collection statistics successfully', async () => {
      const { getAllCollectionCards } = require('../public/js/modules/firebase.js');
      
      const mockCards = [
        { result: { name: 'Lightning Bolt', prices: { eur: '1.50', usd: '1.75' }, set_name: 'DOM', colors: ['R'], rarity: 'Common' } },
        { result: { name: 'Fireball', prices: { eur: '2.25', usd: '2.50' }, set_name: 'DOM', colors: ['R'], rarity: 'Uncommon' } },
        { result: { name: 'Counterspell', prices: { eur: '0.50', usd: '0.75' }, set_name: 'M19', colors: ['U'], rarity: 'Common' } }
      ];
      
      getAllCollectionCards.mockResolvedValue(mockCards);
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await getCollectionStatistics('user123', onSuccess, onError);
      
      expect(getAllCollectionCards).toHaveBeenCalledWith('user123');
      expect(onSuccess).toHaveBeenCalledWith({
        totalCards: 3,
        totalValueEur: 4.25,
        totalValueUsd: 5.00,
        cardsBySet: { 'DOM': 2, 'M19': 1 },
        cardsByColor: { 'R': 2, 'U': 1 },
        cardsByRarity: { 'Common': 2, 'Uncommon': 1 }
      });
      expect(onError).not.toHaveBeenCalled();
    });

    test('should handle error when getting collection statistics fails', async () => {
      const { getAllCollectionCards } = require('../public/js/modules/firebase.js');
      
      getAllCollectionCards.mockRejectedValue(new Error('Fetch failed'));
      
      const onSuccess = jest.fn();
      const onError = jest.fn();
      
      await getCollectionStatistics('user123', onSuccess, onError);
      
      expect(onError).toHaveBeenCalledWith('Error getting collection statistics');
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
