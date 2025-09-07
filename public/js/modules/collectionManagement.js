/**
 * Collection Management module for handling collection display, value calculations, import/export, and related functionality
 * Handles all collection operations, pagination, value calculations, and data management
 */

import { getTranslation } from './translations.js';
import { 
  fetchCollectionPage,
  getAllCollectionCards,
  addCardToCollection as firebaseAddCardToCollection,
  updateCardInCollection,
  removeCardFromCollection,
  addCardToDeck as firebaseAddCardToDeck,
  removeCardFromDeck as firebaseRemoveCardFromDeck,
  removeCardFromAllDecksByOracleId as firebaseRemoveCardFromAllDecksByOracleId
} from './firebase.js';
import { 
  renderTable,
  updatePaginationUI,
  calculateAndDisplayTotalValue as uiCalculateAndDisplayTotalValue,
  renderCollectionCards as uiRenderCollectionCards,
  toggleProgress,
  updateProgressText
} from './ui.js';
import { 
  processCsvData,
  processJsonData,
  exportToJson
} from './searchFilter.js';

/**
 * Add a card to the collection
 * @param {Object} cardData - Card data to add
 * @param {string} userId - User ID
 * @param {Function} onSuccess - Callback for successful addition
 * @param {Function} onError - Callback for errors
 */
export async function addCardToCollection(cardData, userId, onSuccess, onError) {
    try {
        const success = await firebaseAddCardToCollection(userId, cardData);
        if (success) {
            console.log("Card added to Firestore collection:", cardData.name);
            onSuccess();
        } else {
            console.error("Error adding card to collection");
            onError('Error adding card to collection');
        }
    } catch (error) {
        console.error("Error adding card to collection:", error);
        onError('Error adding card to collection');
    }
}

/**
 * Delete a card from the collection
 * @param {string} cardId - Card ID to delete
 * @param {string} userId - User ID
 * @param {Function} onSuccess - Callback for successful deletion
 * @param {Function} onError - Callback for errors
 */
export async function deleteCardFromCollection(cardId, userId, onSuccess, onError) {
    try {
        await removeCardFromCollection(userId, cardId);
        onSuccess();
    } catch (error) {
        console.error("Error deleting card from collection:", error);
        onError('Error deleting card from collection');
    }
}

/**
 * Fetch and render a page of the collection
 * @param {string} direction - Direction for pagination ('first', 'next', 'prev')
 * @param {string} userId - User ID
 * @param {number} cardsPerPage - Number of cards per page
 * @param {Array} pageFirstDocs - Array of first documents for each page
 * @param {Object} lastVisible - Last visible document for pagination
 * @param {number} currentPage - Current page number
 * @param {Array} activeFilters - Active color filters
 * @param {string} activeLang - Current language
 * @param {Function} onSuccess - Callback for successful fetch
 * @param {Function} onError - Callback for errors
 * @returns {Object} Updated pagination state
 */
export async function fetchAndRenderCollectionPage(direction, userId, cardsPerPage, pageFirstDocs, lastVisible, currentPage, activeFilters, activeLang, onSuccess, onError) {
    toggleProgress(true);
    
    try {
        const pageData = await fetchCollectionPage(userId, direction, cardsPerPage, pageFirstDocs, lastVisible);
        
        let newCurrentPage = currentPage;
        let newPageFirstDocs = [...pageFirstDocs];
        let newLastVisible = lastVisible;
        let newFirstVisible = null;
        
        if (pageData.cards.length > 0) {
            if (direction === 'next') {
                newCurrentPage++;
                newPageFirstDocs.push(pageData.firstVisible);
            } else if (direction === 'prev') {
                newCurrentPage--;
            }
            newFirstVisible = pageData.firstVisible;
            newLastVisible = pageData.lastVisible;
        }
        
        // Render the table with the fetched data
        renderTable(pageData.cards, activeFilters, activeLang, 
            (e, uniqueId) => handleSetChange(e, uniqueId, userId),
            (uniqueId) => handleDeleteCard(uniqueId, userId),
            newCurrentPage, cardsPerPage
        );
        
        updatePaginationUI(pageData.cards.length, newCurrentPage, activeLang);
        
        onSuccess(pageData.cards);
        
        return {
            currentPage: newCurrentPage,
            pageFirstDocs: newPageFirstDocs,
            lastVisible: newLastVisible,
            firstVisible: newFirstVisible
        };
    } catch (error) {
        console.error("Error fetching collection page:", error);
        onError("Error loading data. Check console for details.");
        return null;
    } finally {
        toggleProgress(false);
    }
}

