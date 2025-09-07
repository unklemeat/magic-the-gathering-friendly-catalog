import { getTranslation } from './modules/translations.js';
import { 
  fetchSets, 
  fetchAllPrintsByOracleId, 
  fetchSetCards,
  capitalizeWords 
} from './modules/scryfallApi.js';
import {
  initializeFirebase,
  authenticateUser,
  setupDecksListener,
  addDeck as firebaseAddDeck,
  updateDeck as firebaseUpdateDeck,
  addCardToDeck as firebaseAddCardToDeck,
  removeCardFromDeck as firebaseRemoveCardFromDeck,
  importDecks as firebaseImportDecks
} from './modules/firebase.js';
import {
  updateUI,
  updateApiStatus,
  showSearchResultsModal,
  showCardDetailsModal,
  showModal,
  renderDecksList,
  enterDeckEditor,
  renderDeckCards,
  renderCollectionCards
} from './modules/ui.js';
import {
  findCardAndHandleResults,
  populateSetSelect,
  handleSearchWithUI,
  setupVoiceSearch,
  clearAllFilters,
  validateSearchInput
} from './modules/searchFilter.js';
import {
  addCardToCollection as collectionAddCardToCollection,
  fetchAndRenderCollectionPage as collectionFetchAndRenderCollectionPage,
  calculateAndDisplayTotalValue as collectionCalculateAndDisplayTotalValue
} from './modules/collectionManagement.js';
import * as state from './modules/state.js';


const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase
const firebaseInstances = initializeFirebase();
if (firebaseInstances) {
    const { app, db: firebaseDb, auth: firebaseAuth } = firebaseInstances;
    state.setDb(firebaseDb);
    state.setAuth(firebaseAuth);
    
    // Set up authentication
    authenticateUser(async (user) => {
        if (user) {
            state.setUserId(user.uid);
            console.log("User authenticated:", state.userId);
            
            // Set up real-time listener for decks
            setupDecksListener(state.userId, (decksData) => {
                state.setDecks(decksData);
                console.log("Decks loaded:", state.decks);
                const activeButton = document.querySelector('.tab-button.active');
                if (!activeButton) return;
                const currentTab = activeButton.dataset.tab;
                
                if (currentTab === 'decks-tab') {
                    const deckEditor = document.getElementById('deck-editor');
                    if (!deckEditor.classList.contains('hidden') && state.currentDeckId) {
                        const updatedDeck = state.decks.find(d => d.id === state.currentDeckId);
                        if (updatedDeck) {
                            state.setCurrentDeck(updatedDeck);
                            renderDeckCards(state.currentDeck, state.activeLang, async (cardId) => {
                                await firebaseRemoveCardFromDeck(state.userId, state.currentDeckId, cardId, state.currentDeck.cards || []);
                            });
                        } else {
                            document.getElementById('decks-list').classList.remove('hidden');
                            deckEditor.classList.add('hidden');
                            renderDecksList(state.decks, (deckId) => enterDeckEditor(deckId), 
                                (deckId) => showModalLocal('modalRemoveCard', true, async () => {
                                    const deckDocRef = doc(state.db, `artifacts/${appId}/users/${state.userId}/decks`, deckId);
                                    await deleteDoc(deckDocRef);
                                }), state.activeLang);
                        }
                    } else {
                        renderDecksList(state.decks, (deckId) => enterDeckEditor(deckId), 
                            (deckId) => showModalLocal('modalRemoveCard', true, async () => {
                                const deckDocRef = doc(state.db, `artifacts/${appId}/users/${state.userId}/decks`, deckId);
                                await deleteDoc(deckDocRef);
                            }), state.activeLang);
                    }
                }
            });

            // Esegui il fetch della prima pagina della collezione e calcola i totali
            fetchAndRenderCollectionPageLocal('first');
            calculateAndDisplayTotalValueLocal();
            
        } else {
            console.log("No user authenticated.");
            state.setUserId(null);
        }
    });

} else {
    // Se la configurazione manca, mostra un messaggio di errore chiaro
    document.body.innerHTML = `<div class="p-8 text-center bg-red-100 text-red-800">
        <h1 class="text-2xl font-bold">Errore di Configurazione</h1>
        <p class="mt-2">Configurazione di Firebase non trovata.</p>
        <p>Se stai eseguendo questo file localmente, apri il file HTML e inserisci i dati del tuo progetto Firebase nella variabile <strong>localFirebaseConfig</strong>.</p>
    </div>`;
    console.error("Configurazione Firebase mancante! Inseriscila in 'localFirebaseConfig' per l'esecuzione locale.");
}

