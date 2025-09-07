import { getTranslation } from './modules/translations.js';
import { 
  rateLimitedRequest, 
  fetchSets, 
  fetchAllPrintsByOracleId, 
  searchCardsExact, 
  searchCardFuzzy, 
  fetchCardById, 
  fetchSetCards,
  normalizeName, 
  capitalizeWords 
} from './modules/scryfallApi.js';
import {
  initializeFirebase,
  authenticateUser,
  addCardToCollection as firebaseAddCardToCollection,
  updateCardInCollection,
  removeCardFromCollection,
  buildBaseCollectionQuery,
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
                            renderDeckCards();
                        } else {
                            document.getElementById('decks-list').classList.remove('hidden');
                            deckEditor.classList.add('hidden');
                            renderDecksList();
                        }
                    } else {
                        renderDecksList();
                    }
                }
            });

            // Esegui il fetch della prima pagina della collezione e calcola i totali
            fetchAndRenderCollectionPage('first');
            calculateAndDisplayTotalValue();
            
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

// Function to translate the UI based on the selected language
function updateUI(lang) {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.dataset.langKey;
        element.innerHTML = getTranslation(key, lang);
    });

    document.querySelectorAll('[data-lang-placeholder]').forEach(element => {
        const key = element.dataset.langPlaceholder;
        element.placeholder = getTranslation(key, lang);
    });

    document.querySelectorAll('[data-lang-title]').forEach(element => {
        const key = element.dataset.langTitle;
        element.title = getTranslation(key, lang);
    });
    updatePaginationUI(searchResults.length);
}

// Table sorting variables
let currentSort = { column: null, direction: 'asc' };

// API status variable
let apiStatus = 'connecting';


// Function to update the visual API status
function updateApiStatus(status, messageKey) {
    const statusIcon = document.getElementById('statusIcon');
    const statusBtn = document.getElementById('statusBtn');
    
    // Check if the elements exist before trying to update them
    if (statusIcon) {
        if (status === 'ready') {
            statusIcon.className = 'w-3 h-3 rounded-full bg-emerald-500';
        } else if (status === 'error') {
            statusIcon.className = 'w-3 h-3 rounded-full bg-red-500';
        } else { // connecting
            statusIcon.className = 'w-3 h-3 rounded-full bg-yellow-500 animate-pulse';
        }
    }

    if (statusBtn) {
        statusBtn.textContent = getTranslation('apiStatusBtn', activeLang);
    }
}

// Fetch all sets from Scryfall on app startup
async function loadSets() {
  updateApiStatus('connecting', 'apiStatusConnecting');
  try {
    allSets = await fetchSets();
    if (allSets.length > 0) {
      updateApiStatus('ready', 'apiStatusReady');
      populateSetSelect();
    } else {
      updateApiStatus('error', 'apiStatusError');
    }
  } catch (error) {
    console.error("Sets loading error:", error);
    updateApiStatus('error', 'apiStatusError');
  }
}

// Populate the set selector
function populateSetSelect() {
  const setSelect = document.getElementById('setSelect');
  setSelect.innerHTML = ''; // Clear existing options
  allSets.forEach(set => {
    const option = document.createElement('option');
    option.value = set.code;
    option.textContent = set.name;
    setSelect.appendChild(option);
  });
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
                    showCardDetailsModal(card);
                });
                cardsContainer.appendChild(cardElement);
            });
    } catch (error) {
        console.error("Error fetching set cards:", error);
        showModal('modalApiError');
    } finally {
        document.getElementById("progress").classList.add('hidden');
    }
}




