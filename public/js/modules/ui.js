/**
 * UI/DOM module for managing user interface elements, modals, tables, and DOM manipulation
 * Handles all visual updates, modal management, table rendering, and UI state management
 */

import { getTranslation } from './translations.js';
import { filterCardsByColor } from './searchFilter.js';

/**
 * Update the UI based on the selected language
 * @param {string} lang - Language code (e.g., 'ita', 'eng')
 */
export function updateUI(lang) {
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
}

/**
 * Update the visual API status indicator
 * @param {string} status - Status ('ready', 'error', 'connecting')
 * @param {string} messageKey - Translation key for status message
 * @param {string} activeLang - Current language
 */
export function updateApiStatus(status, messageKey, activeLang) {
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

/**
 * Show search results modal with card selection
 * @param {Array} cards - Array of card objects
 * @param {Function} onCardSelect - Callback when a card is selected
 */
export function showSearchResultsModal(cards, onCardSelect) {
    const modal = document.getElementById('cardSelectionModal');
    const grid = document.getElementById('cardSelectionGrid');
    grid.innerHTML = '';

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow';
        
        const imageUrl = card.image_uris?.art_crop || `https://placehold.co/200x150/E5E7EB/9CA3AF?text=N/A`;
        const cardName = card.printed_name || card.name;
        
        cardElement.innerHTML = `
            <img src="${imageUrl}" alt="${cardName}" class="w-full h-32 object-cover">
            <div class="p-3">
                <h3 class="font-semibold text-sm text-gray-800 truncate">${cardName}</h3>
                <p class="text-xs text-gray-600">${card.set_name}</p>
            </div>
        `;

        cardElement.addEventListener('click', () => {
            onCardSelect(card);
            modal.classList.add('hidden');
        });
        grid.appendChild(cardElement);
    });

    modal.classList.remove('hidden');
}

/**
 * Show card details modal
 * @param {Object} card - Card object
 * @param {Function} onAddToCollection - Callback when adding to collection
 */
export function showCardDetailsModal(card, onAddToCollection) {
    const modal = document.getElementById('cardDetailsModal');
    const cardImageContainer = document.getElementById('cardImageContainer');
    const cardNameInModal = document.getElementById('cardNameInModal');
    const cardDescriptionInModal = document.getElementById('cardDescriptionInModal');
    const addToCollectionBtn = document.getElementById('addToCollectionBtn');
    
    if (cardImageContainer) {
        const imageUrl = card.image_uris?.large || card.image_uris?.normal || `https://placehold.co/400x600/E5E7EB/9CA3AF?text=N/A`;
        cardImageContainer.innerHTML = `<img src="${imageUrl}" alt="${card.name}" class="w-full h-auto rounded-lg">`;
    }
    
    if (cardNameInModal) {
        cardNameInModal.textContent = card.printed_name || card.name;
    }
    
    if (cardDescriptionInModal) {
        cardDescriptionInModal.innerHTML = `
            <p><strong>Mana Cost:</strong> ${card.mana_cost || 'N/A'}</p>
            <p><strong>Type:</strong> ${card.type_line || 'N/A'}</p>
            <p><strong>Set:</strong> ${card.set_name || 'N/A'}</p>
            <p><strong>Rarity:</strong> ${card.rarity || 'N/A'}</p>
            ${card.oracle_text ? `<p><strong>Text:</strong> ${card.oracle_text}</p>` : ''}
        `;
    }

    // Set a data attribute on the button to store the card data
    if (addToCollectionBtn) {
        addToCollectionBtn.onclick = () => {
            onAddToCollection(card);
            modal.classList.add('hidden');
        };
    }
    
    modal.classList.remove('hidden');
}

/**
 * Show custom modal with message and optional buttons
 * @param {string} messageKey - Translation key for the message
 * @param {boolean} showCancel - Whether to show cancel button
 * @param {Function} onOk - Callback for OK button
 * @param {Function} onCancel - Callback for Cancel button
 * @param {Object} replacements - Object with replacement values for placeholders
 * @param {string} activeLang - Current language
 */
