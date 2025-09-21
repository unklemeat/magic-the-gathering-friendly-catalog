import { getTranslation } from './modules/translations.js';
import { fetchSets, fetchAllPrintsByOracleId, fetchSetCards } from './modules/scryfallApi.js';
import {
  initializeFirebase, authenticateUser, setupDecksListener,
  addDeck as firebaseAddDeck, updateDeck as firebaseUpdateDeck,
  addCardToDeck as firebaseAddCardToDeck, removeCardFromDeck as firebaseRemoveCardFromDeck,
  deleteDeck as firebaseDeleteDeck,
  importDecks as firebaseImportDecks, getDocs, query, collection,
  orderBy, doc, deleteDoc, getAllCollectionCards, exportDecks as firebaseExportDecks,
  importCollection as firebaseImportCollection,
  setupCollectionsListener, createCollection, deleteCollection
} from './modules/firebase.js';
import {
  updateUI, showSearchResultsModal, showCardDetailsModal,
  showModal, renderDecksList, renderDeckCards, renderCollectionCards,
  renderCollectionsDropdown, showImportConfirmModal
} from './modules/ui.js';
import {
  populateSetSelect, handleSearchWithUI, clearAllFilters, validateSearchInput,
  exportToJson, processJsonData
} from './modules/searchFilter.js';
import {
  addCardToCollection as collectionAddCardToCollection,
  fetchAndRenderCollectionPage as collectionFetchAndRenderCollectionPage,
  calculateAndDisplayTotalValue as collectionCalculateAndDisplayTotalValue
} from './modules/collectionManagement.js';
import { setupEventListeners } from './modules/events.js';
import * as state from './modules/state.js';
import { authenticate, isAuthenticated, logout } from './modules/auth.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- MAIN APP INITIALIZATION ---
const firebaseInstances = initializeFirebase();
if (firebaseInstances) {
    state.setDb(firebaseInstances.db);
    state.setAuth(firebaseInstances.auth);
    authenticateUser(onAuthStateChanged);
} else {
    document.body.innerHTML = `<div class="p-8 text-center bg-red-100 text-red-800"><h1 class="text-2xl font-bold">Errore di Configurazione</h1><p class="mt-2">Configurazione di Firebase non trovata.</p></div>`;
}

function onAuthStateChanged(user) {
    if (user) {
        state.setUserId(user.uid);
        console.log("User authenticated:", state.userId);
        setupCollectionsListener(state.userId, onCollectionsDataReceived);
        setupDecksListener(state.userId, onDecksDataReceived);
    } else {
        console.log("No user authenticated.");
        state.setUserId(null);
    }
}

function onCollectionsDataReceived(collectionsData) {
    state.setCollections(collectionsData);
    renderCollectionsDropdown(collectionsData, state.currentCollectionId, 'collectionSelect');
    if (collectionsData.length > 0 && !state.currentCollectionId) {
        handleCollectionChange(collectionsData[0].id);
    } else if (collectionsData.length === 0) {
        document.getElementById('resultsTable').querySelector('tbody').innerHTML = '';
        calculateAndDisplayTotalValueLocal();
    }
}

function handleCollectionChange(collectionId) {
    state.setCurrentCollectionId(collectionId);
    const collection = state.collections.find(c => c.id === collectionId);
    state.setCurrentCollectionName(collection ? collection.name : '');
    
    // Reset pagination state
    state.setCurrentPage(1);
    state.setLastVisible(null);
    state.setFirstVisible(null);
    state.setPageFirstDocs([null]);

    renderCollectionsDropdown(state.collections, collectionId, 'collectionSelect');
    fetchAndRenderCollectionPageLocal('first');
    calculateAndDisplayTotalValueLocal();
}

function onDecksDataReceived(decksData) {
    state.setDecks(decksData);
    
    const deckEditorVisible = !document.getElementById('deck-editor').classList.contains('hidden');
    if (deckEditorVisible && state.currentDeckId) {
        const updatedDeck = state.decks.find(d => d.id === state.currentDeckId);
        if (updatedDeck) {
            state.setCurrentDeck(updatedDeck);
            renderDeckCards(updatedDeck, state.activeLang, handleRemoveCardFromDeck);
        } else {
            eventHandlers.onBackToDecks();
        }
    } else {
        renderDecksList(state.decks, enterDeckEditor, handleDeleteDeck, state.activeLang);
    }
}

// --- UI & DATA WRAPPERS ---
function showModalLocal(messageKey, showCancel = false, onOk = null, onCancel = null, replacements = {}) {
    showModal(messageKey, showCancel, onOk, onCancel, replacements, state.activeLang);
}