// New unified search function
async function findCardAndHandleResults(cardName) {
    const formattedName = cardName.trim();
    
    // Step 1: Strict search for exact match
    const exactResult = await searchCardsExact(formattedName, activeLang);

    if (exactResult && exactResult.data && exactResult.data.length > 0) {
        const exactMatches = exactResult.data.filter(card => normalizeName(card.name) === normalizeName(formattedName) || (card.printed_name && normalizeName(card.printed_name) === normalizeName(formattedName)));
        
        if (exactMatches.length === 1) {
            const card = exactMatches[0];
            const allPrints = await fetchAllPrintsByOracleId(card.oracle_id);
            addCardToCollection({ ...card, cardPrints: allPrints });
            return;
        } else if (exactMatches.length > 1) {
            showSearchResultsModal(exactMatches);
            return;
        }
    }
    
    // Step 2: Fuzzy search as a fallback if no exact match is found
    const namedResult = await searchCardFuzzy(formattedName);
    
    if (namedResult && namedResult.object === "card") {
      const allPrints = await fetchAllPrintsByOracleId(namedResult.oracle_id);
      
      if (allPrints.length > 0) {
        showSearchResultsModal(allPrints);
        return;
      }
    }
    
    showModal('modalNotFound', false, null, null, { ': ': `: "${cardName}"` });
}

function showSearchResultsModal(cards) {
    const modal = document.getElementById('cardSelectionModal');
    const grid = document.getElementById('cardSelectionGrid');
    grid.innerHTML = '';

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'cursor-pointer p-2 bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 transition-colors';
        const imageUrl = card.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';
        const cardName = activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
        cardElement.innerHTML = `
            <img src="${imageUrl}" alt="${cardName}" class="w-full rounded-lg mb-2">
            <p class="text-sm text-center font-semibold">${cardName}</p>
        `;
        cardElement.addEventListener('click', async () => {
            const allPrints = await fetchAllPrintsByOracleId(card.oracle_id);
            addCardToCollection({ ...card, cardPrints: allPrints });
            modal.classList.add('hidden');
        });
        grid.appendChild(cardElement);
    });

    modal.classList.remove('hidden');
}

// Show the card details modal
function showCardDetailsModal(card) {
    const modal = document.getElementById('cardDetailsModal');
    const cardImageContainer = document.getElementById('cardImageContainer');
    const cardNameInModal = document.getElementById('cardNameInModal');
    const cardDescriptionInModal = document.getElementById('cardDescriptionInModal');
    const addToCollectionBtn = document.getElementById('addToCollectionBtn');

    cardImageContainer.innerHTML = '';
    
    // Check for "transform" property which indicates a double-sided card
    if (card.card_faces) {
        card.card_faces.forEach(face => {
            if (face.image_uris && face.image_uris.large) {
                const img = document.createElement('img');
                img.src = face.image_uris.large;
                img.alt = face.name;
                img.className = "w-full rounded-lg shadow-lg";
                cardImageContainer.appendChild(img);
            }
        });
    } else if (card.image_uris && card.image_uris.large) {
        const img = document.createElement('img');
        img.src = card.image_uris.large;
        img.alt = card.name;
        img.className = "w-full rounded-lg shadow-lg";
        cardImageContainer.appendChild(img);
    } else {
        const noImageText = getTranslation('modalNoImage', activeLang);
        cardImageContainer.innerHTML = `<div class="text-gray-400 text-center">${noImageText}</div>`;
    }

    const cardName = activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
    cardNameInModal.textContent = cardName;
    const descText = card.oracle_text || getTranslation('modalNoOracleText', activeLang);
    cardDescriptionInModal.textContent = descText;

    // Set a data attribute on the button to store the card data
    addToCollectionBtn.onclick = async () => {
        addCardToCollection(card);
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
}

// Show a generic modal with a custom message
function showModal(messageKey, showCancel = false, onOk = null, onCancel = null, replacements = {}) {
    const modal = document.getElementById('customModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalOkBtn = document.getElementById('modalOkBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    let message = getTranslation(messageKey, activeLang);
    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(key, value);
    }
    modalMessage.textContent = message;
    modalCancelBtn.classList.toggle('hidden', !showCancel);

    modal.classList.remove('hidden');

    modalOkBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onOk) onOk();
    };
    modalCancelBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onCancel) onCancel();
    };
}

