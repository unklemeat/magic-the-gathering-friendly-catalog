import { capitalizeWords } from './scryfallApi.js';
import { setupVoiceSearch, clearAllFilters } from './searchFilter.js';
import * as state from './state.js';

export function setupEventListeners(handlers) {
    // Voice search setup
    const voiceSearchBtn = document.getElementById('voiceSearchBtn');
    const cardNameInput = document.getElementById('cardNameInput');
    const micIcon = document.getElementById('mic-icon');
    const micUnsupportedIcon = document.getElementById('mic-unsupported-icon');

    let isListening = false; // Definisci lo stato di ascolto

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
            if (handlers.onVoiceSearchError) {
                handlers.onVoiceSearchError(errorKey);
            }
        },
        // Questa è la nuova funzione che viene chiamata alla fine
        () => {
            isListening = false;
            micIcon.classList.remove('text-green-500', 'mic-listening');
        }
    );

    if (startVoiceSearch) {
        voiceSearchBtn.addEventListener('click', () => {
            if (!isListening) {
                startVoiceSearch();
                isListening = true;
                micIcon.classList.add('text-green-500', 'mic-listening');
            }
        });
    } else {
        if (voiceSearchBtn) {
            voiceSearchBtn.disabled = true;
        }
        if (micUnsupportedIcon) {
            micUnsupportedIcon.classList.remove('hidden');
        }
        console.warn("Your browser does not support the Web Speech API.");
    }

    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active', 'text-purple-700', 'border-purple-500');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

            const clickedButton = e.target;
            clickedButton.classList.add('active');
            clickedButton.classList.remove('text-gray-500', 'border-transparent');
            clickedButton.classList.add('text-purple-700', 'border-purple-500');

            const tabId = clickedButton.dataset.tab;
            document.getElementById(tabId).classList.remove('hidden');
            
            if (handlers.onTabChange) {
                handlers.onTabChange(tabId);
            }
        });
    });

    // Set selection
    document.getElementById('setSelect').addEventListener('change', (e) => {
        if (handlers.onSetChange) {
            handlers.onSetChange(e.target.value);
        }
    });

    // Search functionality
    document.getElementById('cardNameInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('searchCardBtn').click();
        }
    });

    document.getElementById('searchCardBtn').addEventListener('click', () => {
        if (handlers.onSearch) {
            handlers.onSearch();
        }
    });

    // Modal controls
    document.getElementById('closeSelectionModalBtn').addEventListener('click', () => {
        document.getElementById('cardSelectionModal').classList.add('hidden');
    });

    document.getElementById('closeDetailsModalBtn').addEventListener('click', () => {
        document.getElementById('cardDetailsModal').classList.add('hidden');
    });

    // JSON export/import
    document.getElementById('saveJsonBtn').addEventListener('click', () => {
        if (handlers.onSaveJson) {
            handlers.onSaveJson();
        }
    });

    document.getElementById('loadJsonFile').addEventListener('change', (e) => {
        if (handlers.onLoadJson) {
            handlers.onLoadJson(e.target.files[0]);
        }
    });

    // Deck operations
    document.getElementById('saveDecksBtn').addEventListener('click', () => {
        if (handlers.onSaveDecks) {
            handlers.onSaveDecks();
        }
    });

    document.getElementById('loadDecksFile').addEventListener('change', (e) => {
        if (handlers.onLoadDecks) {
            handlers.onLoadDecks(e.target.files[0]);
        }
    });

    document.getElementById('createDeckBtn').addEventListener('click', () => {
        if (handlers.onCreateDeck) {
            handlers.onCreateDeck();
        }
    });

    document.getElementById('backToDecksBtn').addEventListener('click', () => {
        if (handlers.onBackToDecks) {
            handlers.onBackToDecks();
        }
    });

    // Collection search and filtering
    document.getElementById('collectionSearchInput').addEventListener('input', () => {
        if (handlers.onCollectionSearch) {
            handlers.onCollectionSearch();
        }
    });

    // Pagination
    document.getElementById('nextPageBtn').addEventListener('click', () => {
        if (handlers.onNextPage) {
            handlers.onNextPage();
        }
    });

    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (handlers.onPrevPage) {
            handlers.onPrevPage();
        }
    });

    document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
        if (handlers.onPageSizeChange) {
            handlers.onPageSizeChange(parseInt(e.target.value, 10));
        }
    });

    // Collection filtering
    document.getElementById('collectionSearchBtn').addEventListener('click', () => {
        if (handlers.onCollectionFilter) {
            handlers.onCollectionFilter();
        }
    });

    document.getElementById('collectionFilterInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('collectionSearchBtn').click();
        }
    });

    document.getElementById('collectionResetBtn').addEventListener('click', () => {
        if (handlers.onCollectionReset) {
            handlers.onCollectionReset();
        }
    });

    // Sorting
    document.querySelectorAll('#resultsTable .sortable').forEach(header => {
        header.addEventListener('click', () => {
            if (handlers.onSort) {
                handlers.onSort(header.dataset.sort);
            }
        });
    });

    // Color filters
    document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const selectedColor = e.target.dataset.color;
            
            if (selectedColor === 'all' && e.target.checked) {
                const newFilters = clearAllFilters((defaultFilters) => {
                    document.querySelectorAll('.color-filter-label input[type="checkbox"]').forEach(c => {
                        c.checked = true;
                        c.closest('label').classList.add('checked');
                    });
                });
                state.setActiveFilters(newFilters);
            } else if (selectedColor === 'all' && !e.target.checked) {
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

                if (state.activeFilters.length === 0) {
                    document.getElementById('filter-all').checked = true;
                    document.getElementById('filter-all').closest('label').classList.add('checked');
                    state.activeFilters.push('all');
                }
            }
            
            if (handlers.onColorFilterChange) {
                handlers.onColorFilterChange();
            }
        });
    });

    // Language selection
    document.getElementById('lang-select').addEventListener('change', (e) => {
        if (handlers.onLanguageChange) {
            handlers.onLanguageChange(e.target.value);
        }
    });
    
    // Collection management
    document.getElementById('createCollectionBtn').addEventListener('click', () => {
        if (handlers.onCreateCollection) {
            handlers.onCreateCollection();
        }
    });

    document.getElementById('deleteCollectionBtn').addEventListener('click', () => {
        if (handlers.onDeleteCollection) {
            handlers.onDeleteCollection();
        }
    });

    document.getElementById('collectionSelect').addEventListener('change', (e) => {
        if (handlers.onCollectionChange) {
            handlers.onCollectionChange(e);
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (handlers.onLogout) {
            handlers.onLogout();
        }
    });
}