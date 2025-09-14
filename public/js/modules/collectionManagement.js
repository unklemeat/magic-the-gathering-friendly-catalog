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
import { fetchCardById } from './scryfallApi.js';
import { 
  renderTable,
  updatePaginationUI,
  calculateAndDisplayTotalValue as uiCalculateAndDisplayTotalValue,
  renderCollectionCards as uiRenderCollectionCards,
  toggleProgress,
  updateProgressText,
  showModal,
  showDeleteConfirmModal,
  showCardDetailsModal
} from './ui.js';
import { 
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
export async function fetchAndRenderCollectionPage(direction, userId, cardsPerPage, pageFirstDocs, lastVisible, currentPage, activeFilters, activeLang, onSuccess, onError, appId = null, decks = [], searchResults = [], searchTerm = '', sortColumn = null, sortDirection = 'asc') {
    toggleProgress(true);
    
    try {
        const pageData = await fetchCollectionPage(userId, direction, cardsPerPage, pageFirstDocs, lastVisible, searchTerm, sortColumn, sortDirection);
        
        let newCurrentPage = currentPage;
        let newPageFirstDocs = [...pageFirstDocs];
        let newLastVisible = lastVisible;
        let newFirstVisible = null;
        
        if (pageData.cards.length > 0) {
            if (direction === 'next') {
                newCurrentPage++;
                newPageFirstDocs.push(pageData.firstVisible);
            } else if (direction === 'prev' && newCurrentPage > 1) {
                newCurrentPage--;
                newPageFirstDocs.pop();
            }
            newFirstVisible = pageData.firstVisible;
            newLastVisible = pageData.lastVisible;
        }
        
        const deleteHandler = createDeleteCardHandler(
            userId, appId, decks, pageData.cards, 
            () => {
                fetchAndRenderCollectionPage('current', userId, cardsPerPage, newPageFirstDocs, lastVisible, newCurrentPage, activeFilters, activeLang, onSuccess, onError, appId, decks, searchResults);
            },
            onError,
            activeLang
        );
        
        renderTable(pageData.cards, activeFilters, activeLang, 
            (e, uniqueId) => handleSetChange(e, uniqueId, userId, 
                (updatedCard) => {
                    const resultIndex = pageData.cards.findIndex(r => r.id === uniqueId);
                    if (resultIndex > -1) {
                        pageData.cards[resultIndex].result = updatedCard;
                    }
                    calculateAndDisplayTotalValue(userId, appId, activeLang, () => {}, () => {});
                },
                (error) => console.error("Error updating card set:", error)
            ),
            deleteHandler,
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
        const parentRow = e.target.closest('tr'); // Ottieni la riga della tabella
        
        const printDataResponse = await fetchCardById(selectedPrintId);
        if (printDataResponse && printDataResponse.object === 'card') {
            const printToSave = { ...printDataResponse };
            delete printToSave.cardPrints;
            
            await updateCardInCollection(userId, uniqueId, printToSave);
            
            if (parentRow) {
                const prices = printToSave.prices;
                const imageUrl = printToSave.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';

                parentRow.querySelector('.price-eur').textContent = prices.eur ? `${prices.eur} €` : "—";
                parentRow.querySelector('.price-usd').textContent = prices.usd ? `${prices.usd} $` : "—";
                parentRow.querySelector('.card-img').src = imageUrl;
                parentRow.querySelector('.text-xs.text-gray-500').textContent = printToSave.set_name;

                // Riassegna l'evento click per il pulsante dei dettagli con i nuovi dati della carta
                const detailsBtn = parentRow.querySelector('.details-btn');
                if (detailsBtn) {
                    detailsBtn.onclick = () => showCardDetailsModal(printToSave, () => {});
                }
            }
            
            onSuccess(printToSave);
        } else {
            throw new Error('Failed to fetch card data from Scryfall');
        }
    } catch (error) {
        console.error("Error updating card set:", error);
        onError('Error updating card set');
    }
}

/**
 * Handle card deletion with confirmation
 * @param {string} uniqueId - Unique ID of the card to delete
 * @param {string} userId - User ID
 * @param {string} appId - App ID
 * @param {Array} decks - Array of user decks
 * @param {Array} searchResults - Current search results
 * @param {Function} onSuccess - Callback for successful deletion
 * @param {Function} onError - Callback for errors
 * @param {string} activeLang - Current language
 */
export async function handleDeleteCard(uniqueId, userId, appId, decks, searchResults, onSuccess, onError, activeLang = 'ita') {
    try {
        const cardInCollection = searchResults.find(r => r.id === uniqueId);
        if (!cardInCollection) {
            onError('Card not found');
            return;
        }

        const cardToDelete = cardInCollection.result;
        const cardOracleId = cardToDelete.oracle_id;

        const decksWithCard = decks.filter(deck => 
            deck.cards && deck.cards.some(card => card.oracle_id === cardOracleId)
        );

        const deleteCardFromCollectionOnly = async () => {
            await removeCardFromCollection(userId, uniqueId);
            onSuccess();
        };
        
        const deleteCardFromEverywhere = async () => {
            await removeCardFromCollection(userId, uniqueId);
            await firebaseRemoveCardFromAllDecksByOracleId(userId, cardOracleId);
            onSuccess();
        };

        if (decksWithCard.length > 0) {
            const deckNames = decksWithCard.map(d => d.name).join(', ');
            const message = getTranslation('modalRemoveFromDecks', activeLang, { 'DECK_NAMES': deckNames });
            
            showDeleteConfirmModal(
                message,
                activeLang,
                deleteCardFromEverywhere,
                deleteCardFromCollectionOnly
            );
        } else {
            showModal('modalRemoveCard', true, 
                deleteCardFromCollectionOnly,
                null,
                {},
                activeLang
            );
        }
    } catch (error) {
        console.error("Error deleting card:", error);
        onError('Error deleting card');
    }
}

/**
 * Create a delete card handler with the required parameters
 * @param {string} userId - User ID
 * @param {string} appId - App ID
 * @param {Array} decks - Array of user decks
 * @param {Array} searchResults - Current search results
 * @param {Function} onSuccess - Callback for successful deletion
 * @param {Function} onError - Callback for errors
 * @param {string} activeLang - Current language
 * @returns {Function} Delete handler function
 */
export function createDeleteCardHandler(userId, appId, decks, searchResults, onSuccess, onError, activeLang = 'ita') {
    return (uniqueId) => {
        handleDeleteCard(uniqueId, userId, appId, decks, searchResults, onSuccess, onError, activeLang);
    };
}