// Table sorting variables
let currentSort = { column: null, direction: 'asc' };

// API status variable
let apiStatus = 'connecting';


// Function to update the visual API status
function updateApiStatusLocal(status, messageKey) {
    updateApiStatus(status, messageKey, state.activeLang);
}

// Fetch all sets from Scryfall on app startup
async function loadSets() {
  updateApiStatusLocal('connecting', 'apiStatusConnecting');
  try {
    const sets = await fetchSets();
    state.setAllSets(sets);
    if (state.allSets.length > 0) {
      updateApiStatusLocal('ready', 'apiStatusReady');
      populateSetSelectLocal();
    } else {
      updateApiStatusLocal('error', 'apiStatusError');
    }
  } catch (error) {
    console.error("Sets loading error:", error);
    updateApiStatusLocal('error', 'apiStatusError');
  }
}

// Populate the set selector
function populateSetSelectLocal() {
  populateSetSelect(state.allSets, state.activeLang);
}

// Function to fetch and render cards for a specific set
async function fetchAndRenderSetCards(setCode) {
    const cardsContainer = document.getElementById('setCardsContainer');
    cardsContainer.innerHTML = '';
    
    document.getElementById("progress").classList.remove('hidden');
    let totalCardsFetched = 0;
    
    try {
        const cards = await fetchSetCards(setCode);
        totalCardsFetched = cards.length;
        document.getElementById("progressText").textContent = `${getTranslation('processing', state.activeLang)} ${totalCardsFetched} carte...`;

        cards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card-tile p-2 bg-gray-100 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer';
                
                const imageUrl = card.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';
                const cardName = state.activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
                
                cardElement.innerHTML = `
                    <img src="${imageUrl}" alt="${cardName}" class="w-full rounded-lg mb-2">
                    <p class="text-sm text-center font-semibold text-gray-800">${cardName}</p>
                `;
                cardElement.addEventListener('click', () => {
                    state.setCurrentCardDetails(card);
                    showCardDetailsModalLocal(card);
                });
                cardsContainer.appendChild(cardElement);
            });
    } catch (error) {
        console.error("Error fetching set cards:", error);
        showModalLocal('modalApiError');
    } finally {
        document.getElementById("progress").classList.add('hidden');
    }
}


function showSearchResultsModalLocal(cards) {
    showSearchResultsModal(cards, async (card) => {
        const allPrints = await fetchAllPrintsByOracleId(card.oracle_id);
        addCardToCollection({ ...card, cardPrints: allPrints });
    });
}

// Show the card details modal
function showCardDetailsModalLocal(card) {
    showCardDetailsModal(card, (card) => {
        addCardToCollection(card);
    });
}

// Show a generic modal with a custom message
function showModalLocal(messageKey, showCancel = false, onOk = null, onCancel = null, replacements = {}) {
    showModal(messageKey, showCancel, onOk, onCancel, replacements, state.activeLang);
}

// Function to add a card to the collection table
async function addCardToCollection(cardData) {
    await collectionAddCardToCollection(cardData, state.userId,
        () => {
            // Always refresh the first page to show the new card.
            fetchAndRenderCollectionPageLocal('first');
            calculateAndDisplayTotalValueLocal();
        },
        (error) => console.error("Error adding card to collection:", error)
    );
}