/**
 * Calculate and display total collection value
 * @param {string} userId - User ID
 * @param {string} appId - App ID
 * @param {string} activeLang - Current language
 * @param {Function} onSuccess - Callback for successful calculation
 * @param {Function} onError - Callback for errors
 */
export async function calculateAndDisplayTotalValue(userId, appId, activeLang, onSuccess, onError) {
    try {
        const allCards = await getAllCollectionCards(userId);
        await uiCalculateAndDisplayTotalValue(allCards, activeLang);
        onSuccess();
    } catch (error) {
        console.error("Error calculating total value:", error);
        onError('Error calculating total value');
    }
}

/**
 * Render collection cards for deck editor
 * @param {string} userId - User ID
 * @param {string} appId - App ID
 * @param {string} searchTerm - Search term for filtering
 * @param {string} activeLang - Current language
 * @param {Function} onCardClick - Callback when card is clicked
 * @param {Function} onError - Callback for errors
 */
export async function renderCollectionCards(userId, appId, searchTerm, activeLang, onCardClick, onError) {
    try {
        const allCards = await getAllCollectionCards(userId);
        uiRenderCollectionCards(allCards, searchTerm, activeLang, onCardClick);
    } catch (error) {
        console.error("Error rendering collection cards:", error);
        onError('Error loading collection cards');
    }
}

/**
 * Add a card to a deck
 * @param {Object} cardData - Card data to add
 * @param {string} userId - User ID
 * @param {string} currentDeckId - Current deck ID
 * @param {Object} currentDeck - Current deck object
 * @param {Function} onSuccess - Callback for successful addition
 * @param {Function} onError - Callback for errors
 */
export async function addCardToDeck(cardData, userId, currentDeckId, currentDeck, onSuccess, onError) {
    try {
        if (currentDeckId && userId) {
            await firebaseAddCardToDeck(userId, currentDeckId, cardData, currentDeck.cards || []);
            onSuccess();
        }
    } catch (error) {
        console.error("Error adding card to deck:", error);
        onError('Error adding card to deck');
    }
}

/**
 * Remove a card from a deck
 * @param {string} cardId - Card ID to remove
 * @param {string} userId - User ID
 * @param {string} currentDeckId - Current deck ID
 * @param {Object} currentDeck - Current deck object
 * @param {Function} onSuccess - Callback for successful removal
 * @param {Function} onError - Callback for errors
 */
export async function removeCardFromDeck(cardId, userId, currentDeckId, currentDeck, onSuccess, onError) {
    try {
        if (currentDeckId && userId) {
            await firebaseRemoveCardFromDeck(userId, currentDeckId, cardId, currentDeck.cards || []);
            onSuccess();
        }
    } catch (error) {
        console.error("Error removing card from deck:", error);
        onError('Error removing card from deck');
    }
}

/**
 * Remove a card from all decks by oracle ID
 * @param {string} oracleId - Oracle ID of the card
 * @param {string} userId - User ID
 * @param {Function} onSuccess - Callback for successful removal
 * @param {Function} onError - Callback for errors
 */
export async function removeCardFromAllDecksByOracleId(oracleId, userId, onSuccess, onError) {
    try {
        const updatedDecksCount = await firebaseRemoveCardFromAllDecksByOracleId(userId, oracleId);
        console.log(`Card with oracle_id ${oracleId} removed from ${updatedDecksCount} decks.`);
        onSuccess(updatedDecksCount);
    } catch (error) {
        console.error("Error removing card from all decks:", error);
        onError('Error removing card from all decks');
    }
}

/**
 * Handle set selection change
 * @param {Event} e - Event object
 * @param {string} uniqueId - Unique card ID
 * @param {string} userId - User ID
 * @param {Function} onSuccess - Callback for successful update
 * @param {Function} onError - Callback for errors
 */
export async function handleSetChange(e, uniqueId, userId, onSuccess, onError) {
    try {
        const selectedPrintId = e.target.value;
        await updateCardInCollection(userId, uniqueId, { printId: selectedPrintId });
        onSuccess();
    } catch (error) {
        console.error("Error updating card set:", error);
        onError('Error updating card set');
    }
}

