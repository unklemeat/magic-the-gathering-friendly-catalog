export let allSets = [];
export let searchResults = [];
export let activeFilters = ['all', 'W', 'U', 'B', 'R', 'G', 'multi', 'incolor'];
export let activeLang = 'ita';
export let currentCardDetails = null;

// Firebase & Firestore setup
export let db;
export let auth;
export let userId;
export let decks = [];
export let currentDeck = null;
export let currentDeckId = null;
export let collections = [];
export let currentCollectionId = null;
export let currentCollectionName = '';

// Pagination state
export let lastVisible = null;
export let firstVisible = null;
export let pageFirstDocs = [null]; // Start with null for the first page
export let currentPage = 1;
export let cardsPerPage = 50;

// Table sorting variables
export let currentSort = { column: null, direction: 'asc' };

// --- Setters for state variables ---

export function setAllSets(value) {
    allSets = value;
}

export function setSearchResults(value) {
    searchResults = value;
}

export function setActiveLang(value) {
    activeLang = value;
}

export function setDb(value) {
    db = value;
}

export function setAuth(value) {
    auth = value;
}

export function setUserId(value) {
    userId = value;
}

export function setDecks(value) {
    decks = value;
}

export function setCurrentDeck(value) {
    currentDeck = value;
}

export function setCurrentDeckId(value) {
    currentDeckId = value;
}

export function setLastVisible(value) {
    lastVisible = value;
}

export function setFirstVisible(value) {
    firstVisible = value;
}

export function setPageFirstDocs(value) {
    pageFirstDocs = value;
}

export function setCurrentPage(value) {
    currentPage = value;
}

export function setCardsPerPage(value) {
    cardsPerPage = value;
}

export function setCurrentSort(value) {
    currentSort = value;
}

export function setActiveFilters(value) {
    activeFilters = value;
}

export function setCurrentCardDetails(value) {
    currentCardDetails = value;
}

export function setCollections(value) {
    collections = value;
}

export function setCurrentCollectionId(value) {
    currentCollectionId = value;
}

export function setCurrentCollectionName(value) {
    currentCollectionName = value;
}