// Function to add a card to the collection table
async function addCardToCollection(cardData) {
    const success = await firebaseAddCardToCollection(userId, cardData);
    if (success) {
        console.log("Card added to Firestore collection:", cardData.name);
        
        // Always refresh the first page to show the new card.
        fetchAndRenderCollectionPage('first');
        calculateAndDisplayTotalValue();
    } else {
        console.error("Error adding card to collection");
    }
}

// Add a new row to the table
function addRow(data, uniqueId) {
    if (!data || !data.prices) {
        console.error("Dati non validi per addRow:", data);
        return;
    }

    const tableBody = document.querySelector('#resultsTable tbody');
    const newRow = document.createElement('tr');
    newRow.className = "border-t border-gray-200 transition-all duration-300 hover:bg-gray-100";
    newRow.dataset.rowId = uniqueId;
    newRow.id = uniqueId;
    const index = tableBody.childElementCount;

    const imageUrl = data.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';
    const colorSymbols = (data.colors && Array.isArray(data.colors)) ? data.colors.map(c => `<span class="color-symbol color-${c.toLowerCase()}"></span>`).join('') : (data.type_line && data.type_line.includes('Land') ? `<span class="color-symbol color-land"></span>` : `<span class="color-symbol color-c"></span>`);
    
    const setName = data.set_name || data.set.toUpperCase();
    const setOptions = `<option value="${data.id}" selected>${setName}</option>`;

    const cardNameIta = data.printed_name || data.name || 'N/A';
    const cardNameEng = data.name || 'N/A';

    newRow.innerHTML = `
        <td class="py-2 px-4 border">${index + 1}</td>
        <td class="py-2 px-4 border">
            <img src="${imageUrl}" alt="${cardNameEng}" class="w-20 rounded-lg shadow-md card-img" onerror="this.onerror=null;this.src='https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';">
        </td>
        <td class="py-2 px-4 border text-ita-name">${cardNameIta}</td>
        <td class="py-2 px-4 border text-eng-name">${cardNameEng}</td>
        <td class="py-2 px-4 border color-cell">${colorSymbols}</td>
        <td class="py-2 px-4 border">
            <select class="p-1 border rounded-lg set-select">
                ${setOptions}
            </select>
        </td>
        <td class="py-2 px-4 border font-semibold price-eur">${data.prices.eur ? `${data.prices.eur} €` : "—"}</td>
        <td class="py-2 px-4 border font-semibold price-usd">${data.prices.usd ? `${data.prices.usd} $` : "—"}</td>
        <td class="py-2 px-4 border">
            <button class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-full text-xs details-btn">${getTranslation('tableColDetails', activeLang)}</button>
        </td>
        <td class="py-2 px-4 border">
            <button class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-xs remove-btn" data-lang-key="tableColAction">${getTranslation('tableColAction', activeLang)}</button>
        </td>
    `;
    tableBody.appendChild(newRow);
    
    const selectElement = newRow.querySelector('.set-select');

    selectElement.addEventListener('mousedown', async (e) => {
        if (e.target.dataset.populated) return; 
        e.target.dataset.populated = 'true'; 

        e.target.innerHTML = `<option>${getTranslation('searchAddBtn-loading', activeLang)}</option>`;

        const cardInCollection = searchResults.find(r => r.id === uniqueId);
        if (cardInCollection && cardInCollection.result.oracle_id) {
            const allPrints = await fetchAllPrintsByOracleId(cardInCollection.result.oracle_id);
            if (allPrints.length > 0) {
                const newSetOptions = allPrints.map(print => {
                    const setObj = allSets.find(s => s.code === print.set.toLowerCase());
                    const printSetName = setObj ? setObj.name : print.set.toUpperCase();
                    return `<option value="${print.id}" ${data.id === print.id ? 'selected' : ''}>${printSetName}</option>`;
                }).join('');
                e.target.innerHTML = newSetOptions;
            }
        }
    });

    selectElement.addEventListener('change', async (e) => {
        const selectedPrintId = e.target.value;
        const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/collection`, uniqueId);
        
        const printDataResponse = await fetchCardById(selectedPrintId);
        if (printDataResponse && printDataResponse.object === 'card') {
            const printToSave = { ...printDataResponse };
            delete printToSave.cardPrints;
            await setDoc(cardDocRef, printToSave);

            // Manually update the row in the UI with the new data
            const parentRow = e.target.closest('tr');
            if (parentRow) {
                const prices = printToSave.prices;
                const imageUrl = printToSave.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';

                parentRow.querySelector('.price-eur').textContent = prices.eur ? `${prices.eur} €` : "—";
                parentRow.querySelector('.price-usd').textContent = prices.usd ? `${prices.usd} $` : "—";
                parentRow.querySelector('.card-img').src = imageUrl;
                
                // Also update the local searchResults array to keep it in sync
                const resultIndex = searchResults.findIndex(r => r.id === uniqueId);
                if (resultIndex > -1) {
                    searchResults[resultIndex].result = printToSave;
                }
                 calculateAndDisplayTotalValue();
            }
        }
    });

    newRow.querySelector('.details-btn').addEventListener('click', () => {
        const cardInCollection = searchResults.find(r => r.id === uniqueId);
        if (cardInCollection) {
            showCardDetailsModal(cardInCollection.result);
        }
    });
    
    newRow.querySelector('.remove-btn').addEventListener('click', async () => {
        if (!db || !userId) return;

        const cardInCollection = searchResults.find(r => r.id === uniqueId);
        if (!cardInCollection) return;

        const cardToDelete = cardInCollection.result;
        const cardOracleId = cardToDelete.oracle_id;

        // Find decks containing this card
        const decksWithCard = decks.filter(deck => 
            deck.cards && deck.cards.some(card => card.oracle_id === cardOracleId)
        );

        const deleteCardFromCollection = async () => {
            const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/collection`, uniqueId);
            await deleteDoc(cardDocRef);
            fetchAndRenderCollectionPage('current'); // Refresh current page
            calculateAndDisplayTotalValue();
        };

        if (decksWithCard.length > 0) {
            const deckNames = decksWithCard.map(d => d.name).join(', ');
            
            const modal = document.getElementById('customModal');
            const modalMessage = document.getElementById('modalMessage');
            const modalButtons = document.getElementById('modalButtons');
            
            const message = getTranslation('modalRemoveFromDecks', activeLang, { 'DECK_NAMES': deckNames });
            modalMessage.textContent = message;

            modalButtons.innerHTML = `
                <button id="deleteOnlyFromCollectionBtn" class="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-full transition-colors">${getTranslation('deleteOnlyFromCollectionBtn', activeLang)}</button>
                <button id="deleteAllBtn" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-full transition-colors">${getTranslation('deleteAllBtn', activeLang)}</button>
                <button id="cancelDeleteBtn" class="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-full transition-colors">${getTranslation('cancelBtn', activeLang)}</button>
            `;
            
            const restoreModalButtons = () => {
                modalButtons.innerHTML = `
                    <button id="modalOkBtn" class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-full transition-colors" data-lang-key="okBtn">${getTranslation('okBtn', activeLang)}</button>
                    <button id="modalCancelBtn" class="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-full transition-colors hidden" data-lang-key="cancelBtn">${getTranslation('cancelBtn', activeLang)}</button>
                `;
            };

            document.getElementById('deleteOnlyFromCollectionBtn').onclick = async () => {
                await deleteCardFromCollection();
                modal.classList.add('hidden');
                restoreModalButtons();
            };

            document.getElementById('deleteAllBtn').onclick = async () => {
                await deleteCardFromCollection();
                await removeCardFromAllDecksByOracleIdLocal(cardOracleId);
                modal.classList.add('hidden');
                restoreModalButtons();
            };

            document.getElementById('cancelDeleteBtn').onclick = () => {
                modal.classList.add('hidden');
                restoreModalButtons();
            };
            
            modal.classList.remove('hidden');

        } else {
            // Card is not in any deck, show the simple confirmation
            showModal('modalRemoveCard', true, async () => {
                await deleteCardFromCollection();
            });
        }
    });
}