async function loadSets() {
    try {
        const sets = await fetchSets();
        state.setAllSets(sets);
        if (sets.length > 0) {
            populateSetSelect(state.allSets, state.activeLang);
        }
    } catch (error) {
        console.error("Sets loading error:", error);
    }
}

async function fetchAndRenderSetCards(setCode) {
    const container = document.getElementById('setCardsContainer');
    container.innerHTML = '';
    document.getElementById("progress").classList.remove('hidden');
    try {
        const cards = await fetchSetCards(setCode);
        document.getElementById("progressText").textContent = `${getTranslation('processing', state.activeLang)} ${cards.length} carte...`;
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-tile p-2 bg-gray-100 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer';
            const imageUrl = card.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';
            const cardName = state.activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
            cardEl.innerHTML = `<img src="${imageUrl}" alt="${cardName}" class="w-full rounded-lg mb-2"><p class="text-sm text-center font-semibold text-gray-800">${cardName}</p>`;
            cardEl.addEventListener('click', () => showCardDetailsModal(card, addCardToCollection, true));
            container.appendChild(cardEl);
        });
    } catch (error) {
        console.error("Error fetching set cards:", error);
        showModalLocal('modalApiError');
    } finally {
        document.getElementById("progress").classList.add('hidden');
    }
}

