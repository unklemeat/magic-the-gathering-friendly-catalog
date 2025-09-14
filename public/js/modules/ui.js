import { getTranslation } from './translations.js';
import { filterCardsByColor } from './searchFilter.js';
import { fetchAllPrintsByOracleId } from './scryfallApi.js';

export function updateUI(lang) {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        element.innerHTML = getTranslation(element.dataset.langKey, lang);
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(element => {
        element.placeholder = getTranslation(element.dataset.langPlaceholder, lang);
    });
    document.querySelectorAll('[data-lang-title]').forEach(element => {
        element.title = getTranslation(element.dataset.langTitle, lang);
    });
}

export function updateApiStatus(status, messageKey, activeLang) {
    const statusIcon = document.getElementById('statusIcon');
    if (statusIcon) {
        statusIcon.className = 'w-3 h-3 rounded-full';
        if (status === 'ready') statusIcon.classList.add('bg-emerald-500');
        else if (status === 'error') statusIcon.classList.add('bg-red-500');
        else statusIcon.classList.add('bg-yellow-500', 'animate-pulse');
    }
    const statusBtn = document.getElementById('statusBtn');
    if (statusBtn) statusBtn.textContent = getTranslation('apiStatusBtn', activeLang);
}

export function showSearchResultsModal(cards, onCardSelect) {
    const modal = document.getElementById('cardSelectionModal');
    const grid = document.getElementById('cardSelectionGrid');
    grid.innerHTML = '';
    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow';
        const imageUrl = card.image_uris?.art_crop || `https://placehold.co/200x150/E5E7EB/9CA3AF?text=N/A`;
        const cardName = card.printed_name || card.name;
        cardEl.innerHTML = `<img src="${imageUrl}" alt="${cardName}" class="w-full h-32 object-cover"><div class="p-3"><h3 class="font-semibold text-sm text-gray-800 truncate">${cardName}</h3><p class="text-xs text-gray-600">${card.set_name}</p></div>`;
        cardEl.addEventListener('click', () => {
            onCardSelect(card);
            modal.classList.add('hidden');
        });
        grid.appendChild(cardEl);
    });
    modal.classList.remove('hidden');
}

export function showCardDetailsModal(card, onAddToCollection) {
    const modal = document.getElementById('cardDetailsModal');
    const imageUrl = card.image_uris?.large || card.image_uris?.normal || `https://placehold.co/400x600/E5E7EB/9CA3AF?text=N/A`;
    document.getElementById('cardImageContainer').innerHTML = `<img src="${imageUrl}" alt="${card.name}" class="w-full h-auto rounded-lg">`;
    document.getElementById('cardNameInModal').textContent = card.printed_name || card.name;
    document.getElementById('cardDescriptionInModal').innerHTML = `<p><strong>Mana Cost:</strong> ${card.mana_cost || 'N/A'}</p><p><strong>Type:</strong> ${card.type_line || 'N/A'}</p><p><strong>Set:</strong> ${card.set_name || 'N/A'}</p><p><strong>Rarity:</strong> ${card.rarity || 'N/A'}</p>${card.oracle_text ? `<p class="mt-2"><strong>Text:</strong> ${card.oracle_text}</p>` : ''}`;
    document.getElementById('addToCollectionBtn').onclick = () => {
        onAddToCollection(card);
        modal.classList.add('hidden');
    };
    modal.classList.remove('hidden');
}

export function showModal(messageKey, showCancel = false, onOk = null, onCancel = null, replacements = {}, activeLang = 'ita') {
    const modal = document.getElementById('customModal');
    document.getElementById('modalMessage').innerHTML = getTranslation(messageKey, activeLang, replacements);
    const okBtn = document.getElementById('modalOkBtn');
    okBtn.textContent = getTranslation('okBtn', activeLang);
    okBtn.onclick = () => {
        if (onOk) onOk();
        modal.classList.add('hidden');
    };
    const cancelBtn = document.getElementById('modalCancelBtn');
    cancelBtn.textContent = getTranslation('cancelBtn', activeLang);
    cancelBtn.style.display = showCancel ? 'block' : 'none';
    cancelBtn.onclick = () => {
        if (onCancel) onCancel();
        modal.classList.add('hidden');
    };
    modal.classList.remove('hidden');
}