// Re-index the rows after a deletion
function reindexRows() {
  document.querySelectorAll('#resultsTable tbody tr').forEach((row, index) => {
    const pageOffset = (currentPage - 1) * cardsPerPage;
    row.querySelector('td:first-child').textContent = pageOffset + index + 1;
  });
}

// Render the table based on the current filter and language
function renderTable() {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    
    if (!Array.isArray(searchResults)) {
        console.error("searchResults non è un array. Impossibile renderizzare la tabella.");
        return;
    }
    
    let pageResults = [...searchResults];

    // Client-side COLOR filtering on the current page of results
    const allChecked = document.getElementById('filter-all').checked;
    if (!allChecked) {
        pageResults = pageResults.filter(r => {
            const cardColors = r.result.colors;
            const typeLine = r.result.type_line;

            const matchesMulti = activeFilters.includes('multi') && cardColors && cardColors.length > 1;
            const matchesColorless = activeFilters.includes('incolor') && (!cardColors || cardColors.length === 0) && !(typeLine && typeLine.includes('Land'));
            const matchesSpecificColor = activeFilters.some(filterColor => cardColors && cardColors.includes(filterColor));
            const matchesLand = activeFilters.includes('incolor') && typeLine && typeLine.includes('Land');

            return matchesMulti || matchesColorless || matchesSpecificColor || matchesLand;
        });
    }

    pageResults.forEach(result => {
        if (result && result.result) {
            addRow(result.result, result.id);
        }
    });
    reindexRows();

    // Update visibility of name columns based on activeLang
    const itaNameCells = document.querySelectorAll('.text-ita-name');
    const engNameCells = document.querySelectorAll('.text-eng-name');
    const itaHeader = document.querySelector('th[data-sort="ita-name"]');
    const engHeader = document.querySelector('th[data-sort="eng-name"]');

    if (activeLang === 'ita') {
        itaNameCells.forEach(cell => cell.style.display = '');
        engNameCells.forEach(cell => cell.style.display = 'none');
        itaHeader.style.display = '';
        engHeader.style.display = 'none';
    } else {
        itaNameCells.forEach(cell => cell.style.display = 'none');
        engNameCells.forEach(cell => cell.style.display = '');
        itaHeader.style.display = 'none';
        engHeader.style.display = 'none';
    }
}