export function showModal(messageKey, showCancel = false, onOk = null, onCancel = null, replacements = {}, activeLang = 'ita') {
    const modal = document.getElementById('customModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalOkBtn = document.getElementById('modalOkBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    if (modalMessage) {
        let message = getTranslation(messageKey, activeLang, replacements);
        modalMessage.innerHTML = message;
    }

    if (modalOkBtn) {
        modalOkBtn.textContent = getTranslation('modalOk', activeLang);
        modalOkBtn.onclick = () => {
            if (onOk) onOk();
            modal.classList.add('hidden');
        };
    }

    if (modalCancelBtn) {
        modalCancelBtn.textContent = getTranslation('modalCancel', activeLang);
        modalCancelBtn.style.display = showCancel ? 'block' : 'none';
        modalCancelBtn.onclick = () => {
            if (onCancel) onCancel();
            modal.classList.add('hidden');
        };
    }

    modal.classList.remove('hidden');
}

/**
 * Add a row to the results table
 * @param {Object} data - Card data
 * @param {string} uniqueId - Unique identifier for the row
 * @param {Function} onSetChange - Callback when set selection changes
 * @param {Function} onDelete - Callback when delete button is clicked
 * @param {string} activeLang - Current language
 */
export function addRow(data, uniqueId, onSetChange, onDelete, activeLang = 'ita') {
    if (!data || !data.prices) {
        console.error("Dati non validi per addRow:", data);
        return;
    }

    const tableBody = document.querySelector('#resultsTable tbody');
    const newRow = document.createElement('tr');
    newRow.className = 'hover:bg-gray-50';
    
    const cardName = activeLang === 'ita' ? (data.printed_name || data.name) : data.name;
    const imageUrl = data.image_uris?.art_crop || `https://placehold.co/60x44/E5E7EB/9CA3AF?text=N/A`;
    
    newRow.innerHTML = `
        <td class="px-4 py-2 text-center text-sm text-gray-600"></td>
        <td class="px-4 py-2">
            <div class="flex items-center space-x-3">
                <img src="${imageUrl}" alt="${cardName}" class="w-12 h-9 object-cover rounded">
                <div>
                    <div class="text-ita-name font-medium text-gray-900">${data.printed_name || data.name}</div>
                    <div class="text-eng-name font-medium text-gray-900 hidden">${data.name}</div>
                    <div class="text-xs text-gray-500">${data.set_name}</div>
                </div>
            </div>
        </td>
        <td class="px-4 py-2 text-center">
            <select class="set-select border border-gray-300 rounded px-2 py-1 text-sm">
                <option>${getTranslation('searchAddBtn-loading', activeLang)}</option>
            </select>
        </td>
        <td class="px-4 py-2 text-center text-sm text-gray-600">${data.rarity || 'N/A'}</td>
        <td class="px-4 py-2 text-center text-sm text-gray-600">${data.mana_cost || 'N/A'}</td>
        <td class="px-4 py-2 text-center text-sm text-gray-600">${data.type_line || 'N/A'}</td>
        <td class="px-4 py-2 text-center text-sm text-gray-600">${data.prices?.eur || 'N/A'}€</td>
        <td class="px-4 py-2 text-center text-sm text-gray-600">$${data.prices?.usd || 'N/A'}</td>
        <td class="px-4 py-2 text-center">
            <button class="delete-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                ${getTranslation('tableColAction', activeLang)}
            </button>
        </td>
    `;
    tableBody.appendChild(newRow);
    
    const selectElement = newRow.querySelector('.set-select');
    const deleteBtn = newRow.querySelector('.delete-btn');

    // Set up event listeners
    if (selectElement && onSetChange) {
        selectElement.addEventListener('change', (e) => onSetChange(e, uniqueId));
    }

    if (deleteBtn && onDelete) {
        deleteBtn.addEventListener('click', () => onDelete(uniqueId));
    }
}

/**
 * Reindex table rows with proper numbering
 * @param {number} currentPage - Current page number
 * @param {number} cardsPerPage - Number of cards per page
 */
export function reindexRows(currentPage, cardsPerPage) {
    document.querySelectorAll('#resultsTable tbody tr').forEach((row, index) => {
        const pageOffset = (currentPage - 1) * cardsPerPage;
        const firstCell = row.querySelector('td:first-child');
        if (firstCell) {
            firstCell.textContent = pageOffset + index + 1;
        }
    });
}

/**
 * Render the results table
 * @param {Array} searchResults - Array of search results
 * @param {Array} activeFilters - Array of active color filters
 * @param {string} activeLang - Current language
 * @param {Function} onSetChange - Callback for set selection changes
 * @param {Function} onDelete - Callback for delete actions
 * @param {number} currentPage - Current page number
 * @param {number} cardsPerPage - Number of cards per page
 */
export function renderTable(searchResults, activeFilters, activeLang, onSetChange, onDelete, currentPage, cardsPerPage) {
    const tableBody = document.querySelector('#resultsTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (!Array.isArray(searchResults)) {
        console.error("searchResults non è un array. Impossibile renderizzare la tabella.");
        return;
    }
    
    let pageResults = [...searchResults];

    // Client-side COLOR filtering on the current page of results
    const allChecked = document.getElementById('filter-all')?.checked;
    if (!allChecked) {
        pageResults = filterCardsByColor(pageResults, activeFilters);
    }

    pageResults.forEach(result => {
        if (result && result.result) {
            addRow(result.result, result.id, onSetChange, onDelete, activeLang);
        }
    });
    
    reindexRows(currentPage, cardsPerPage);

    // Update visibility of name columns based on activeLang
    const itaNameCells = document.querySelectorAll('.text-ita-name');
    const engNameCells = document.querySelectorAll('.text-eng-name');
    const itaHeader = document.querySelector('th[data-sort="ita-name"]');
    const engHeader = document.querySelector('th[data-sort="eng-name"]');

    if (activeLang === 'ita') {
        itaNameCells.forEach(cell => cell.classList.remove('hidden'));
        engNameCells.forEach(cell => cell.classList.add('hidden'));
        if (itaHeader) itaHeader.classList.remove('hidden');
        if (engHeader) engHeader.classList.add('hidden');
    } else {
        itaNameCells.forEach(cell => cell.classList.add('hidden'));
        engNameCells.forEach(cell => cell.classList.remove('hidden'));
        if (itaHeader) itaHeader.classList.add('hidden');
        if (engHeader) engHeader.classList.remove('hidden');
    }
}

/**
 * Update pagination UI controls
 * @param {number} fetchedCount - Number of items fetched
 * @param {number} currentPage - Current page number
 * @param {string} activeLang - Current language
 */
export function updatePaginationUI(fetchedCount, currentPage, activeLang = 'ita') {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled = fetchedCount < 50; // Assuming 50 is the page size
    }

    if (pageInfo) {
        pageInfo.textContent = getTranslation('pageInfo', activeLang, { 
            ':PAGE:': currentPage.toString(),
            ':TOTAL:': fetchedCount.toString()
        });
    }
}