// Main function to fetch and render a page of the collection
async function fetchAndRenderCollectionPageLocal(direction = 'first') {
    if (!state.db) return;
    
    // Read search term from DOM (this replaces the buildLocalCollectionQuery functionality)
    const searchTerm = document.getElementById('collectionFilterInput').value.trim();
    
    const paginationState = {
        currentPage: state.currentPage,
        pageFirstDocs: state.pageFirstDocs,
        lastVisible: state.lastVisible,
        firstVisible: state.firstVisible
    };
    
    const result = await collectionFetchAndRenderCollectionPage(
        direction, state.userId, state.cardsPerPage, state.pageFirstDocs, state.lastVisible, state.currentPage, 
        state.activeFilters, state.activeLang,
        (cards) => {
            state.setSearchResults(cards);
        },
        (error) => {
            console.error("Error fetching collection page:", error);
            alert("Errore nel caricare i dati. Potrebbe essere necessario creare un indice in Firestore per l'ordinamento richiesto. Controlla la console per il link per crearlo.");
        },
        appId, state.decks, state.searchResults, searchTerm, state.currentSort.column, state.currentSort.direction
    );
    
    if (result) {
        state.setCurrentPage(result.currentPage);
        state.setPageFirstDocs(result.pageFirstDocs);
        state.setLastVisible(result.lastVisible);
        state.setFirstVisible(result.firstVisible);
    }
}


async function calculateAndDisplayTotalValueLocal() {
    if (!state.db || !state.userId) return;
    
    await collectionCalculateAndDisplayTotalValue(state.userId, appId, state.activeLang,
        () => {
            // Success callback - value calculation completed
        },
        (error) => {
            console.error("Error calculating total value:", error);
        }
    );
}


// Handle voice search
const voiceSearchBtn = document.getElementById('voiceSearchBtn');
const cardNameInput = document.getElementById('cardNameInput');
const micIcon = document.getElementById('mic-icon');
const micUnsupportedIcon = document.getElementById('mic-unsupported-icon');

const startVoiceSearch = setupVoiceSearch(
    // onVoiceResult callback
    (transcript) => {
        if (transcript) {
            cardNameInput.value = capitalizeWords(transcript);
        } else {
            cardNameInput.value = ''; // Clear input if no result
        }
        document.getElementById('searchCardBtn').click();
    },
    // onVoiceError callback
    (errorKey) => {
        showModalLocal(errorKey);
    }
);

if (startVoiceSearch) {
    // Voice search is supported
    let isListening = false;
    
    voiceSearchBtn.addEventListener('click', () => {
        if (isListening) {
            // Stop listening (we'd need to add this functionality to setupVoiceSearch)
            isListening = false;
            micIcon.classList.remove('text-green-500', 'mic-listening');
        } else {
            startVoiceSearch();
            isListening = true;
            micIcon.classList.add('text-green-500', 'mic-listening');
        }
    });
} else {
    // Voice search not supported
    if (voiceSearchBtn) {
        voiceSearchBtn.disabled = true;
    }
    if (micUnsupportedIcon) {
        micUnsupportedIcon.classList.remove('hidden');
    }
    console.warn("Your browser does not support the Web Speech API.");
}

// Logic for tabs
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
        // Remove active styles from all buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active', 'text-purple-700', 'border-purple-500');
            btn.classList.add('text-gray-500', 'border-transparent');
        });
        
        // Hide all content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

        // Add active styles to the clicked button
        const clickedButton = e.target;
        clickedButton.classList.add('active');
        clickedButton.classList.remove('text-gray-500', 'border-transparent');
        clickedButton.classList.add('text-purple-700', 'border-purple-500');

        // Show corresponding content
        const tabId = clickedButton.dataset.tab;
        document.getElementById(tabId).classList.remove('hidden');
        
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            if (tabId === 'search-tab') {
                resultsSection.classList.remove('hidden');
                fetchAndRenderCollectionPageLocal('first');
            } else {
                resultsSection.classList.add('hidden');
            }
        }
        
        if (tabId === 'explore-tab' && state.allSets.length > 0) {
            const setSelect = document.getElementById('setSelect');
            if (setSelect.value) {
                fetchAndRenderSetCards(setSelect.value);
            }
        }

        if (tabId === 'decks-tab') {
            renderDecksList();
        }
    });
});