// Helper to map sort column to firestore field name
function getSortableField(column) {
    switch (column) {
        case 'ita-name': return 'printed_name';
        case 'eng-name': return 'name';
        case 'set': return 'set_name';
        case 'eur-price': return 'prices.eur';
        case 'usd-price': return 'prices.usd';
        // Note: Sorting by color is complex with Firestore and is not implemented server-side.
        default: return 'name'; // Default sort field
    }
}

// Function to build the base query with current filters and sorting
function buildLocalCollectionQuery() {
    const searchTerm = document.getElementById('collectionFilterInput').value.trim();
    return buildBaseCollectionQuery(userId, searchTerm);
}

// Main function to fetch and render a page of the collection
async function fetchAndRenderCollectionPage(direction = 'first') {
    if (!db) return;
    document.getElementById("progress").classList.remove('hidden');
    
    try {
        const pageData = await fetchCollectionPage(userId, direction, cardsPerPage, pageFirstDocs, lastVisible);
        
        if (pageData.cards.length > 0) {
            if (direction === 'next') {
                currentPage++;
                pageFirstDocs.push(pageData.firstVisible);
            } else if (direction === 'prev') {
                currentPage--;
            }
            firstVisible = pageData.firstVisible;
            lastVisible = pageData.lastVisible;
        }
        
        searchResults = pageData.cards;
        
        renderTable(); 
        updatePaginationUI(pageData.cards.length);

    } catch (error) {
        console.error("Error fetching collection page:", error);
        alert("Errore nel caricare i dati. Potrebbe essere necessario creare un indice in Firestore per l'ordinamento richiesto. Controlla la console per il link per crearlo.");
    } finally {
        document.getElementById("progress").classList.add('hidden');
    }
}