/**
 * Calculate and display total collection value
 * @param {Array} collectionData - Collection data
 * @param {string} activeLang - Current language
 */
export async function calculateAndDisplayTotalValue(collectionData, activeLang = 'ita') {
    const totalEurEl = document.getElementById('totalEur');
    const totalUsdEl = document.getElementById('totalUsd');
    if (!totalEurEl || !totalUsdEl) return; 

    let totalEur = 0;
    let totalUsd = 0;

    collectionData.forEach(card => {
        const eurPrice = parseFloat(card.prices?.eur || 0);
        const usdPrice = parseFloat(card.prices?.usd || 0);
        
        if (!isNaN(eurPrice)) totalEur += eurPrice;
        if (!isNaN(usdPrice)) totalUsd += usdPrice;
    });

    totalEurEl.textContent = `${totalEur.toFixed(2)}€`;
    totalUsdEl.textContent = `$${totalUsd.toFixed(2)}`;
}

/**
 * Render decks list
 * @param {Array} decks - Array of deck objects
 * @param {Function} onDeckSelect - Callback when deck is selected
 * @param {Function} onDeckDelete - Callback when deck is deleted
 * @param {string} activeLang - Current language
 */
export function renderDecksList(decks, onDeckSelect, onDeckDelete, activeLang = 'ita') {
    const decksContainer = document.getElementById('decks-container');
    if (!decksContainer) return;
    
    decksContainer.innerHTML = '';
    decks.forEach(deck => {
        const deckCard = document.createElement('div');
        deckCard.className = 'bg-gray-100 p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer relative group';
        deckCard.innerHTML = `
            <div class="flex items-center justify-between">
                <h3 class="font-bold text-gray-900">${deck.name}</h3>
                <button class="delete-deck-btn text-red-500 hover:text-red-700 p-1" data-deck-id="${deck.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                        <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452a51.18 51.18 0 0 1 3.273 0ZM4.5 6.75a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75ZM9.75 9a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            <p class="text-sm text-gray-600 mt-2">${deck.cards ? deck.cards.length : 0} ${getTranslation('cards', activeLang)}</p>
        `;

        deckCard.addEventListener('click', () => onDeckSelect(deck.id));
        
        const deleteBtn = deckCard.querySelector('.delete-deck-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDeckDelete(deck.id);
        });
        
        decksContainer.appendChild(deckCard);
    });
}

