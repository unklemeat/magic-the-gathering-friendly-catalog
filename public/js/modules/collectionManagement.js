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
  removeCardFromAllDecksByOracleId as firebaseRemoveCardFromAllDecksByOracleId
} from './firebase.js';
import { fetchCardById } from './scryfallApi.js';
import { 
  renderTable,
  updatePaginationUI,
  calculateAndDisplayTotalValue as uiCalculateAndDisplayTotalValue,
  toggleProgress,
  showModal,
  showDeleteConfirmModal,
  showCardDetailsModal
} from './ui.js';
import { 
  getSortableField,
  sortCards
} from './searchFilter.js';

/**
 * Add a card to the collection
 * @param {Object} cardData - Card data to add
 * @param {string} userId - User ID
 * @param {string} collectionId - The ID of the collection
 * @param {Function} onSuccess - Callback for successful addition
 * @param {Function} onError - Callback for errors
 */
export async function addCardToCollection(cardData, userId, collectionId, onSuccess, onError) {
    try {
        const success = await firebaseAddCardToCollection(userId, collectionId, cardData);
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
 * @param {string} collectionId - The ID of the collection
 * @param {Function} onSuccess - Callback for successful deletion
 * @param {Function} onError - Callback for errors
 */
export async function deleteCardFromCollection(cardId, userId, collectionId, onSuccess, onError) {
    try {
        await removeCardFromCollection(userId, collectionId, cardId);
        onSuccess();
    } catch (error) {
        console.error("Error deleting card from collection:", error);
        onError('Error deleting card from collection');
    }
}

/**
 * Fetch and render a page of the collection.
 * Now handles client-side searching for better flexibility.
 */
export async function fetchAndRenderCollectionPage(direction, userId, collectionId, cardsPerPage, pageFirstDocs, lastVisible, currentPage, activeFilters, activeLang, onSuccess, onError, appId = null, decks = [], searchResults = [], searchTerm = '', sortColumn = null, sortDirection = 'asc') {
    toggleProgress(true);

    try {
        // --- NUOVA LOGICA DI RICERCA CLIENT-SIDE ---
        if (searchTerm) {
            const allCards = await getAllCollectionCards(userId, collectionId);
            
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            let filteredCards = allCards.filter(card => {
                const englishName = card.result.name.toLowerCase();
                const italianName = card.result.printed_name ? card.result.printed_name.toLowerCase() : '';
                return englishName.includes(lowerCaseSearchTerm) || italianName.includes(lowerCaseSearchTerm);
            });

            const sortField = getSortableField(sortColumn);
            filteredCards = sortCards(filteredCards, sortField, sortDirection);

            let newCurrentPage = currentPage;
            if (direction === 'next') {
                newCurrentPage++;
            } else if (direction === 'prev' && newCurrentPage > 1) {
                newCurrentPage--;
            } else if (direction === 'first') {
                newCurrentPage = 1;
            }

            const startIndex = (newCurrentPage - 1) * cardsPerPage;
            const endIndex = startIndex + cardsPerPage;
            const paginatedCards = filteredCards.slice(startIndex, endIndex);

            const deleteHandler = createDeleteCardHandler(userId, collectionId, appId, decks, allCards, 
                () => {
                    fetchAndRenderCollectionPage('first', userId, collectionId, cardsPerPage, [], null, 1, activeFilters, activeLang, onSuccess, onError, appId, decks, [], searchTerm, sortColumn, sortDirection);
                },
                onError,
                activeLang
            );

            renderTable(paginatedCards, activeFilters, activeLang, 
                (e, uniqueId) => handleSetChange(e, uniqueId, userId, collectionId, 
                    (updatedCard) => {
                        const resultIndex = paginatedCards.findIndex(r => r.id === uniqueId);
                        if (resultIndex > -1) paginatedCards[resultIndex].result = updatedCard;
                        calculateAndDisplayTotalValue(userId, collectionId, appId, activeLang, () => {}, () => {});
                    },
                    (error) => console.error("Error updating card set:", error)
                ),
                deleteHandler,
                newCurrentPage, cardsPerPage
            );

            const hasMore = endIndex < filteredCards.length;
            updatePaginationUI(paginatedCards.length, newCurrentPage, activeLang, hasMore);
            
            onSuccess(paginatedCards);

            return {
                currentPage: newCurrentPage,
                pageFirstDocs: [],
                lastVisible: null,
                firstVisible: null,
            };

        } else {
            // --- Logica originale per la paginazione server-side ---
            const pageData = await fetchCollectionPage(userId, collectionId, direction, cardsPerPage, pageFirstDocs, lastVisible, '', sortColumn, sortDirection);
        
            let newCurrentPage = currentPage;
            let newPageFirstDocs = [...pageFirstDocs];
            
            if (pageData.cards.length > 0) {
                if (direction === 'next') {
                    newCurrentPage++;
                    if(pageData.firstVisible) newPageFirstDocs.push(pageData.firstVisible);
                } else if (direction === 'prev' && newCurrentPage > 1) {
                    newCurrentPage--;
                    newPageFirstDocs.pop();
                } else if (direction === 'first') {
                    newCurrentPage = 1;
                    newPageFirstDocs = [null];
                }
            }
            
            const deleteHandler = createDeleteCardHandler(
                userId, collectionId, appId, decks, pageData.cards, 
                () => {
                    fetchAndRenderCollectionPage('current', userId, collectionId, cardsPerPage, newPageFirstDocs, pageData.lastVisible, newCurrentPage, activeFilters, activeLang, onSuccess, onError, appId, decks, searchResults);
                },
                onError,
                activeLang
            );
            
            renderTable(pageData.cards, activeFilters, activeLang, 
                (e, uniqueId) => handleSetChange(e, uniqueId, userId, collectionId, 
                    (updatedCard) => {
                        const resultIndex = pageData.cards.findIndex(r => r.id === uniqueId);
                        if (resultIndex > -1) pageData.cards[resultIndex].result = updatedCard;
                        calculateAndDisplayTotalValue(userId, collectionId, appId, activeLang, () => {}, () => {});
                    },
                    (error) => console.error("Error updating card set:", error)
                ),
                deleteHandler,
                newCurrentPage, cardsPerPage
            );
            
            updatePaginationUI(pageData.cards.length, newCurrentPage, activeLang, pageData.hasMore);
            
            onSuccess(pageData.cards);
            
            return {
                currentPage: newCurrentPage,
                pageFirstDocs: newPageFirstDocs,
                lastVisible: pageData.lastVisible,
                firstVisible: pageData.firstVisible
            };
        }
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
 * @param {string} collectionId - The ID of the collection
 * @param {string} appId - App ID
 * @param {string} activeLang - Current language
 * @param {Function} onSuccess - Callback for successful calculation
 * @param {Function} onError - Callback for errors
 */
export async function calculateAndDisplayTotalValue(userId, collectionId, appId, activeLang, onSuccess, onError) {
    try {
        const allCards = await getAllCollectionCards(userId, collectionId);
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
 * @param {string} collectionId - The ID of the collection
 * @param {Function} onSuccess - Callback for successful update
 * @param {Function} onError - Callback for errors
 */
export async function handleSetChange(e, uniqueId, userId, collectionId, onSuccess, onError) {
    try {
        const selectedPrintId = e.target.value;
        const parentRow = e.target.closest('tr'); // Ottieni la riga della tabella
        
        const printDataResponse = await fetchCardById(selectedPrintId);
        if (printDataResponse && printDataResponse.object === 'card') {
            const printToSave = { ...printDataResponse };
            delete printToSave.cardPrints;
            
            await updateCardInCollection(userId, collectionId, uniqueId, printToSave);
            
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
                    detailsBtn.onclick = () => showCardDetailsModal(printToSave, () => {}, false);
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
 * @param {string} collectionId - The ID of the collection
 * @param {string} appId - App ID
 * @param {Array} decks - Array of user decks
 * @param {Array} searchResults - Current search results
 * @param {Function} onSuccess - Callback for successful deletion
 * @param {Function} onError - Callback for errors
 * @param {string} activeLang - Current language
 */
export async function handleDeleteCard(uniqueId, userId, collectionId, appId, decks, searchResults, onSuccess, onError, activeLang = 'ita') {
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
            await removeCardFromCollection(userId, collectionId, uniqueId);
            onSuccess();
        };
        
        const deleteCardFromEverywhere = async () => {
            await removeCardFromCollection(userId, collectionId, uniqueId);
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
 * @param {string} collectionId - The ID of the collection
 * @param {string} appId - App ID
 * @param {Array} decks - Array of user decks
 * @param {Array} searchResults - Current search results
 * @param {Function} onSuccess - Callback for successful deletion
 * @param {Function} onError - Callback for errors
 * @param {string} activeLang - Current language
 * @returns {Function} Delete handler function
 */
export function createDeleteCardHandler(userId, collectionId, appId, decks, searchResults, onSuccess, onError, activeLang = 'ita') {
    return (uniqueId) => {
        handleDeleteCard(uniqueId, userId, collectionId, appId, decks, searchResults, onSuccess, onError, activeLang);
    };
}