// Event listener for the set select dropdown
document.getElementById('setSelect').addEventListener('change', (e) => {
    fetchAndRenderSetCards(e.target.value);
});


// Event listener for the API status button
document.getElementById('statusBtn').addEventListener('click', () => {
    let messageKey = '';
    if (apiStatus === 'ready') {
        messageKey = 'modalApiOk';
    } else if (apiStatus === 'error') {
        messageKey = 'modalApiError';
    } else {
        messageKey = 'modalApiConnecting';
    }
    showModal(messageKey);
});

// Event listener for the search button
document.getElementById('cardNameInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('searchCardBtn').click();
    }
});

async function handleSearch() {
    const cardNameInput = document.getElementById('cardNameInput');
    const cardName = cardNameInput.value;
    
    // Validate input using the proper validation function
    const validation = validateSearchInput(cardName);
    if (!validation.isValid) {
        showModalLocal(validation.message);
        return;
    }
    
    await handleSearchWithUI(
        cardName,
        state.activeLang,
        // onSearchStart callback
        (cardName) => {
            const searchCardBtn = document.getElementById('searchCardBtn');
            const progress = document.getElementById("progress");
            const progressText = document.getElementById("progressText");
            
            // Disable the button and show progress
            searchCardBtn.disabled = true;
            searchCardBtn.textContent = getTranslation('searchAddBtn-loading', state.activeLang);
            if (progress) progress.classList.remove('hidden');
            if (progressText) progressText.textContent = `${getTranslation('processing', state.activeLang)} "${cardName}"...`;
        },
        // onSearchComplete callback
        () => {
            const searchCardBtn = document.getElementById('searchCardBtn');
            const progress = document.getElementById("progress");
            
            // Re-enable the button and hide progress
            searchCardBtn.disabled = false;
            searchCardBtn.textContent = getTranslation('searchAddBtn-completed', state.activeLang);
            if (progress) progress.classList.add('hidden');
            
            // Clear input
            cardNameInput.value = '';
        },
        // onCardFound callback
        (card) => addCardToCollection(card),
        // onMultipleCardsFound callback
        (cards) => showSearchResultsModalLocal(cards),
        // onCardNotFound callback
        (cardName) => showModalLocal('modalNotFound', false, null, null, { ': ': `: "${cardName}"` }),
        // onError callback
        (errorKey) => showModalLocal(errorKey)
    );
}

document.getElementById('searchCardBtn').addEventListener('click', handleSearch);

document.getElementById('closeSelectionModalBtn').addEventListener('click', () => {
    document.getElementById('cardSelectionModal').classList.add('hidden');
});

// Event listener for CSV file upload
document.getElementById('processCsv').addEventListener('click', async () => {
    const file = document.getElementById('csvFile').files[0];
    const processCsvBtn = document.getElementById('processCsv');
    if (!file) {
        showModal('modalNoCardName');
        return;
    }

    processCsvBtn.disabled = true;
    processCsvBtn.textContent = getTranslation('processCsvBtn-loading', state.activeLang);
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        const progress = document.getElementById("progress");
        const progressText = document.getElementById("progressText");
        if (progress) progress.classList.remove('hidden');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const [name, set] = line.split(';').map(s => s.trim());
            
            if (name) {
                if (progressText) progressText.textContent = `${getTranslation('processing', state.activeLang)} ${i + 1}/${lines.length}: "${name}"...`;
                
                // Use findCardAndHandleResults directly with callbacks for CSV processing
                await findCardAndHandleResults(name, state.activeLang, 
                    (card) => {
                        // Single card found - add it directly
                        addCardToCollection(card);
                    },
                    (cards) => {
                        // Multiple cards found - take the first one for CSV processing
                        if (cards && cards.length > 0) {
                            addCardToCollection(cards[0]);
                        }
                    },
                    (cardName) => {
                        // Card not found - just log and continue
                        console.log(`Card not found during CSV processing: ${cardName}`);
                    }
                );
            }
        }
        if (progress) progress.classList.add('hidden');
        fetchAndRenderCollectionPageLocal('first');
        showModal('modalCsvComplete');
        processCsvBtn.disabled = false;
        processCsvBtn.textContent = getTranslation('processCsvBtn-completed', state.activeLang);
    };
    reader.readAsText(file);
});

