/**
 * Search/Filter module for card search, filtering, sorting, and related functionality
 * Handles all search operations, filtering logic, sorting, and set management
 */

import { getTranslation } from './translations.js';
import { 
  searchCardsExact, 
  searchCardFuzzy, 
  fetchAllPrintsByOracleId,
  normalizeName 
} from './scryfallApi.js';

/**
 * Find a card and handle the search results
 * @param {string} cardName - Name of the card to search for
 * @param {string} activeLang - Current language
 * @param {Function} onCardFound - Callback when a single card is found
 * @param {Function} onMultipleCardsFound - Callback when multiple cards are found
 * @param {Function} onCardNotFound - Callback when no card is found
 */
export async function findCardAndHandleResults(cardName, activeLang, onCardFound, onMultipleCardsFound, onCardNotFound) {
    const formattedName = cardName.trim();
    
    // Step 1: Strict search for exact match
    const exactResult = await searchCardsExact(formattedName, activeLang);

    if (exactResult && exactResult.data && exactResult.data.length > 0) {
        const exactMatches = exactResult.data.filter(card => 
            normalizeName(card.name) === normalizeName(formattedName) || 
            (card.printed_name && normalizeName(card.printed_name) === normalizeName(formattedName))
        );
        
        if (exactMatches.length === 1) {
            const card = exactMatches[0];
            const allPrints = await fetchAllPrintsByOracleId(card.oracle_id);
            onCardFound({ ...card, cardPrints: allPrints });
            return;
        } else if (exactMatches.length > 1) {
            onMultipleCardsFound(exactMatches);
            return;
        }
    }
    
    // Step 2: Fuzzy search as a fallback if no exact match is found
    const namedResult = await searchCardFuzzy(formattedName);
    
    if (namedResult && namedResult.object === "card") {
        const allPrints = await fetchAllPrintsByOracleId(namedResult.oracle_id);
        
        if (allPrints.length > 0) {
            onMultipleCardsFound(allPrints);
            return;
        }
    }
    
    onCardNotFound(cardName);
}

/**
 * Get the sortable field name for a given column
 * @param {string} column - Column identifier
 * @returns {string} Field name for sorting
 */