/**
 * Handle card deletion
 * @param {string} uniqueId - Unique card ID
 * @param {string} userId - User ID
 * @param {Function} onSuccess - Callback for successful deletion
 * @param {Function} onError - Callback for errors
 */
export async function handleDeleteCard(uniqueId, userId, onSuccess, onError) {
    try {
        await removeCardFromCollection(userId, uniqueId);
        onSuccess();
    } catch (error) {
        console.error("Error deleting card:", error);
        onError('Error deleting card');
    }
}

/**
 * Process CSV file for collection import
 * @param {File} file - CSV file to process
 * @param {string} userId - User ID
 * @param {string} appId - App ID
 * @param {Function} onSuccess - Callback for successful import
 * @param {Function} onError - Callback for errors
 * @param {Function} onProgress - Callback for progress updates
 */
export function processCsvFile(file, userId, appId, onSuccess, onError, onProgress) {
    if (!file) {
        onError('modalNoCardName');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const csvData = event.target.result;
            processCsvData(csvData, 
                async (data) => {
                    onProgress('Processing CSV data...');
                    
                    // Add each card to the collection
                    for (const cardData of data) {
                        await firebaseAddCardToCollection(userId, cardData);
                    }
                    
                    onSuccess(data.length);
                },
                (error) => onError(error)
            );
        } catch (error) {
            console.error("Error processing CSV file:", error);
            onError('modalCsvError');
        }
    };
    reader.readAsText(file);
}

/**
 * Process JSON file for collection import
 * @param {File} file - JSON file to process
 * @param {string} userId - User ID
 * @param {string} appId - App ID
 * @param {Function} onSuccess - Callback for successful import
 * @param {Function} onError - Callback for errors
 * @param {Function} onProgress - Callback for progress updates
 */
export function processJsonFile(file, userId, appId, onSuccess, onError, onProgress) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const jsonData = event.target.result;
            processJsonData(jsonData,
                async (data) => {
                    onProgress('Processing JSON data...');
                    
                    // Clear existing collection
                    onProgress('Clearing existing collection...');
                    // Note: This would need to be implemented in the Firebase module
                    
                    // Add new cards
                    onProgress('Adding new cards...');
                    for (const cardData of data) {
                        const cardToSave = { ...cardData };
                        delete cardToSave.cardPrints;
                        await firebaseAddCardToCollection(userId, cardToSave);
                    }
                    
                    onSuccess(data.length);
                },
                (error) => onError(error)
            );
        } catch (error) {
            console.error("Error processing JSON file:", error);
            onError('modalJsonLoadError');
        }
    };
    reader.readAsText(file);
}

/**
 * Export collection to JSON
 * @param {Array} collectionData - Collection data to export
 * @param {string} filename - Filename for the export
 * @param {Function} onSuccess - Callback for successful export
 * @param {Function} onError - Callback for errors
 */
export function exportCollectionToJson(collectionData, filename, onSuccess, onError) {
    exportToJson(collectionData, filename, onSuccess, onError);
}

/**
 * Export decks to JSON
 * @param {Array} decks - Decks data to export
 * @param {string} filename - Filename for the export
 * @param {Function} onSuccess - Callback for successful export
 * @param {Function} onError - Callback for errors
 */
export function exportDecksToJson(decks, filename, onSuccess, onError) {
    exportToJson(decks, filename, onSuccess, onError);
}

/**
 * Handle pagination
 * @param {string} direction - Direction for pagination ('next' or 'prev')
 * @param {Object} paginationState - Current pagination state
 * @param {string} userId - User ID
 * @param {number} cardsPerPage - Number of cards per page
 * @param {Array} activeFilters - Active color filters
 * @param {string} activeLang - Current language
 * @param {Function} onSuccess - Callback for successful pagination
 * @param {Function} onError - Callback for errors
 * @returns {Object} Updated pagination state
 */
export async function handlePagination(direction, paginationState, userId, cardsPerPage, activeFilters, activeLang, onSuccess, onError) {
    const { currentPage, pageFirstDocs, lastVisible } = paginationState;
    
    return await fetchAndRenderCollectionPage(
        direction, userId, cardsPerPage, pageFirstDocs, lastVisible, 
        currentPage, activeFilters, activeLang, onSuccess, onError
    );
}

