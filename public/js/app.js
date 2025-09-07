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
  addCardToCollection as firebaseAddCardToCollection,
  updateCardInCollection,
  removeCardFromCollection,
  fetchCollectionPage,
  getAllCollectionCards,
  setupDecksListener,
  addDeck as firebaseAddDeck,
  updateDeck as firebaseUpdateDeck,
  deleteDeck as firebaseDeleteDeck,
  addCardToDeck as firebaseAddCardToDeck,
  removeCardFromDeck as firebaseRemoveCardFromDeck,
  removeCardFromAllDecksByOracleId,
  exportDecks as firebaseExportDecks,
  importDecks as firebaseImportDecks,
  getFirebaseInstances,
  isFirebaseInitialized
} from './modules/firebase.js';
import {
  updateUI,
  updateApiStatus,
  showSearchResultsModal,
  showCardDetailsModal,
  showModal,
  addRow,
  reindexRows,
  renderTable,
  renderDecksList,
  enterDeckEditor,
  renderDeckCards,
  renderCollectionCards,
  toggleProgress,
  updateProgressText,
  setActiveTab
} from './modules/ui.js';
import {
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
} from './modules/searchFilter.js';
import {
  addCardToCollection as collectionAddCardToCollection,
  deleteCardFromCollection,
  fetchAndRenderCollectionPage as collectionFetchAndRenderCollectionPage,
  calculateAndDisplayTotalValue as collectionCalculateAndDisplayTotalValue,
  renderCollectionCards as collectionRenderCollectionCards,
  addCardToDeck as collectionAddCardToDeck,
  removeCardFromDeck as collectionRemoveCardFromDeck,
  removeCardFromAllDecksByOracleId as collectionRemoveCardFromAllDecksByOracleId,
  handleSetChange as collectionHandleSetChange,
  handleDeleteCard as collectionHandleDeleteCard,
  processCsvFile,
  processJsonFile,
  exportCollectionToJson,
  exportDecksToJson,
  handlePagination,
  handlePageSizeChange,
  handleCollectionSearch,
  resetCollectionFilters,
  getCollectionStatistics
} from './modules/collectionManagement.js';


let allSets = [];
let searchResults = [];
let activeFilters = ['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor'];
let activeLang = 'ita';
let currentCardDetails = null;

// Firebase & Firestore setup
let db;
let auth;
let userId;
let decks = [];
let currentDeck = null;
let currentDeckId = null;

// Pagination state
let lastVisible = null;
let firstVisible = null;
let pageFirstDocs = [null]; // Start with null for the first page
let currentPage = 1;
let cardsPerPage = 50;