async function fetchAndRenderCollectionPageLocal(direction = 'first') {
    if (!state.db || !state.userId || !state.currentCollectionId) return;
    const searchTerm = document.getElementById('collectionFilterInput').value.trim();
    const result = await collectionFetchAndRenderCollectionPage(
        direction, state.userId, state.currentCollectionId, state.cardsPerPage, state.pageFirstDocs, state.lastVisible, state.currentPage, 
        state.activeFilters, state.activeLang,
        (cards) => state.setSearchResults(cards),
        (error) => console.error("Error fetching collection page:", error),
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
    if (!state.db || !state.userId || !state.currentCollectionId) {
        document.getElementById('totalEur').textContent = '0.00 €';
        document.getElementById('totalUsd').textContent = '0.00 $';
        return;
    };
    await collectionCalculateAndDisplayTotalValue(state.userId, state.currentCollectionId, appId, state.activeLang, () => {}, console.error);
}

// --- CORE ACTIONS ---
async function addCardToCollection(cardData) {
    const collectionId = state.currentCollectionId;
    if (!collectionId) {
        showModalLocal('modalNoCollections');
        return;
    }

    if (!cardData.cardPrints) {
        cardData.cardPrints = await fetchAllPrintsByOracleId(cardData.oracle_id);
    }
    
    await collectionAddCardToCollection(cardData, state.userId, collectionId, () => {
        if (collectionId === state.currentCollectionId) {
            fetchAndRenderCollectionPageLocal('first');
            calculateAndDisplayTotalValueLocal();
        }
    }, console.error);
}

async function handleSearch() {
    const cardNameInput = document.getElementById('cardNameInput');
    const validation = validateSearchInput(cardNameInput.value);
    if (!validation.isValid) return showModalLocal(validation.message);

    const btn = document.getElementById('searchCardBtn');
    await handleSearchWithUI(cardNameInput.value, state.activeLang,
        () => {
            btn.disabled = true;
            btn.textContent = getTranslation('searchAddBtn-loading', state.activeLang);
        },
        () => {
            btn.disabled = false;
            btn.textContent = getTranslation('searchAddBtn-completed', state.activeLang);
            cardNameInput.value = '';
        },
        addCardToCollection,
        (cards) => showSearchResultsModal(cards, addCardToCollection),
        (cardName) => showModalLocal('modalNotFound', false, null, null, { ': ': `: "${cardName}"` }),
        showModalLocal
    );
}

// --- DECK BUILDER LOGIC ---
let fullCollectionForEditor = [];

async function enterDeckEditor(deckId) {
    const selectedDeck = state.decks.find(d => d.id === deckId);
    if (!selectedDeck) return;
    state.setCurrentDeckId(deckId);
    state.setCurrentDeck(selectedDeck);

    document.getElementById('decks-list').classList.add('hidden');
    document.getElementById('deck-editor').classList.remove('hidden');
    updateUI(state.activeLang);
    
    const nameInput = document.getElementById('deck-editor-name-input');
    nameInput.value = selectedDeck.name;
    nameInput.onchange = (e) => firebaseUpdateDeck(state.userId, deckId, { name: e.target.value });

    renderDeckCards(selectedDeck, state.activeLang, handleRemoveCardFromDeck);
    
    const searchInput = document.getElementById('collectionSearchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = getTranslation('collectionFilterPlaceholder', state.activeLang);
    }
    
    await loadCollectionForDeckEditor();
}

async function loadCollectionForDeckEditor() {
    try {
        const collectionId = state.currentCollectionId;
        if (collectionId) {
            fullCollectionForEditor = await getAllCollectionCards(state.userId, collectionId);
            updateEditorCollectionView();
        }
    } catch (error) {
        console.error("Error loading collection for deck editor:", error);
        fullCollectionForEditor = [];
        updateEditorCollectionView();
    }
}

function updateEditorCollectionView() {
    const searchTerm = document.getElementById('collectionSearchInput').value.toLowerCase();
    const filtered = fullCollectionForEditor.filter(card => {
        if (!card.result) return false;
        const cardName = card.result.printed_name || card.result.name || '';
        return cardName.toLowerCase().includes(searchTerm);
    });
    renderCollectionCards(filtered, state.activeLang, handleAddCardToDeck);
}

function handleAddCardToDeck(cardData) {
    firebaseAddCardToDeck(state.userId, state.currentDeckId, cardData, state.currentDeck.cards || []);
}

function handleRemoveCardFromDeck(cardId) {
    firebaseRemoveCardFromDeck(state.userId, state.currentDeckId, cardId, state.currentDeck.cards || []);
}

async function handleDeleteDeck(deckId) {
    showModalLocal('modalRemoveDeck', true, async () => {
        const success = await firebaseDeleteDeck(state.userId, deckId);
        if (!success) {
            showModalLocal('modalApiError');
        }
    });
}

// --- EVENT HANDLERS BINDING---
const eventHandlers = {
    onTabChange: (tabId) => {
        document.getElementById('resultsSection').classList.toggle('hidden', tabId !== 'search-tab');
        if (tabId === 'search-tab' && state.userId) {
             document.getElementById('resultsSection').classList.remove('hidden');
             fetchAndRenderCollectionPageLocal('first');
        } else {
             document.getElementById('resultsSection').classList.add('hidden');
        }
        if (tabId === 'explore-tab' && state.allSets.length > 0) fetchAndRenderSetCards(document.getElementById('setSelect').value);
        if (tabId === 'decks-tab' && state.userId) renderDecksList(state.decks, enterDeckEditor, handleDeleteDeck, state.activeLang);
    },
    onSetChange: (setCode) => fetchAndRenderSetCards(setCode),
    onSearch: handleSearch,
    onCreateDeck: async () => {
        const input = document.getElementById('newDeckNameInput');
        if (input.value.trim() && state.userId) {
            await firebaseAddDeck(state.userId, input.value.trim());
            input.value = '';
        }
    },
    onBackToDecks: () => {
        state.setCurrentDeck(null);
        state.setCurrentDeckId(null);
        document.getElementById('decks-list').classList.remove('hidden');
        document.getElementById('deck-editor').classList.add('hidden');
        renderDecksList(state.decks, enterDeckEditor, handleDeleteDeck, state.activeLang);
    },
    onCollectionSearch: updateEditorCollectionView,
    onNextPage: () => fetchAndRenderCollectionPageLocal('next'),
    onPrevPage: () => fetchAndRenderCollectionPageLocal('prev'),
    onPageSizeChange: (newSize) => {
        state.setCardsPerPage(newSize);
        fetchAndRenderCollectionPageLocal('first');
    },
    onCollectionFilter: () => fetchAndRenderCollectionPageLocal('first'),
    onCollectionReset: () => {
        document.getElementById('collectionFilterInput').value = '';
        state.setActiveFilters(clearAllFilters(() => {
            document.querySelectorAll('.color-filter-label input').forEach(c => { c.checked = true; c.closest('label').classList.add('checked'); });
        }));
        fetchAndRenderCollectionPageLocal('first');
    },
    onSort: (column) => {
        let direction = (state.currentSort.column === column && state.currentSort.direction === 'asc') ? 'desc' : 'asc';
        state.setCurrentSort({ column, direction });
        document.querySelectorAll('.sort-icon').forEach(icon => icon.className = 'sort-icon');
        const icon = document.querySelector(`[data-sort="${column}"] .sort-icon`);
        if (icon) icon.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
        fetchAndRenderCollectionPageLocal('first');
    },
    onColorFilterChange: () => fetchAndRenderCollectionPageLocal('first'),
    onLanguageChange: (newLang) => {
        state.setActiveLang(newLang);
        updateUI(state.activeLang);
        const currentTab = document.querySelector('.tab-button.active')?.dataset.tab;
        if (currentTab === 'search-tab') fetchAndRenderCollectionPageLocal('first');
    },
    onVoiceSearchError: showModalLocal,
    onSaveJson: async () => {
        if (!state.userId || !state.currentCollectionId) return;
        const cards = await getAllCollectionCards(state.userId, state.currentCollectionId);
        exportToJson(cards, `${state.currentCollectionName}.json`, 
            () => showModalLocal('modalJsonSaved'),
            (errorKey) => showModalLocal(errorKey || 'modalJsonLoadError')
        );
    },
    onLoadJson: (file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            processJsonData(e.target.result, 
                (cards) => {
                    const fileName = file.name.replace('.json', '');
                    const existingCollection = state.collections.find(c => c.name === fileName);

                    const performImport = async (collectionId, merge = false) => {
                        const success = await firebaseImportCollection(state.userId, collectionId, cards, merge);
                        if (success) {
                            showModalLocal('modalCardsLoaded', false, null, null, { 'CARD_COUNT': cards.length });
                            handleCollectionChange(collectionId);
                        } else {
                            showModalLocal('modalJsonLoadError');
                        }
                    };

                    if (existingCollection) {
                        showImportConfirmModal(
                            existingCollection.name,
                            state.activeLang,
                            () => performImport(existingCollection.id, true), // Merge
                            () => performImport(existingCollection.id, false) // Overwrite
                        );
                    } else {
                        // If no name conflict, create a new collection and import
                        createCollection(state.userId, fileName).then(newCollectionId => {
                            if (newCollectionId) {
                                performImport(newCollectionId);
                            } else {
                                showModalLocal('modalJsonLoadError');
                            }
                        });
                    }
                },
                (errorKey) => showModalLocal(errorKey)
            );
        };
        reader.readAsText(file);
    },
    onSaveDecks: async () => {
        if (!state.userId) return;
        const decksToSave = await firebaseExportDecks(state.userId);
        if (!decksToSave || decksToSave.length === 0) {
            return showModalLocal('modalNoDecksToSave');
        }
        exportToJson(decksToSave, 'mtg_decks.json',
            () => showModalLocal('modalDecksSaved'),
            (errorKey) => showModalLocal(errorKey || 'modalInvalidDecksJson')
        );
    },
    onLoadDecks: (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            processJsonData(e.target.result,
                async (decksData) => {
                    const success = await firebaseImportDecks(state.userId, decksData);
                    if (success) {
                        showModalLocal('modalDecksLoaded', false, null, null, { 'DECK_COUNT': decksData.length });
                    } else {
                        showModalLocal('modalInvalidDecksJson');
                    }
                },
                (errorKey) => showModalLocal(errorKey)
            );
        };
        reader.readAsText(file);
    },
    onCreateCollection: () => {
        const name = prompt(getTranslation('newCollectionPrompt', state.activeLang));
        if (name && state.userId) {
            createCollection(state.userId, name);
        }
    },
    onDeleteCollection: () => {
        if (state.currentCollectionId && confirm(getTranslation('deleteCollectionConfirm', state.activeLang))) {
            deleteCollection(state.userId, state.currentCollectionId);
            state.setCurrentCollectionId(null);
        }
    },
    onCollectionChange: (event) => {
        handleCollectionChange(event.target.value);
        if (!document.getElementById('deck-editor').classList.contains('hidden')) {
            loadCollectionForDeckEditor();
        }
    },
    onLogout: () => {
        logout();
        location.reload();
    }
};

function initAuth() {
    const loginOverlay = document.getElementById('loginOverlay');
    const appContent = document.getElementById('app');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    if (isAuthenticated()) {
        loginOverlay.classList.add('hidden');
        appContent.classList.remove('hidden');
    } else {
        loginOverlay.classList.remove('hidden');
        appContent.classList.add('hidden');
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = passwordInput.value;
            if (authenticate(password)) {
                loginOverlay.classList.add('hidden');
                appContent.classList.remove('hidden');
                loginError.classList.add('hidden');
            } else {
                loginError.textContent = 'Invalid password. Please try again.';
                loginError.classList.remove('hidden');
            }
        });
    }
}

// --- APP START ---
window.onload = () => {
  initAuth();
  setupEventListeners(eventHandlers);
  loadSets();
  updateUI(state.activeLang);
};