/**
 * Handle page size change
 * @param {number} newPageSize - New page size
 * @param {Object} paginationState - Current pagination state
 * @param {string} userId - User ID
 * @param {Array} activeFilters - Active color filters
 * @param {string} activeLang - Current language
 * @param {Function} onSuccess - Callback for successful change
 * @param {Function} onError - Callback for errors
 * @returns {Object} Updated pagination state
 */
export async function handlePageSizeChange(newPageSize, paginationState, userId, activeFilters, activeLang, onSuccess, onError) {
    const { pageFirstDocs, lastVisible } = paginationState;
    
    return await fetchAndRenderCollectionPage(
        'first', userId, newPageSize, [null], null, 
        1, activeFilters, activeLang, onSuccess, onError
    );
}

/**
 * Handle collection search
 * @param {string} searchTerm - Search term
 * @param {Object} paginationState - Current pagination state
 * @param {string} userId - User ID
 * @param {number} cardsPerPage - Number of cards per page
 * @param {Array} activeFilters - Active color filters
 * @param {string} activeLang - Current language
 * @param {Function} onSuccess - Callback for successful search
 * @param {Function} onError - Callback for errors
 * @returns {Object} Updated pagination state
 */
export async function handleCollectionSearch(searchTerm, paginationState, userId, cardsPerPage, activeFilters, activeLang, onSuccess, onError) {
    const { pageFirstDocs, lastVisible } = paginationState;
    
    return await fetchAndRenderCollectionPage(
        'first', userId, cardsPerPage, [null], null, 
        1, activeFilters, activeLang, onSuccess, onError
    );
}

/**
 * Reset collection filters
 * @param {Object} paginationState - Current pagination state
 * @param {string} userId - User ID
 * @param {number} cardsPerPage - Number of cards per page
 * @param {Array} activeFilters - Active color filters
 * @param {string} activeLang - Current language
 * @param {Function} onSuccess - Callback for successful reset
 * @param {Function} onError - Callback for errors
 * @returns {Object} Updated pagination state
 */
export async function resetCollectionFilters(paginationState, userId, cardsPerPage, activeFilters, activeLang, onSuccess, onError) {
    const { pageFirstDocs, lastVisible } = paginationState;
    
    return await fetchAndRenderCollectionPage(
        'first', userId, cardsPerPage, [null], null, 
        1, activeFilters, activeLang, onSuccess, onError
    );
}

/**
 * Get collection statistics
 * @param {string} userId - User ID
 * @param {Function} onSuccess - Callback for successful retrieval
 * @param {Function} onError - Callback for errors
 */
export async function getCollectionStatistics(userId, onSuccess, onError) {
    try {
        const allCards = await getAllCollectionCards(userId);
        
        const stats = {
            totalCards: allCards.length,
            totalValueEur: 0,
            totalValueUsd: 0,
            cardsBySet: {},
            cardsByColor: {},
            cardsByRarity: {}
        };
        
        allCards.forEach(card => {
            const cardData = card.result || card;
            
            // Calculate total value
            if (cardData.prices) {
                if (cardData.prices.eur) {
                    stats.totalValueEur += parseFloat(cardData.prices.eur) || 0;
                }
                if (cardData.prices.usd) {
                    stats.totalValueUsd += parseFloat(cardData.prices.usd) || 0;
                }
            }
            
            // Count by set
            const setName = cardData.set_name || 'Unknown';
            stats.cardsBySet[setName] = (stats.cardsBySet[setName] || 0) + 1;
            
            // Count by color
            const colors = cardData.colors || [];
            if (colors.length === 0) {
                stats.cardsByColor['Colorless'] = (stats.cardsByColor['Colorless'] || 0) + 1;
            } else if (colors.length > 1) {
                stats.cardsByColor['Multi-color'] = (stats.cardsByColor['Multi-color'] || 0) + 1;
            } else {
                const color = colors[0];
                stats.cardsByColor[color] = (stats.cardsByColor[color] || 0) + 1;
            }
            
            // Count by rarity
            const rarity = cardData.rarity || 'Unknown';
            stats.cardsByRarity[rarity] = (stats.cardsByRarity[rarity] || 0) + 1;
        });
        
        onSuccess(stats);
    } catch (error) {
        console.error("Error getting collection statistics:", error);
        onError('Error getting collection statistics');
    }
}