export function showDeleteConfirmModal(message, lang, onEverywhere, onCollectionOnly) {
    const modal = document.getElementById('deleteConfirmModal');
    document.getElementById('deleteModalMessage').innerHTML = message;

    const everywhereBtn = document.getElementById('deleteEverywhereBtn');
    everywhereBtn.textContent = getTranslation('deleteAllBtn', lang);
    everywhereBtn.onclick = () => { onEverywhere(); modal.classList.add('hidden'); };

    const collectionOnlyBtn = document.getElementById('deleteCollectionOnlyBtn');
    collectionOnlyBtn.textContent = getTranslation('deleteOnlyFromCollectionBtn', lang);
    collectionOnlyBtn.onclick = () => { onCollectionOnly(); modal.classList.add('hidden'); };

    const cancelBtn = document.getElementById('deleteCancelBtn');
    cancelBtn.textContent = getTranslation('cancelBtn', lang);
    cancelBtn.onclick = () => modal.classList.add('hidden');
    
    modal.classList.remove('hidden');
}

export function addRow(data, uniqueId, onSetChange, onDelete, activeLang = 'ita') {
    const tableBody = document.querySelector('#resultsTable tbody');
    const newRow = document.createElement('tr');
    newRow.className = 'hover:bg-gray-50';
    const cardName = data.printed_name || data.name;
    const imageUrl = data.image_uris?.small || `https://placehold.co/74x104/E5E7EB/9CA3AF?text=N/A`;
    const prices = data.prices;
    const colorSymbols = (data.colors?.length > 0) ? data.colors.map(c => `<span class="color-symbol color-${c.toLowerCase()}"></span>`).join('') : '<span class="color-symbol color-c"></span>';
    
    newRow.innerHTML = `<td class="px-4 py-2 text-center text-sm text-gray-600"></td><td class="px-4 py-2 text-center"><img src="${imageUrl}" alt="${cardName}" class="card-img w-14 h-auto rounded-md mx-auto"></td><td class="px-4 py-2 font-medium text-gray-900"><div>${cardName}</div><div class="text-xs text-gray-500">${data.set_name}</div></td><td class="px-4 py-2 text-sm text-gray-600 text-center">${data.rarity} ${colorSymbols}</td><td class="px-4 py-2 text-center"><select class="set-select border border-gray-300 rounded px-2 py-1 text-sm bg-white w-40"><option value="${data.id}">${data.set_name}</option></select></td><td class="px-4 py-2 text-center text-sm font-semibold text-gray-800 price-eur">${prices.eur ? `${prices.eur} €` : "—"}</td><td class="px-4 py-2 text-center text-sm font-semibold text-gray-800 price-usd">${prices.usd ? `${prices.usd} $` : "—"}</td><td class="px-4 py-2 text-center"><button class="details-btn bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">${getTranslation('tableColDetails', activeLang)}</button></td><td class="px-4 py-2 text-center"><button class="delete-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">${getTranslation('tableColAction', activeLang)}</button></td>`;
    
    tableBody.appendChild(newRow);
    
    const selectEl = newRow.querySelector('.set-select');
    selectEl.addEventListener('mousedown', async () => {
        const firstOption = selectEl.querySelector('option');
        if (firstOption) {
            firstOption.textContent = getTranslation('searchAddBtn-loading', activeLang);
        }

        try {
            const allPrints = await fetchAllPrintsByOracleId(data.oracle_id);
            selectEl.innerHTML = '';
            if (allPrints && allPrints.length > 0) {
                allPrints.forEach(print => {
                    const option = document.createElement('option');
                    option.value = print.id;
                    option.textContent = print.set_name;
                    option.selected = print.id === data.id;
                    selectEl.appendChild(option);
                });
            } else {
                if (firstOption) {
                    selectEl.appendChild(firstOption);
                    firstOption.textContent = data.set_name;
                }
            }
        } catch (error) {
            console.error("Error fetching card prints:", error);
            selectEl.innerHTML = `<option>${getTranslation('apiStatusError', activeLang)}</option>`;
        }
    }, { once: true });
    
    selectEl.addEventListener('change', (e) => onSetChange(e, uniqueId));
    newRow.querySelector('.delete-btn').addEventListener('click', () => onDelete(uniqueId));
    // Modifica: usa onclick per poterlo sovrascrivere facilmente
    newRow.querySelector('.details-btn').onclick = () => showCardDetailsModal(data, () => {});
}