// --- CONFIGURAZIONE FIREBASE PER ESECUZIONE LOCALE ---
// Per eseguire questo file al di fuori di Canvas (es. aprendolo in Chrome),
// devi inserire qui la tua configurazione personale di Firebase.
// 1. Vai su https://console.firebase.google.com/ e crea un nuovo progetto.
// 2. Nelle impostazioni del progetto (icona ingranaggio), crea una "Web App".
// 3. Copia l'oggetto di configurazione (inizia con "const firebaseConfig = {") e incollalo qui sotto,
//    sostituendo l'oggetto 'localFirebaseConfig'.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase
const firebaseInstances = initializeFirebase();
if (firebaseInstances) {
    const { app, db: firebaseDb, auth: firebaseAuth } = firebaseInstances;
    db = firebaseDb;
    auth = firebaseAuth;
    
    // Set up authentication
    authenticateUser(async (user) => {
        if (user) {
            userId = user.uid;
            console.log("User authenticated:", userId);
            
            // Set up real-time listener for decks
            setupDecksListener(userId, (decksData) => {
                decks = decksData;
                console.log("Decks loaded:", decks);
                const activeButton = document.querySelector('.tab-button.active');
                if (!activeButton) return;
                const currentTab = activeButton.dataset.tab;
                
                if (currentTab === 'decks-tab') {
                    const deckEditor = document.getElementById('deck-editor');
                    if (!deckEditor.classList.contains('hidden') && currentDeckId) {
                        const updatedDeck = decks.find(d => d.id === currentDeckId);
                        if (updatedDeck) {
                            currentDeck = updatedDeck;
                            renderDeckCards(currentDeck, activeLang, async (cardId) => {
                                await firebaseRemoveCardFromDeck(userId, currentDeckId, cardId, currentDeck.cards || []);
                            });
                        } else {
                            document.getElementById('decks-list').classList.remove('hidden');
                            deckEditor.classList.add('hidden');
                            renderDecksList(decks, (deckId) => enterDeckEditor(deckId), 
                                (deckId) => showModalLocal('modalRemoveCard', true, async () => {
                                    const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deckId);
                                    await deleteDoc(deckDocRef);
                                }), activeLang);
                        }
                    } else {
                        renderDecksList(decks, (deckId) => enterDeckEditor(deckId), 
                            (deckId) => showModalLocal('modalRemoveCard', true, async () => {
                                const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deckId);
                                await deleteDoc(deckDocRef);
                            }), activeLang);
                    }
                }
            });

            // Esegui il fetch della prima pagina della collezione e calcola i totali
            fetchAndRenderCollectionPageLocal('first');
            calculateAndDisplayTotalValueLocal();
            
        } else {
            console.log("No user authenticated.");
            userId = null;
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


// Translations are now imported from the translations module


// Table sorting variables
let currentSort = { column: null, direction: 'asc' };

// API status variable
let apiStatus = 'connecting';


// Function to update the visual API status
function updateApiStatusLocal(status, messageKey) {
    updateApiStatus(status, messageKey, activeLang);
}

// Fetch all sets from Scryfall on app startup
async function loadSets() {
  updateApiStatusLocal('connecting', 'apiStatusConnecting');
  try {
    allSets = await fetchSets();
    if (allSets.length > 0) {
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
  populateSetSelect(allSets, activeLang);
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
        document.getElementById("progressText").textContent = `${getTranslation('processing', activeLang)} ${totalCardsFetched} carte...`;

        cards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card-tile p-2 bg-gray-100 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer';
                
                const imageUrl = card.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';
                const cardName = activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
                
                cardElement.innerHTML = `
                    <img src="${imageUrl}" alt="${cardName}" class="w-full rounded-lg mb-2">
                    <p class="text-sm text-center font-semibold text-gray-800">${cardName}</p>
                `;
                cardElement.addEventListener('click', () => {
                    currentCardDetails = card;
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


// New unified search function
async function findCardAndHandleResultsLocal(cardName) {
    await findCardAndHandleResults(cardName, activeLang, 
        (card) => addCardToCollection(card),
        (cards) => showSearchResultsModalLocal(cards),
        (cardName) => showModalLocal('modalNotFound', false, null, null, { ': ': `: "${cardName}"` })
    );
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
    showModal(messageKey, showCancel, onOk, onCancel, replacements, activeLang);
}

// Function to add a card to the collection table
async function addCardToCollection(cardData) {
    await collectionAddCardToCollection(cardData, userId,
        () => {
            // Always refresh the first page to show the new card.
            fetchAndRenderCollectionPageLocal('first');
            calculateAndDisplayTotalValueLocal();
        },
        (error) => console.error("Error adding card to collection:", error)
    );
}


// Helper to map sort column to firestore field name
// getSortableField is now imported from searchFilter module

// Main function to fetch and render a page of the collection
async function fetchAndRenderCollectionPageLocal(direction = 'first') {
    if (!db) return;
    
    // Read search term from DOM (this replaces the buildLocalCollectionQuery functionality)
    const searchTerm = document.getElementById('collectionFilterInput').value.trim();
    
    const paginationState = {
        currentPage,
        pageFirstDocs,
        lastVisible,
        firstVisible
    };
    
    const result = await collectionFetchAndRenderCollectionPage(
        direction, userId, cardsPerPage, pageFirstDocs, lastVisible, currentPage, 
        activeFilters, activeLang,
        (cards) => {
            searchResults = cards;
        },
        (error) => {
            console.error("Error fetching collection page:", error);
            alert("Errore nel caricare i dati. Potrebbe essere necessario creare un indice in Firestore per l'ordinamento richiesto. Controlla la console per il link per crearlo.");
        },
        appId, decks, searchResults, searchTerm
    );
    
    if (result) {
        currentPage = result.currentPage;
        pageFirstDocs = result.pageFirstDocs;
        lastVisible = result.lastVisible;
        firstVisible = result.firstVisible;
    }
}


async function calculateAndDisplayTotalValueLocal() {
    if (!db || !userId) return;
    
    await collectionCalculateAndDisplayTotalValue(userId, appId, activeLang,
        () => {
            // Success callback - value calculation completed
        },
        (error) => {
            console.error("Error calculating total value:", error);
        }
    );
}


// Handle voice search
if ('webkitSpeechRecognition' in window) {
    const voiceSearchBtn = document.getElementById('voiceSearchBtn');
    const cardNameInput = document.getElementById('cardNameInput');
    const micIcon = document.getElementById('mic-icon');
    let isListening = false;
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'it-IT';
    recognition.interimResults = false;

    voiceSearchBtn.addEventListener('click', () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        isListening = true;
        micIcon.classList.add('text-green-500', 'mic-listening');
        cardNameInput.placeholder = getTranslation('searchPlaceholder', activeLang);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
            cardNameInput.value = capitalizeWords(transcript);
        } else {
            cardNameInput.value = ''; // Clear input if no result
        }
        document.getElementById('searchCardBtn').click();
    };

    recognition.onend = () => {
        isListening = false;
        micIcon.classList.remove('text-green-500', 'mic-listening');
        cardNameInput.placeholder = getTranslation('searchPlaceholder', activeLang);
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        isListening = false;
        micIcon.classList.remove('text-green-500', 'mic-listening');
        showModal('modalSpeechError');
    };
} else {
    // If the browser doesn't support Web Speech API
    const voiceSearchBtn = document.getElementById('voiceSearchBtn');
    const micUnsupportedIcon = document.getElementById('mic-unsupported-icon');
    // Hide the mic icon and show the crossed-out icon
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
        
        if (tabId === 'explore-tab' && allSets.length > 0) {
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
    const searchCardBtn = document.getElementById('searchCardBtn');
    
    if (!cardName) {
        showModal('modalNoCardName');
        return;
    }
    
    // Disable the button and show progress
    searchCardBtn.disabled = true;
    searchCardBtn.textContent = getTranslation('searchAddBtn-loading', activeLang); // Use a loading translation
    const progress = document.getElementById("progress");
    const progressText = document.getElementById("progressText");
    if (progress) progress.classList.remove('hidden');
    if (progressText) progressText.textContent = `${getTranslation('processing', activeLang)} "${cardName}"...`;
    
        await findCardAndHandleResultsLocal(cardName);
    
    // Re-enable the button and hide progress
    searchCardBtn.disabled = false;
    searchCardBtn.textContent = getTranslation('searchAddBtn-completed', activeLang);
    if (progress) progress.classList.add('hidden');
    
    cardNameInput.value = '';
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
    processCsvBtn.textContent = getTranslation('processCsvBtn-loading', activeLang);
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
                if (progressText) progressText.textContent = `${getTranslation('processing', activeLang)} ${i + 1}/${lines.length}: "${name}"...`;
                
                // Use findCardAndHandleResults directly with callbacks for CSV processing
                await findCardAndHandleResults(name, activeLang, 
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
        processCsvBtn.textContent = getTranslation('processCsvBtn-completed', activeLang);
    };
    reader.readAsText(file);
});

// Event listener for JSON save button
document.getElementById('saveJsonBtn').addEventListener('click', () => {
    if (searchResults.length === 0) {
        showModal('modalNoCardsToSave');
        return;
    }

    const exportData = searchResults.map(r => r.result);
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
        if (progressText) progressText.textContent = getTranslation('processing', activeLang);
        try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) {
                const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/collection`);

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
    if (decks.length === 0) {
        showModal('modalNoDecksToSave');
        return;
    }

    const jsonString = JSON.stringify(decks, null, 2);
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
        if (progressText) progressText.textContent = getTranslation('processing', activeLang);
        try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) { 
                if (progressText) progressText.textContent = "Importazione dei mazzi...";
                
                const success = await firebaseImportDecks(userId, data);
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
    if (currentSort.column === column) {
      direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }

    // Reset all sort icons
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.className = 'sort-icon';
    });

    // Update the icon for the clicked header
    const icon = header.querySelector('.sort-icon');
    icon.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');

    currentSort = { column, direction };
    fetchAndRenderCollectionPageLocal('first');
  });
});

// Event listeners for color filters
document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const selectedColor = e.target.dataset.color;
        
        if (selectedColor === 'all' && e.target.checked) {
            document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(c => {
                c.checked = true;
                c.closest('label').classList.add('checked');
            });
            activeFilters = ['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor'];
        } else if (selectedColor === 'all' && !e.target.checked) {
            document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(c => {
                c.checked = false;
                c.closest('label').classList.remove('checked');
            });
            activeFilters = [];
        } else {
            document.getElementById('filter-all').checked = false;
            document.getElementById('filter-all').closest('label').classList.remove('checked');
            
            e.target.closest('label').classList.toggle('checked', e.target.checked);
            
            activeFilters = Array.from(document.querySelectorAll('.color-filter-label input:checked')).map(c => c.dataset.color);

            // If no filters are active, re-select "all"
            if (activeFilters.length === 0) {
                document.getElementById('filter-all').checked = true;
                document.getElementById('filter-all').closest('label').classList.add('checked');
                activeFilters.push('all');
            }
        }
        
        // When filtering, re-fetch the current page with new filters
        fetchAndRenderCollectionPageLocal('current');
    });
});

// Event listener for language select dropdown
document.getElementById('lang-select').addEventListener('change', (e) => {
    activeLang = e.target.value;
    updateUI(activeLang);
});

document.getElementById('closeDetailsModalBtn').addEventListener('click', () => {
    document.getElementById('cardDetailsModal').classList.add('hidden');
});

// Deck Builder Logic
async function addDeck(name) {
    await firebaseAddDeck(userId, name);
}

async function updateDeck(deckId, data) {
    await firebaseUpdateDeck(userId, deckId, data);
}


async function enterDeckEditor(deckId) {
    currentDeckId = deckId;
    currentDeck = decks.find(d => d.id === deckId);
    if (!currentDeck) {
        return;
    }
    document.getElementById('decks-list').classList.add('hidden');
    document.getElementById('deck-editor').classList.remove('hidden');
    
    const deckEditorNameInput = document.getElementById('deck-editor-name-input');
    deckEditorNameInput.value = currentDeck.name;
    deckEditorNameInput.addEventListener('change', async (e) => {
        await updateDeck(currentDeckId, { name: e.target.value });
    });

    renderDeckCards(currentDeck, activeLang, async (cardId) => {
        await firebaseRemoveCardFromDeck(userId, currentDeckId, cardId, currentDeck.cards || []);
    });
    
    // For renderCollectionCards, we need to get the collection data first
    const collectionSearchInput = document.getElementById('collectionSearchInput');
    const searchTerm = collectionSearchInput.value.toLowerCase();
    const collectionSnapshot = await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/collection`), orderBy('name')));
    const fullCollection = collectionSnapshot.docs.map(d => ({id: d.id, result: d.data()}));
    const filteredCollection = fullCollection.filter(card => {
        const cardName = card.result.printed_name || card.result.name;
        return cardName.toLowerCase().includes(searchTerm);
    });
    
    renderCollectionCards(filteredCollection, searchTerm, activeLang, async (cardData) => {
        await firebaseAddCardToDeck(userId, currentDeckId, cardData, currentDeck.cards || []);
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
    currentDeck = null;
    currentDeckId = null;
    document.getElementById('decks-list').classList.remove('hidden');
    document.getElementById('deck-editor').classList.add('hidden');
    renderDecksList(decks, (deckId) => enterDeckEditor(deckId), 
        (deckId) => showModalLocal('modalRemoveCard', true, async () => {
            const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deckId);
            await deleteDoc(deckDocRef);
        }), activeLang); // Rerender the list to show the updated card counts
});

document.getElementById('collectionSearchInput').addEventListener('input', async () => {
    // Re-render collection cards with new search term
    const collectionSearchInput = document.getElementById('collectionSearchInput');
    const searchTerm = collectionSearchInput.value.toLowerCase();
    const collectionSnapshot = await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/collection`), orderBy('name')));
    const fullCollection = collectionSnapshot.docs.map(d => ({id: d.id, result: d.data()}));
    const filteredCollection = fullCollection.filter(card => {
        const cardName = card.result.printed_name || card.result.name;
        return cardName.toLowerCase().includes(searchTerm);
    });
    
    renderCollectionCards(filteredCollection, searchTerm, activeLang, async (cardData) => {
        await firebaseAddCardToDeck(userId, currentDeckId, cardData, currentDeck.cards || []);
    });
});

// Pagination event listeners
document.getElementById('nextPageBtn').addEventListener('click', () => fetchAndRenderCollectionPageLocal('next'));
document.getElementById('prevPageBtn').addEventListener('click', () => fetchAndRenderCollectionPageLocal('prev'));
document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
    cardsPerPage = parseInt(e.target.value, 10);
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
        
        if (tabId === 'explore-tab' && allSets.length > 0) {
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
  updateUI(activeLang);
};
