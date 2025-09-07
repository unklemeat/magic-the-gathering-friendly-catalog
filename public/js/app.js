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
  importDecks as firebaseImportDecks,
  getDocs,
  query,
  collection,
  orderBy,
  doc,
  deleteDoc,
  addDoc
} from './modules/firebase.js';
import {
  updateUI,
  updateApiStatus,
  showSearchResultsModal,
  showCardDetailsModal,
  showModal,
  renderDecksList,
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
import { setupEventListeners } from './modules/events.js';
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


// =================================================================================================
// --- MODAL & UI WRAPPERS ---
// =================================================================================================

// Function to update the visual API status
function updateApiStatusLocal(status, messageKey) {
    updateApiStatus(status, messageKey, state.activeLang);
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


// =================================================================================================
// --- DATA FETCHING & RENDERING WRAPPERS ---
// =================================================================================================

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
        appId, state.decks, state.searchResults, state.currentSort.column, state.currentSort.direction
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


// =================================================================================================
// --- HIGH-LEVEL LOGIC / USER ACTIONS ---
// =================================================================================================

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


// =================================================================================================
// --- EVENT HANDLERS ---
// =================================================================================================
// Event handlers object for the events module
const eventHandlers = {
    onTabChange: (tabId) => {
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
            renderDecksList(state.decks, (deckId) => enterDeckEditor(deckId), 
                (deckId) => showModalLocal('modalRemoveCard', true, async () => {
                    const deckDocRef = doc(state.db, `artifacts/${appId}/users/${state.userId}/decks`, deckId);
                    await deleteDoc(deckDocRef);
                }), state.activeLang);
        }
    },

    onSetChange: (setCode) => {
        fetchAndRenderSetCards(setCode);
    },

    onStatusClick: () => {
        let messageKey = '';
        if (state.apiStatus === 'ready') {
            messageKey = 'modalApiOk';
        } else if (state.apiStatus === 'error') {
            messageKey = 'modalApiError';
        } else {
            messageKey = 'modalApiConnecting';
        }
        showModal(messageKey, false, null, null, {}, state.activeLang);
    },

    onSearch: () => {
        handleSearch();
    },

    onProcessCsv: async () => {
        const file = document.getElementById('csvFile').files[0];
        const processCsvBtn = document.getElementById('processCsv');
        if (!file) {
            showModal('modalNoCardName', false, null, null, {}, state.activeLang);
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
                    
                    await findCardAndHandleResults(name, state.activeLang, 
                        (card) => {
                            addCardToCollection(card);
                        },
                        (cards) => {
                            if (cards && cards.length > 0) {
                                addCardToCollection(cards[0]);
                            }
                        },
                        (cardName) => {
                            console.log(`Card not found during CSV processing: ${cardName}`);
                        }
                    );
                }
            }
            if (progress) progress.classList.add('hidden');
            fetchAndRenderCollectionPageLocal('first');
            showModal('modalCsvComplete', false, null, null, {}, state.activeLang);
            processCsvBtn.disabled = false;
            processCsvBtn.textContent = getTranslation('processCsvBtn-completed', state.activeLang);
        };
        reader.readAsText(file);
    },

    onSaveJson: () => {
        if (state.searchResults.length === 0) {
            showModal('modalNoCardsToSave', false, null, null, {}, state.activeLang);
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
        showModal('modalJsonSaved', false, null, null, {}, state.activeLang);
    },

    onLoadJson: async (file) => {
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

                    if (progressText) progressText.textContent = "Cancellazione della collezione esistente...";
                    const existingDocsSnapshot = await getDocs(collectionRef);
                    const deletePromises = existingDocsSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
                    
                    await Promise.all(deletePromises);
                    console.log("Existing collection cleared.");

                    if (progressText) progressText.textContent = "Aggiunta delle nuove carte...";
                    const addPromises = data.map(cardData => {
                        const cardToSave = { ...cardData };
                        delete cardToSave.cardPrints;
                        return addDoc(collectionRef, cardToSave);
                    });

                    await Promise.all(addPromises);
                    console.log("New cards added from JSON.");

                    showModal('modalCardsLoaded', false, null, null, { 'CARD_COUNT': data.length }, state.activeLang);
                    fetchAndRenderCollectionPageLocal('first');
                    calculateAndDisplayTotalValueLocal();
                } else {
                    showModal('modalInvalidJson', false, null, null, {}, state.activeLang);
                }
            } catch (error) {
                console.error("Errore nel parsing o nel caricamento del JSON:", error);
                showModal('modalJsonLoadError', false, null, null, {}, state.activeLang);
            } finally {
                if (progress) progress.classList.add('hidden');
            }
        };
        reader.readAsText(file);
    },

    onSaveDecks: () => {
        if (state.decks.length === 0) {
            showModal('modalNoDecksToSave', false, null, null, {}, state.activeLang);
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
        showModal('modalDecksSaved', false, null, null, {}, state.activeLang);
    },

    onLoadDecks: async (file) => {
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
                        showModal('modalDecksLoaded', false, null, null, { 'DECK_COUNT': data.length }, state.activeLang);
                    } else {
                        showModal('modalJsonLoadError', false, null, null, {}, state.activeLang);
                    }
                } else {
                    showModal('modalInvalidDecksJson', false, null, null, {}, state.activeLang);
                }
            } catch (error) {
                console.error("Errore nel parsing o nel caricamento del JSON dei mazzi:", error);
                showModal('modalJsonLoadError', false, null, null, {}, state.activeLang);
            } finally {
                if (progress) progress.classList.add('hidden');
            }
        };
        reader.readAsText(file);
    },

    onCreateDeck: async () => {
        const deckNameInput = document.getElementById('newDeckNameInput');
        const deckName = deckNameInput.value.trim();
        if (deckName) {
            await addDeck(deckName);
            deckNameInput.value = '';
        }
    },

    onBackToDecks: () => {
        state.setCurrentDeck(null);
        state.setCurrentDeckId(null);
        document.getElementById('decks-list').classList.remove('hidden');
        document.getElementById('deck-editor').classList.add('hidden');
        renderDecksList(state.decks, (deckId) => enterDeckEditor(deckId), 
            (deckId) => showModalLocal('modalRemoveCard', true, async () => {
                const deckDocRef = doc(state.db, `artifacts/${appId}/users/${state.userId}/decks`, deckId);
                await deleteDoc(deckDocRef);
            }), state.activeLang);
    },

    onCollectionSearch: async () => {
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
    },

    onNextPage: () => fetchAndRenderCollectionPageLocal('next'),
    onPrevPage: () => fetchAndRenderCollectionPageLocal('prev'),
    
    onPageSizeChange: (newSize) => {
        state.setCardsPerPage(newSize);
        fetchAndRenderCollectionPageLocal('first');
    },

    onCollectionFilter: () => {
        fetchAndRenderCollectionPageLocal('first');
    },

    onCollectionReset: () => {
        document.getElementById('collectionFilterInput').value = '';
        fetchAndRenderCollectionPageLocal('first');
    },

    onSort: (column) => {
        document.getElementById('collectionFilterInput').value = '';
        let direction = 'asc';

        if (state.currentSort.column === column) {
            direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        }

        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.className = 'sort-icon';
        });

        const header = document.querySelector(`[data-sort="${column}"]`);
        const icon = header.querySelector('.sort-icon');
        icon.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');

        state.setCurrentSort({ column, direction });
        fetchAndRenderCollectionPageLocal('first');
    },

    onColorFilterChange: () => {
        fetchAndRenderCollectionPageLocal('current');
    },

    onLanguageChange: (newLang) => {
        state.setActiveLang(newLang);
        updateUI(state.activeLang);
    }
};

// =================================================================================================
// --- APP START ---
// =================================================================================================
window.onload = () => {
  // Initialize event listeners after DOM is ready
  setupEventListeners(eventHandlers);
  
  // Voice search setup (after DOM is ready)
  const voiceSearchBtn = document.getElementById('voiceSearchBtn');
  const cardNameInput = document.getElementById('cardNameInput');
  const micIcon = document.getElementById('mic-icon');
  const micUnsupportedIcon = document.getElementById('mic-unsupported-icon');

  const startVoiceSearch = setupVoiceSearch(
      (transcript) => {
          if (transcript) {
              cardNameInput.value = capitalizeWords(transcript);
          } else {
              cardNameInput.value = '';
          }
          document.getElementById('searchCardBtn').click();
      },
      (errorKey) => {
          showModalLocal(errorKey);
      }
  );

  if (!startVoiceSearch) {
      if (voiceSearchBtn) {
          voiceSearchBtn.disabled = true;
      }
      if (micUnsupportedIcon) {
          micUnsupportedIcon.classList.remove('hidden');
      }
      console.warn("Your browser does not support the Web Speech API.");
  }
  
  loadSets();
  updateUI(state.activeLang);
};