function updatePaginationUI(fetchedCount) {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = fetchedCount < cardsPerPage; 

    pageInfo.innerHTML = getTranslation('pageInfoText', activeLang, { '{currentPage}': currentPage });
}

async function calculateAndDisplayTotalValue() {
    if (!db || !userId) return;

    const totalEurEl = document.getElementById('totalEur');
    const totalUsdEl = document.getElementById('totalUsd');
    if (!totalEurEl || !totalUsdEl) return; 

    const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/collection`);
    const querySnapshot = await getDocs(collectionRef);

    let totalEur = 0;
    let totalUsd = 0;

    querySnapshot.forEach(doc => {
        const card = doc.data();
        if (card.prices) {
            if (card.prices.eur) {
                totalEur += parseFloat(card.prices.eur);
            }
            if (card.prices.usd) {
                totalUsd += parseFloat(card.prices.usd);
            }
        }
    });

    totalEurEl.textContent = `€${totalEur.toFixed(2)}`;
    totalUsdEl.textContent = `$${totalUsd.toFixed(2)}`;
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
                fetchAndRenderCollectionPage('first');
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
    
    await findCardAndHandleResults(cardName);
    
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
                const result = await findCardWithAPI({ name, set });

                if (result.strategy !== 'not-found' && result.strategy !== 'api-error') {
                    const selectedPrint = result.cardPrints.find(p => p.id === result.selectedPrintId);
                    if (selectedPrint) {
                        addCardToCollection({ ...selectedPrint, cardPrints: result.cardPrints });
                    }
                }
            }
        }
        if (progress) progress.classList.add('hidden');
        fetchAndRenderCollectionPage('first');
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
                fetchAndRenderCollectionPage('first');
                calculateAndDisplayTotalValue();
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
    fetchAndRenderCollectionPage('first');
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
        
        // When filtering, we re-render the current page of data client-side
        renderTable();
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

function renderDecksList() {
    const decksContainer = document.getElementById('decks-container');
    decksContainer.innerHTML = '';
    decks.forEach(deck => {
        const deckCard = document.createElement('div');
        deckCard.className = 'bg-gray-100 p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer relative group';
        deckCard.innerHTML = `
            <div class="flex items-center justify-between">
                <h3 class="font-bold text-gray-900">${deck.name}</h3>
                <button class="delete-deck-btn text-red-500 hover:text-red-700 p-1" data-deck-id="${deck.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                       <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            <p class="text-sm text-gray-600">${deck.cards ? deck.cards.length : 0} carte</p>
        `;
        deckCard.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-deck-btn')) {
                enterDeckEditor(deck.id);
            }
        });
        deckCard.querySelector('.delete-deck-btn').addEventListener('click', (e) => {
             showModal('modalRemoveCard', true, async () => {
                if (!db || !userId) return;
                const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deck.id);
                await deleteDoc(deckDocRef);
             });
        });
        decksContainer.appendChild(deckCard);
    });
}

function enterDeckEditor(deckId) {
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

    renderDeckCards();
    renderCollectionCards();
}

function renderDeckCards() {
    const deckListContainer = document.getElementById('deck-list-container');
    deckListContainer.innerHTML = '';
    (currentDeck.cards || []).forEach(card => {
        const cardItem = document.createElement('div');
        cardItem.className = 'flex items-center justify-between p-2 bg-gray-200 rounded-lg';
        const cardName = activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
        const imageUrl = card.image_uris?.art_crop || `https://placehold.co/60x44/E5E7EB/9CA3AF?text=N/A`;

        cardItem.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="${imageUrl}" alt="${cardName}" class="w-16 rounded-md">
                <span class="font-semibold">${cardName}</span>
            </div>
            <button class="remove-from-deck-btn bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-full" data-card-id="${card.id}">${getTranslation('removeBtn', activeLang)}</button>
        `;
        cardItem.querySelector('.remove-from-deck-btn').addEventListener('click', async () => {
            removeCardFromDeck(card.id);
        });
        deckListContainer.appendChild(cardItem);
    });
}

async function renderCollectionCards() {
    const collectionCardsGrid = document.getElementById('collection-cards-grid');
    const collectionSearchInput = document.getElementById('collectionSearchInput');
    const searchTerm = collectionSearchInput.value.toLowerCase();
    collectionCardsGrid.innerHTML = '';
    
    // In deck editor, we still show the whole (unpaginated) collection for now for simplicity.
    // A future improvement could be paginating this view as well.
    const collectionSnapshot = await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/collection`), orderBy('name')));
    const fullCollection = collectionSnapshot.docs.map(d => ({id: d.id, result: d.data()}));

    const filteredCollection = fullCollection.filter(card => {
        const cardName = card.result.printed_name || card.result.name;
        return cardName.toLowerCase().includes(searchTerm);
    });
    
    filteredCollection.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'collection-card-tile p-2 bg-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer';
        const imageUrl = card.result.image_uris?.small || 'https://placehold.co/74x104/E5E7EB/9CA3AF?text=No+Image';
        const cardName = activeLang === 'ita' ? (card.result.printed_name || card.result.name) : card.result.name;
        
        cardElement.innerHTML = `
            <img src="${imageUrl}" alt="${cardName}" class="w-full rounded-lg mb-2">
            <p class="text-sm text-center font-semibold text-gray-800">${cardName}</p>
        `;
        cardElement.addEventListener('click', () => {
            addCardToDeck(card.result);
        });
        collectionCardsGrid.appendChild(cardElement);
    });
}