export function renderTable(searchResults, activeFilters, activeLang, onSetChange, onDelete, currentPage, cardsPerPage) {
    const tableBody = document.querySelector('#resultsTable tbody');
    tableBody.innerHTML = '';
    const filteredResults = activeFilters.includes('all') ? searchResults : filterCardsByColor(searchResults, activeFilters);
    filteredResults.forEach((result) => {
        if (result && result.result) {
            addRow(result.result, result.id, onSetChange, onDelete, activeLang);
        }
    });
    document.querySelectorAll('#resultsTable tbody tr').forEach((row, index) => {
        const pageOffset = (currentPage - 1) * cardsPerPage;
        row.querySelector('td:first-child').textContent = pageOffset + index + 1;
    });
}

export function updatePaginationUI(fetchedCount, currentPage, activeLang) {
    const pageSize = parseInt(document.getElementById('pageSizeSelect').value, 10);
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = fetchedCount < pageSize;
    document.getElementById('pageInfo').textContent = getTranslation('pageInfoText', activeLang, { '{currentPage}': currentPage });
}

export async function calculateAndDisplayTotalValue(collectionData) {
    let totalEur = 0, totalUsd = 0;
    collectionData.forEach(card => {
        const prices = card.result?.prices || card.prices;
        totalEur += parseFloat(prices?.eur || 0);
        totalUsd += parseFloat(prices?.usd || 0);
    });

    const totalEurElement = document.getElementById('totalEur');
    const totalUsdElement = document.getElementById('totalUsd');

    if (totalEurElement && totalUsdElement) {
        totalEurElement.textContent = `${totalEur.toFixed(2)} €`;
        totalUsdElement.textContent = `${totalUsd.toFixed(2)} $`;
    }
}

export function renderDecksList(decks, onDeckSelect, onDeckDelete, activeLang) {
    const container = document.getElementById('decks-container');
    container.innerHTML = '';
    decks.forEach(deck => {
        const card = document.createElement('div');
        card.className = 'bg-gray-100 p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer relative group';
        card.innerHTML = `<div class="flex items-center justify-between"><h3 class="font-bold text-gray-900">${deck.name}</h3><button class="delete-deck-btn text-red-500 hover:text-red-700 p-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452a51.18 51.18 0 0 1 3.273 0ZM4.5 6.75a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75ZM9.75 9a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" clip-rule="evenodd" /></svg></button></div><p class="text-sm text-gray-600 mt-2">${deck.cards?.length || 0} carte</p>`;
        card.addEventListener('click', () => onDeckSelect(deck.id));
        card.querySelector('.delete-deck-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            onDeckDelete(deck.id);
        });
        container.appendChild(card);
    });
}

export function renderDeckCards(currentDeck, activeLang, onRemoveCard) {
    const container = document.getElementById('deck-list-container');
    container.innerHTML = '';
    (currentDeck.cards || []).forEach(card => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 bg-gray-200 rounded-lg';
        const cardName = activeLang === 'ita' ? (card.printed_name || card.name) : card.name;
        const imageUrl = card.image_uris?.art_crop || `https://placehold.co/60x44/E5E7EB/9CA3AF?text=N/A`;
        item.innerHTML = `<div class="flex items-center gap-3"><img src="${imageUrl}" alt="${cardName}" class="w-12 h-9 object-cover rounded"><span class="font-medium">${cardName}</span></div><button class="remove-from-deck-btn text-red-500 hover:text-red-700 p-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452a51.18 51.18 0 0 1 3.273 0ZM4.5 6.75a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75ZM9.75 9a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" clip-rule="evenodd" /></svg></button>`;
        item.querySelector('.remove-from-deck-btn').addEventListener('click', () => onRemoveCard(card.id));
        container.appendChild(item);
    });
}

export function renderCollectionCards(collection, activeLang, onAddToDeck) {
    const grid = document.getElementById('collection-cards-grid');
    grid.innerHTML = '';
    collection.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow';
        const cardData = card.result;
        const imageUrl = cardData.image_uris?.art_crop || `https://placehold.co/200x150/E5E7EB/9CA3AF?text=N/A`;
        const cardName = activeLang === 'ita' ? (cardData.printed_name || cardData.name) : cardData.name;
        
        cardEl.innerHTML = `<img src="${imageUrl}" alt="${cardName}" class="w-full h-20 object-cover"><div class="p-2"><h3 class="font-semibold text-xs text-gray-800 truncate">${cardName}</h3><p class="text-xs text-gray-600 truncate">${cardData.set_name}</p></div>`;
        
        cardEl.addEventListener('click', () => onAddToDeck(cardData));
        grid.appendChild(cardEl);
    });
}

export function toggleProgress(show) {
    document.getElementById("progress").classList.toggle('hidden', !show);
}

export function updateProgressText(text) {
    document.getElementById("progressText").textContent = text;
}