export function getSortableField(column) {
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

/**
 * Filter cards based on color filters
 * @param {Array} cards - Array of card objects
 * @param {Array} activeFilters - Array of active color filters
 * @returns {Array} Filtered array of cards
 */
export function filterCardsByColor(cards, activeFilters) {
    if (!Array.isArray(cards) || !Array.isArray(activeFilters)) {
        return cards;
    }

    return cards.filter(card => {
        const cardColors = card.result?.colors || card.colors;
        const typeLine = card.result?.type_line || card.type_line;

        const matchesMulti = activeFilters.includes('multi') && cardColors && cardColors.length > 1;
        const matchesColorless = activeFilters.includes('incolor') && 
            (!cardColors || cardColors.length === 0) && 
            !(typeLine && typeLine.includes('Land'));
        const matchesSpecificColor = activeFilters.some(filterColor => 
            cardColors && cardColors.includes(filterColor));
        const matchesLand = activeFilters.includes('incolor') && 
            typeLine && typeLine.includes('Land');

        return matchesMulti || matchesColorless || matchesSpecificColor || matchesLand;
    });
}

/**
 * Filter cards by search term
 * @param {Array} cards - Array of card objects
 * @param {string} searchTerm - Search term
 * @param {string} activeLang - Current language
 * @returns {Array} Filtered array of cards
 */
export function filterCardsBySearchTerm(cards, searchTerm, activeLang = 'ita') {
    if (!searchTerm || !Array.isArray(cards)) {
        return cards;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return cards.filter(card => {
        const cardData = card.result || card;
        const cardName = activeLang === 'ita' ? 
            (cardData.printed_name || cardData.name) : 
            cardData.name;
        
        return cardName.toLowerCase().includes(term);
    });
}

/**
 * Sort cards by a specific field
 * @param {Array} cards - Array of card objects
 * @param {string} field - Field to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted array of cards
 */
export function sortCards(cards, field, direction = 'asc') {
    if (!Array.isArray(cards)) {
        return cards;
    }

    return [...cards].sort((a, b) => {
        const aData = a.result || a;
        const bData = b.result || b;
        
        let aValue, bValue;
        
        // Handle nested fields like prices.eur
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            aValue = aData[parent]?.[child] || '';
            bValue = bData[parent]?.[child] || '';
        } else {
            aValue = aData[field] || '';
            bValue = bData[field] || '';
        }
        
        // Convert to numbers for price fields
        if (field.includes('price')) {
            aValue = parseFloat(aValue) || 0;
            bValue = parseFloat(bValue) || 0;
            
            if (direction === 'desc') {
                return bValue - aValue;
            } else {
                return aValue - bValue;
            }
        }
        
        // Convert to strings for comparison
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
        
        if (direction === 'desc') {
            return bValue.localeCompare(aValue);
        } else {
            return aValue.localeCompare(bValue);
        }
    });
}

/**
 * Populate set selector dropdown
 * @param {Array} allSets - Array of all available sets
 * @param {string} activeLang - Current language
 */
export function populateSetSelect(allSets, activeLang = 'ita') {
    const setSelect = document.getElementById('setSelect');
    if (!setSelect) return;
    
    setSelect.innerHTML = ''; // Clear existing options
    
    allSets.forEach(set => {
        const option = document.createElement('option');
        option.value = set.code;
        option.textContent = set.name;
        setSelect.appendChild(option);
    });
}

/**
 * Handle search form submission
 * @param {string} cardName - Name of the card to search for
 * @param {string} activeLang - Current language
 * @param {Function} onCardFound - Callback when a single card is found
 * @param {Function} onMultipleCardsFound - Callback when multiple cards are found
 * @param {Function} onCardNotFound - Callback when no card is found
 * @param {Function} onError - Callback for errors
 */
export async function handleSearch(cardName, activeLang, onCardFound, onMultipleCardsFound, onCardNotFound, onError) {
    if (!cardName) {
        onError('modalNoCardName');
        return;
    }

    try {
        await findCardAndHandleResults(cardName, activeLang, onCardFound, onMultipleCardsFound, onCardNotFound);
    } catch (error) {
        console.error('Search error:', error);
        onError('modalApiError');
    }
}

/**
 * Handle complete search workflow with UI state management
 * @param {string} cardName - Name of the card to search
 * @param {string} activeLang - Current language
 * @param {Function} onSearchStart - Callback when search starts (for UI updates)
 * @param {Function} onSearchComplete - Callback when search completes (for UI updates)
 * @param {Function} onCardFound - Callback when a single card is found
 * @param {Function} onMultipleCardsFound - Callback when multiple cards are found
 * @param {Function} onCardNotFound - Callback when no card is found
 * @param {Function} onError - Callback for errors
 */
export async function handleSearchWithUI(cardName, activeLang, onSearchStart, onSearchComplete, onCardFound, onMultipleCardsFound, onCardNotFound, onError) {
    if (!cardName) {
        onError('modalNoCardName');
        return;
    }

    // Start search workflow
    onSearchStart(cardName);

    try {
        await findCardAndHandleResults(cardName, activeLang, onCardFound, onMultipleCardsFound, onCardNotFound);
    } catch (error) {
        console.error('Search error:', error);
        onError('modalApiError');
    } finally {
        // Complete search workflow
        onSearchComplete();
    }
}

/**
 * Handle set selection change
 * @param {string} setCode - Selected set code
 * @param {Function} onSetSelected - Callback when set is selected
 * @param {Function} onError - Callback for errors
 */
export async function handleSetSelection(setCode, onSetSelected, onError) {
    if (!setCode) {
        onError('modalNoSetSelected');
        return;
    }

    try {
        await onSetSelected(setCode);
    } catch (error) {
        console.error('Set selection error:', error);
        onError('modalApiError');
    }
}

/**
 * Handle filter changes
 * @param {string} filterType - Type of filter ('color', 'search', etc.)
 * @param {string} filterValue - Filter value
 * @param {Array} currentFilters - Current active filters
 * @param {Function} onFilterChange - Callback when filter changes
 * @returns {Array} Updated filters array
 */
export function handleFilterChange(filterType, filterValue, currentFilters, onFilterChange) {
    let updatedFilters = [...currentFilters];
    
    if (filterType === 'color') {
        if (filterValue === 'all') {
            updatedFilters = ['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor'];
        } else {
            // Remove 'all' if a specific color is selected
            updatedFilters = updatedFilters.filter(f => f !== 'all');
            
            if (updatedFilters.includes(filterValue)) {
                // Remove the filter
                updatedFilters = updatedFilters.filter(f => f !== filterValue);
            } else {
                // Add the filter
                updatedFilters.push(filterValue);
            }
            
            // If no specific filters are active, activate 'all'
            if (updatedFilters.length === 0) {
                updatedFilters = ['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor'];
            }
        }
    }
    
    onFilterChange(updatedFilters);
    return updatedFilters;
}

/**
 * Handle sort changes
 * @param {string} column - Column to sort by
 * @param {Object} currentSort - Current sort state
 * @param {Function} onSortChange - Callback when sort changes
 * @returns {Object} Updated sort state
 */
export function handleSortChange(column, currentSort, onSortChange) {
    let newDirection = 'asc';
    
    if (currentSort.column === column) {
        newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    
    const newSort = { column, direction: newDirection };
    onSortChange(newSort);
    return newSort;
}

/**
 * Process CSV data for import
 * @param {string} csvData - CSV data as string
 * @param {Function} onProcessComplete - Callback when processing is complete
 * @param {Function} onError - Callback for errors
 */
export function processCsvData(csvData, onProcessComplete, onError) {
    try {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim());
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
        
        onProcessComplete(data);
    } catch (error) {
        console.error('CSV processing error:', error);
        onError('modalCsvError');
    }
}

/**
 * Process JSON data for import
 * @param {string} jsonData - JSON data as string
 * @param {Function} onProcessComplete - Callback when processing is complete
 * @param {Function} onError - Callback for errors
 */
export function processJsonData(jsonData, onProcessComplete, onError) {
    try {
        const data = JSON.parse(jsonData);
        
        if (Array.isArray(data)) {
            onProcessComplete(data);
        } else {
            onError('modalInvalidJson');
        }
    } catch (error) {
        console.error('JSON processing error:', error);
        onError('modalJsonLoadError');
    }
}

/**
 * Export data to JSON format
 * @param {Array} data - Data to export
 * @param {string} filename - Filename for the export
 * @param {Function} onExportComplete - Callback when export is complete
 * @param {Function} onError - Callback for errors
 */
export function exportToJson(data, filename, onExportComplete, onError) {
    try {
        if (!Array.isArray(data) || data.length === 0) {
            onError('modalNoDataToExport');
            return;
        }
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        onExportComplete();
    } catch (error) {
        console.error('Export error:', error);
        onError('modalExportError');
    }
}

/**
 * Handle voice search
 * @param {Function} onVoiceResult - Callback when voice result is received
 * @param {Function} onVoiceError - Callback for voice errors
 * @returns {Function} Function to start voice recognition
 */
export function setupVoiceSearch(onVoiceResult, onVoiceError) {
    if (!('webkitSpeechRecognition' in window)) {
        return null;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'it-IT';
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onVoiceResult(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        onVoiceError('modalSpeechError');
    };
    
    return () => {
        try {
            recognition.start();
        } catch (error) {
            console.error('Voice recognition start error:', error);
            onVoiceError('modalSpeechError');
        }
    };
}

/**
 * Clear all filters and reset to default state
 * @param {Function} onFiltersCleared - Callback when filters are cleared
 * @returns {Array} Default filters array
 */
export function clearAllFilters(onFiltersCleared) {
    const defaultFilters = ['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor'];
    onFiltersCleared(defaultFilters);
    return defaultFilters;
}

/**
 * Get filter display name
 * @param {string} filter - Filter identifier
 * @param {string} activeLang - Current language
 * @returns {string} Display name for the filter
 */
export function getFilterDisplayName(filter, activeLang = 'ita') {
    const filterNames = {
        'all': getTranslation('filterAll', activeLang),
        'W': getTranslation('filterWhite', activeLang),
        'U': getTranslation('filterBlue', activeLang),
        'B': getTranslation('filterBlack', activeLang),
        'R': getTranslation('filterRed', activeLang),
        'G': getTranslation('filterGreen', activeLang),
        'multi': getTranslation('filterMulti', activeLang),
        'incolor': getTranslation('filterColorless', activeLang)
    };
    
    return filterNames[filter] || filter;
}

/**
 * Validate search input
 * @param {string} input - Search input
 * @returns {Object} Validation result with isValid and message
 */
export function validateSearchInput(input) {
    if (!input || input.trim().length === 0) {
        return {
            isValid: false,
            message: 'modalNoCardName'
        };
    }
    
    if (input.trim().length < 2) {
        return {
            isValid: false,
            message: 'modalCardNameTooShort'
        };
    }
    
    return {
        isValid: true,
        message: null
    };
}