// Event listener for JSON save button
document.getElementById('saveJsonBtn').addEventListener('click', () => {
    if (state.searchResults.length === 0) {
        showModal('modalNoCardsToSave');
        return;
    }

    const exportData = state.searchResults.map(r => r.result);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mtg_collection_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal('modalJsonSaved');
});

// Event listener for JSON load button
document.getElementById('loadJsonFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const progress = document.getElementById("progress");
        const progressText = document.getElementById("progressText");
        if (progress) progress.classList.remove('hidden');
        if (progressText) progressText.textContent = getTranslation('processing', state.activeLang);
        try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) {
                const collectionRef = collection(state.db, `artifacts/${appId}/users/${state.userId}/collection`);

                // 1. Fetch all existing documents to delete them reliably
                if (progressText) progressText.textContent = "Cancellazione della collezione esistente...";
                const existingDocsSnapshot = await getDocs(collectionRef);
                const deletePromises = existingDocsSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
                
                // 2. Wait for all deletions to complete
                await Promise.all(deletePromises);
                console.log("Existing collection cleared.");

                // 3. Add new cards from JSON
                if (progressText) progressText.textContent = "Aggiunta delle nuove carte...";
                const addPromises = data.map(cardData => {
                    const cardToSave = { ...cardData };
                    delete cardToSave.cardPrints;
                    return addDoc(collectionRef, cardToSave);
                });

                // 4. Wait for all additions to complete
                await Promise.all(addPromises);
                console.log("New cards added from JSON.");

                showModal('modalCardsLoaded', false, null, null, { 'CARD_COUNT': data.length });
                fetchAndRenderCollectionPageLocal('first');
                calculateAndDisplayTotalValueLocal();
            } else {
                showModal('modalInvalidJson');
            }
        } catch (error) {
            console.error("Errore nel parsing o nel caricamento del JSON:", error);
            showModal('modalJsonLoadError');
        } finally {
            if (progress) progress.classList.add('hidden');
        }
    };
    reader.readAsText(file);
});

// Event listener for save decks button
document.getElementById('saveDecksBtn').addEventListener('click', () => {
    if (state.decks.length === 0) {
        showModal('modalNoDecksToSave');
        return;
    }

    const jsonString = JSON.stringify(state.decks, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mtg_decks_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal('modalDecksSaved');
});

// Event listener for load decks button
document.getElementById('loadDecksFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const progress = document.getElementById("progress");
        const progressText = document.getElementById("progressText");
        if (progress) progress.classList.remove('hidden');
        if (progressText) progressText.textContent = getTranslation('processing', state.activeLang);
        try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) { 
                if (progressText) progressText.textContent = "Importazione dei mazzi...";
                
                const success = await firebaseImportDecks(state.userId, data);
                if (success) {
                    console.log("New decks added from JSON.");
                    showModal('modalDecksLoaded', false, null, null, { 'DECK_COUNT': data.length });
                } else {
                    showModal('modalJsonLoadError');
                }
            } else {
                showModal('modalInvalidDecksJson');
            }
        } catch (error) {
            console.error("Errore nel parsing o nel caricamento del JSON dei mazzi:", error);
            showModal('modalJsonLoadError');
        } finally {
            if (progress) progress.classList.add('hidden');
        }
    };
    reader.readAsText(file);
});