/**
 * Enter deck editor mode
 * @param {string} deckId - Deck ID
 * @param {Object} currentDeck - Current deck object
 */
export function enterDeckEditor(deckId, currentDeck) {
    const deckEditorNameInput = document.getElementById('deck-editor-name-input');
    if (deckEditorNameInput) {
        deckEditorNameInput.value = currentDeck.name;
    }
    
    document.getElementById('decks-list').classList.add('hidden');
    document.getElementById('deck-editor').classList.remove('hidden');
}

/**
 * Render deck cards in the editor
 * @param {Object} currentDeck - Current deck object
 * @param {string} activeLang - Current language
 * @param {Function} onRemoveCard - Callback when card is removed
 */
export function renderDeckCards(currentDeck, activeLang, onRemoveCard) {
    const deckListContainer = document.getElementById('deck-list-container');
    if (!deckListContainer) return;
    
    deckListContainer.innerHTML = '';
    (currentDeck.cards || []).forEach(card => {
        const cardItem = document.createElement('div');
        cardItem.className = 'flex items-center justify-between p-2 bg-gray-200 rounded-lg';
        const cardName = activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
        const imageUrl = card.image_uris?.art_crop || `https://placehold.co/60x44/E5E7EB/9CA3AF?text=N/A`;

        cardItem.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="${imageUrl}" alt="${cardName}" class="w-12 h-9 object-cover rounded">
                <span class="font-medium">${cardName}</span>
            </div>
            <button class="remove-from-deck-btn text-red-500 hover:text-red-700 p-1" data-card-id="${card.id}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452a51.18 51.18 0 0 1 3.273 0ZM4.5 6.75a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75ZM9.75 9a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" clip-rule="evenodd" />
                </svg>
            </button>
        `;

        const removeBtn = cardItem.querySelector('.remove-from-deck-btn');
        removeBtn.addEventListener('click', () => onRemoveCard(card.id));

        deckListContainer.appendChild(cardItem);
    });
}

/**
 * Render collection cards in deck editor
 * @param {Array} collectionCards - Array of collection cards
 * @param {string} searchTerm - Search term for filtering
 * @param {string} activeLang - Current language
 * @param {Function} onAddToDeck - Callback when card is added to deck
 */
export function renderCollectionCards(collectionCards, searchTerm, activeLang, onAddToDeck) {
    const collectionCardsGrid = document.getElementById('collection-cards-grid');
    if (!collectionCardsGrid) return;
    
    collectionCardsGrid.innerHTML = '';
    
    const filteredCollection = collectionCards.filter(card => {
        const cardName = card.result.printed_name || card.result.name;
        return cardName.toLowerCase().includes(searchTerm.toLowerCase());
    });

    filteredCollection.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow';
        
        const imageUrl = card.result.image_uris?.art_crop || `https://placehold.co/200x150/E5E7EB/9CA3AF?text=N/A`;
        const cardName = activeLang === 'ita' ? (card.result.printed_name || card.result.name) : card.result.name;
        
        cardElement.innerHTML = `
            <img src="${imageUrl}" alt="${cardName}" class="w-full h-32 object-cover">
            <div class="p-3">
                <h3 class="font-semibold text-sm text-gray-800 truncate">${cardName}</h3>
                <p class="text-xs text-gray-600">${card.result.set_name}</p>
            </div>
        `;

        cardElement.addEventListener('click', () => onAddToDeck(card.result));
        collectionCardsGrid.appendChild(cardElement);
    });
}

/**
 * Show/hide progress indicator
 * @param {boolean} show - Whether to show the progress indicator
 */
export function toggleProgress(show) {
    const progress = document.getElementById("progress");
    if (progress) {
        if (show) {
            progress.classList.remove('hidden');
        } else {
            progress.classList.add('hidden');
        }
    }
}

/**
 * Update progress text
 * @param {string} text - Progress text to display
 */
export function updateProgressText(text) {
    const progressText = document.getElementById("progressText");
    if (progressText) {
        progressText.textContent = text;
    }
}

/**
 * Set active tab
 * @param {string} tabId - Tab ID to activate
 */
export function setActiveTab(tabId) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to selected tab
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Show/hide corresponding content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}