async function addCardToDeck(cardData) {
    if (currentDeckId && db && userId) {
        await firebaseAddCardToDeck(userId, currentDeckId, cardData, currentDeck.cards || []);
    }
}

async function removeCardFromDeck(cardId) {
    if (currentDeckId && db && userId) {
        await firebaseRemoveCardFromDeck(userId, currentDeckId, cardId, currentDeck.cards || []);
    }
}

async function removeCardFromAllDecksByOracleIdLocal(oracleId) {
    const updatedDecksCount = await removeCardFromAllDecksByOracleId(userId, oracleId);
    console.log(`Card with oracle_id ${oracleId} removed from ${updatedDecksCount} decks.`);
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
    renderDecksList(); // Rerender the list to show the updated card counts
});

document.getElementById('collectionSearchInput').addEventListener('input', () => {
    renderCollectionCards();
});

// Pagination event listeners
document.getElementById('nextPageBtn').addEventListener('click', () => fetchAndRenderCollectionPage('next'));
document.getElementById('prevPageBtn').addEventListener('click', () => fetchAndRenderCollectionPage('prev'));
document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
    cardsPerPage = parseInt(e.target.value, 10);
    fetchAndRenderCollectionPage('first');
});

// Collection filter event listener
document.getElementById('collectionSearchBtn').addEventListener('click', () => {
    fetchAndRenderCollectionPage('first');
});

document.getElementById('collectionFilterInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('collectionSearchBtn').click();
    }
});

document.getElementById('collectionResetBtn').addEventListener('click', () => {
    document.getElementById('collectionFilterInput').value = '';
    fetchAndRenderCollectionPage('first');
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
                fetchAndRenderCollectionPage('first');
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