// Event listeners for table sorting
document.querySelectorAll('#resultsTable .sortable').forEach(header => {
  header.addEventListener('click', () => {
    document.getElementById('collectionFilterInput').value = ''; // Reset search
    const column = header.dataset.sort;
    let direction = 'asc';

    // If it's the same column, reverse the direction
    if (state.currentSort.column === column) {
      direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    // Reset all sort icons
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.className = 'sort-icon';
    });

    // Update the icon for the clicked header
    const icon = header.querySelector('.sort-icon');
    icon.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');

    state.setCurrentSort({ column, direction });
    fetchAndRenderCollectionPageLocal('first');
  });
});

// Event listeners for color filters
document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const selectedColor = e.target.dataset.color;
        
        if (selectedColor === 'all' && e.target.checked) {
            // Use clearAllFilters function
            const newFilters = clearAllFilters((defaultFilters) => {
                // Update DOM to reflect all filters are checked
                document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(c => {
                    c.checked = true;
                    c.closest('label').classList.add('checked');
                });
            });
            state.setActiveFilters(newFilters);
        } else if (selectedColor === 'all' && !e.target.checked) {
            // Clear all filters
            document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(c => {
                c.checked = false;
                c.closest('label').classList.remove('checked');
            });
            state.setActiveFilters([]);
        } else {
            document.getElementById('filter-all').checked = false;
            document.getElementById('filter-all').closest('label').classList.remove('checked');
            
            e.target.closest('label').classList.toggle('checked', e.target.checked);
            
            const newFilters = Array.from(document.querySelectorAll('.color-filter-label input:checked')).map(c => c.dataset.color);
            state.setActiveFilters(newFilters);

            // If no filters are active, re-select "all"
            if (state.activeFilters.length === 0) {
                document.getElementById('filter-all').checked = true;
                document.getElementById('filter-all').closest('label').classList.add('checked');
                state.activeFilters.push('all');
            }
        }
        
        // When filtering, re-fetch the current page with new filters
        fetchAndRenderCollectionPageLocal('current');
    });
});

// Event listener for language select dropdown
document.getElementById('lang-select').addEventListener('change', (e) => {
    state.setActiveLang(e.target.value);
    updateUI(state.activeLang);
});

document.getElementById('closeDetailsModalBtn').addEventListener('click', () => {
    document.getElementById('cardDetailsModal').classList.add('hidden');
});

// Deck Builder Logic
async function addDeck(name) {
    await firebaseAddDeck(state.userId, name);
}

async function updateDeck(deckId, data) {
    await firebaseUpdateDeck(state.userId, deckId, data);
}


async function enterDeckEditor(deckId) {
    state.setCurrentDeckId(deckId);
    state.setCurrentDeck(state.decks.find(d => d.id === deckId));
    if (!state.currentDeck) {
        return;
    }
    document.getElementById('decks-list').classList.add('hidden');
    document.getElementById('deck-editor').classList.remove('hidden');
    
    const deckEditorNameInput = document.getElementById('deck-editor-name-input');
    deckEditorNameInput.value = state.currentDeck.name;
    deckEditorNameInput.addEventListener('change', async (e) => {
        await updateDeck(state.currentDeckId, { name: e.target.value });
    });

    renderDeckCards(state.currentDeck, state.activeLang, async (cardId) => {
        await firebaseRemoveCardFromDeck(state.userId, state.currentDeckId, cardId, state.currentDeck.cards || []);
    });
    
    // For renderCollectionCards, we need to get the collection data first
    const collectionSearchInput = document.getElementById('collectionSearchInput');
    const searchTerm = collectionSearchInput.value.toLowerCase();
    const collectionSnapshot = await getDocs(query(collection(state.db, `artifacts/${appId}/users/${state.userId}/collection`), orderBy('name')));
    const fullCollection = collectionSnapshot.docs.map(d => ({id: d.id, result: d.data()}));
    const filteredCollection = fullCollection.filter(card => {
        const cardName = card.result.printed_name || card.result.name;
        return cardName.toLowerCase().includes(searchTerm);
    });
    
    renderCollectionCards(filteredCollection, searchTerm, state.activeLang, async (cardData) => {
        await firebaseAddCardToDeck(state.userId, state.currentDeckId, cardData, state.currentDeck.cards || []);
    });
}


// Event listeners for Deck builder
document.getElementById('createDeckBtn').addEventListener('click', async () => {
    const deckNameInput = document.getElementById('newDeckNameInput');
    const deckName = deckNameInput.value.trim();
    if (deckName) {
        await addDeck(deckName);
        deckNameInput.value = '';
    }
});

document.getElementById('backToDecksBtn').addEventListener('click', () => {
    state.setCurrentDeck(null);
    state.setCurrentDeckId(null);
    document.getElementById('decks-list').classList.remove('hidden');
    document.getElementById('deck-editor').classList.add('hidden');
    renderDecksList(state.decks, (deckId) => enterDeckEditor(deckId), 
        (deckId) => showModalLocal('modalRemoveCard', true, async () => {
            const deckDocRef = doc(state.db, `artifacts/${appId}/users/${state.userId}/decks`, deckId);
            await deleteDoc(deckDocRef);
        }), state.activeLang); // Rerender the list to show the updated card counts
});

document.getElementById('collectionSearchInput').addEventListener('input', async () => {
    // Re-render collection cards with new search term
    const collectionSearchInput = document.getElementById('collectionSearchInput');
    const searchTerm = collectionSearchInput.value.toLowerCase();
    const collectionSnapshot = await getDocs(query(collection(state.db, `artifacts/${appId}/users/${state.userId}/collection`), orderBy('name')));
    const fullCollection = collectionSnapshot.docs.map(d => ({id: d.id, result: d.data()}));
    const filteredCollection = fullCollection.filter(card => {
        const cardName = card.result.printed_name || card.result.name;
        return cardName.toLowerCase().includes(searchTerm);
    });
    
    renderCollectionCards(filteredCollection, searchTerm, state.activeLang, async (cardData) => {
        await firebaseAddCardToDeck(state.userId, state.currentDeckId, cardData, state.currentDeck.cards || []);
    });
});

// Pagination event listeners
document.getElementById('nextPageBtn').addEventListener('click', () => fetchAndRenderCollectionPageLocal('next'));
document.getElementById('prevPageBtn').addEventListener('click', () => fetchAndRenderCollectionPageLocal('prev'));
document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
    state.setCardsPerPage(parseInt(e.target.value, 10));
    fetchAndRenderCollectionPageLocal('first');
});

// Collection filter event listener
document.getElementById('collectionSearchBtn').addEventListener('click', () => {
    fetchAndRenderCollectionPageLocal('first');
});

document.getElementById('collectionFilterInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('collectionSearchBtn').click();
    }
});

document.getElementById('collectionResetBtn').addEventListener('click', () => {
    document.getElementById('collectionFilterInput').value = '';
    fetchAndRenderCollectionPageLocal('first');
});


// Tab switching logic
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
        // Remove active styles from all buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active', 'text-purple-700', 'border-purple-500');
            btn.classList.add('text-gray-500', 'border-transparent');
        });
        
        // Hide all content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

        // Add active styles to the clicked button
        const clickedButton = e.target;
        clickedButton.classList.add('active');
        clickedButton.classList.remove('text-gray-500', 'border-transparent');
        clickedButton.classList.add('text-purple-700', 'border-purple-500');

        // Show corresponding content
        const tabId = clickedButton.dataset.tab;
        document.getElementById(tabId).classList.remove('hidden');
        
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            if (tabId === 'search-tab') {
                resultsSection.classList.remove('hidden');
                fetchAndRenderCollectionPageLocal('first');
            } else {
                resultsSection.classList.add('hidden');
            }
        }
        
        if (tabId === 'explore-tab' && state.allSets.length > 0) {
            const setSelect = document.getElementById('setSelect');
            if (setSelect.value) {
                fetchAndRenderSetCards(setSelect.value);
            }
        }

        if (tabId === 'decks-tab') {
            renderDecksList();
        }
    });
});

window.onload = () => {
  loadSets();
  updateUI(state.activeLang);
};
