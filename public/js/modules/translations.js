/**
 * Translations module for managing multi-language support
 * Contains all text content for Italian and English languages
 */

export const translations = {
  ita: {
    title: 'MTG Friendly Catalog',
    apiStatusTitle: 'Stato API',
    apiStatusReady: 'Pronto per cercare carte',
    apiStatusConnecting: 'Connessione in corso. In attesa di risposta da Scryfall.',
    apiStatusError: 'Errore di connessione con l\'API Scryfall. Riprova a ricaricare la pagina.',
    apiStatusBtn: 'API Ok',
    processing: 'Elaborazione...',
    tabSearch: 'Cerca Carta',
    tabDecks: 'Mazzi',
    tabExplore: 'Esplora Espansioni',
    tabCsv: 'Carica CSV',
    tabData: 'Gestisci Dati',
    exploreTitle: 'Esplora Espansioni',
    selectSetLabel: 'Seleziona un\'espansione:',
    decksTitle: 'I Miei Mazzi',
    newDeckPlaceholder: 'Inserisci il nome del nuovo mazzo...',
    createDeckBtn: 'Crea Mazzo',
    myDeckTitle: 'Il Mio Mazzo',
    collectionTitle: 'La Mia Collezione',
    collectionFilterPlaceholder: 'Cerca per nome nella collezione...',
    backBtn: 'Indietro',
    searchCardTitle: 'Cerca e Aggiungi una singola carta',
    searchPlaceholder: 'Inserisci il nome della carta o parla...',
    voiceSearchTooltip: 'Riconoscimento vocale supportato solo su alcuni browser',
    searchAddBtn: 'Cerca & Aggiungi',
    'searchAddBtn-loading': 'Caricamento...',
    'searchAddBtn-completed': 'Cerca & Aggiungi',
    csvTitle: 'Carica CSV con elenco carte',
    processCsvBtn: 'Elabora CSV',
    'processCsvBtn-loading': 'Elaborazione...',
    'processCsvBtn-completed': 'Elabora CSV',
    dataTitle: 'Gestisci Dati Applicazione',
    collectionDataTitle: 'Gestisci La mia Collezione',
    decksDataTitle: 'Gestisci i Mazzi',
    saveJsonBtn: 'Salva Collezione',
    loadJsonLabel: 'Carica Collezione',
    saveDecksBtn: 'Salva Mazzi',
    loadDecksLabel: 'Importa Mazzi',
    resultsTitle: 'Collezione',
    totalValueLabel: 'Valore Totale:',
    filterAll: 'Tutti',
    filterWhite: 'Bianco',
    filterBlue: 'Blu',
    filterBlack: 'Nero',
    filterRed: 'Rosso',
    filterGreen: 'Verde',
    filterMulti: 'Multicolore',
    filterColorless: 'Incolore/Terre',
    tableColNum: '#',
    tableColImage: 'Immagine',
    tableColNameIta: 'Nome ITA',
    tableColNameEng: 'Nome ENG',
    tableColColor: 'Colore',
    tableColSet: 'Set',
    tableColPriceEur: 'Prezzo EUR',
    tableColPriceUsd: 'USD Price',
    tableColDetails: 'Dettagli',
    tableColAction: 'Elimina',
    modalNoCardName: 'Inserisci un nome di carta per la ricerca.',
    modalNotFound: 'Nessun risultato trovato per la carta: ',
    modalCsvComplete: 'Elaborazione CSV completata.',
    modalNoCardsToSave: 'La tabella dei risultati è vuota. Aggiungi delle carte prima di salvare.',
    modalJsonSaved: 'Dati salvati con successo come mtg_prices_data.json!',
    modalInvalidJson: 'Il file JSON non è in un formato valido (non è un array di carte).',
    modalJsonLoadError: 'Errore nel caricamento del file JSON. Assicurati che il formato sia corretto.',
    modalCardsLoaded: 'Caricate CARD_COUNT carte dal file JSON.',
    modalRemoveCard: 'Sei sicuro di voler rimuovere questa carta?',
    modalApiOk: 'Connessione API Scryfall riuscita. Pronto all\'uso.',
    modalApiError: 'Errore di connessione con l\'API Scryfall. Riprova a ricaricare la pagina.',
    modalApiConnecting: 'Connessione in corso. In attesa di risposta da Scryfall.',
    modalSpeechError: 'Errore durante il riconoscimento vocale. Riprova.',
    modalNoImage: 'Nessuna immagine disponibile.',
    modalNoOracleText: 'Nessun testo d\'oracolo disponibile.',
    okBtn: 'OK',
    cancelBtn: 'Annulla',
    addToCollectionBtn: 'Aggiungi alla Collezione',
    selectionModalTitle: 'Seleziona una carta',
    removeBtn: 'Rimuovi',
    modalDecksSaved: 'Tutti i mazzi sono stati salvati con successo in mtg_decks_data.json!',
    modalNoDecksToSave: 'Non hai mazzi da salvare.',
    modalDecksLoaded: 'Caricati DECK_COUNT mazzi dal file JSON.',
    modalInvalidDecksJson: 'Il file JSON dei mazzi non è valido o è corrotto.',
    modalRemoveFromDecks: 'Questa carta è presente nel mazzo/i: DECK_NAMES. Vuoi rimuoverla anche da lì?',
    deleteOnlyFromCollectionBtn: 'Solo dalla Collezione',
    deleteAllBtn: 'Sì, da tutto',
    prevPageBtn: '&lt; Precedente',
    nextPageBtn: 'Successivo &gt;',
    pageInfoText: 'Pagina {currentPage}',
    pageSizeLabel: 'Mostra:',
    collectionSearchBtn: 'Cerca',
    collectionResetBtn: 'Reset'
  },
  eng: {
    title: 'MTG Friendly Catalog',
    apiStatusTitle: 'API Status',
    apiStatusReady: 'Ready to search for cards',
    apiStatusConnecting: 'Connecting... Waiting for Scryfall response.',
    apiStatusError: 'Connection error with Scryfall API. Please reload the page.',
    apiStatusBtn: 'API Action',
    processing: 'Processing...',
    tabSearch: 'Search Card',
    tabDecks: 'Decks',
    tabExplore: 'Explore Sets',
    tabCsv: 'Load CSV',
    tabData: 'Manage Data',
    exploreTitle: 'Explore Sets',
    selectSetLabel: 'Select a set:',
    decksTitle: 'My Decks',
    newDeckPlaceholder: 'Enter new deck name...',
    createDeckBtn: 'Create Deck',
    myDeckTitle: 'My Deck',
    collectionTitle: 'My Collection',
    collectionFilterPlaceholder: 'Search in your collection...',
    backBtn: 'Back',
    searchCardTitle: 'Search & Add a single card',
    searchPlaceholder: 'Enter card name or speak...',
    voiceSearchTooltip: 'Voice recognition is supported only on some browsers',
    searchAddBtn: 'Search & Add',
    'searchAddBtn-loading': 'Searching...',
    'searchAddBtn-completed': 'Search & Add',
    csvTitle: 'Load CSV with card list',
    processCsvBtn: 'Process CSV',
    'processCsvBtn-loading': 'Processing...',
    'processCsvBtn-completed': 'Process CSV',
    dataTitle: 'Manage App Data',
    collectionDataTitle: 'Manage My Collection',
    decksDataTitle: 'Manage Decks',
    saveJsonBtn: 'Save Collection',
    loadJsonLabel: 'Load Collection',
    saveDecksBtn: 'Save Decks',
    loadDecksLabel: 'Import Decks',
    resultsTitle: 'Collection',
    totalValueLabel: 'Total Value:',
    filterAll: 'All',
    filterWhite: 'White',
    filterBlue: 'Blue',
    filterBlack: 'Black',
    filterRed: 'Red',
    filterGreen: 'Green',
    filterMulti: 'Multicolored',
    filterColorless: 'Colorless/Lands',
    tableColNum: '#',
    tableColImage: 'Image',
    tableColNameIta: 'ITA Name',
    tableColNameEng: 'ENG Name',
    tableColColor: 'Color',
    tableColSet: 'Set',
    tableColPriceEur: 'EUR Price',
    tableColPriceUsd: 'USD Price',
    tableColDetails: 'Details',
    tableColAction: 'Delete',
    modalNoCardName: 'Please enter a card name to search.',
    modalNotFound: 'No results found for card: ',
    modalCsvComplete: 'CSV processing complete.',
    modalNoCardsToSave: 'The results table is empty. Add some cards before saving.',
    modalJsonSaved: 'Data successfully saved as mtg_prices_data.json!',
    modalInvalidJson: 'The JSON file is not in a valid format (not an array of cards).',
    modalJsonLoadError: 'Error loading the JSON file. Ensure the format is correct.',
    modalCardsLoaded: 'Loaded CARD_COUNT cards from the JSON file.',
    modalRemoveCard: 'Are you sure you want to remove this card?',
    modalApiOk: 'Scryfall API connection successful. Ready to use.',
    modalApiError: 'Connection error with Scryfall API. Please try reloading the page.',
    modalApiConnecting: 'Connecting... Waiting for Scryfall response.',
    modalSpeechError: 'Error during voice recognition. Please try again.',
    modalNoImage: 'No image available.',
    modalNoOracleText: 'No oracle text available.',
    okBtn: 'OK',
    cancelBtn: 'Cancel',
    addToCollectionBtn: 'Add to Collection',
    selectionModalTitle: 'Select a card',
    removeBtn: 'Remove',
    modalDecksSaved: 'All decks were successfully saved to mtg_decks_data.json!',
    modalNoDecksToSave: 'You have no decks to save.',
    modalDecksLoaded: 'Loaded DECK_COUNT decks from the JSON file.',
    modalInvalidDecksJson: 'The decks JSON file is invalid or corrupted.',
    modalRemoveFromDecks: 'This card is in the following deck(s): DECK_NAMES. Do you want to remove it from there as well?',
    deleteOnlyFromCollectionBtn: 'Collection Only',
    deleteAllBtn: 'Yes, from Everywhere',
    prevPageBtn: '&lt; Previous',
    nextPageBtn: 'Next &gt;',
    pageInfoText: 'Page {currentPage}',
    pageSizeLabel: 'Show:',
    collectionSearchBtn: 'Search',
    collectionResetBtn: 'Reset'
  }
};

/**
 * Get translation for a specific key and language
 * @param {string} key - The translation key
 * @param {string} lang - The language code ('ita' or 'eng')
 * @param {Object} replacements - Optional object with key-value pairs for string replacements
 * @returns {string} The translated text
 */
export function getTranslation(key, lang = 'ita', replacements = {}) {
  const translation = translations[lang]?.[key] || translations.ita[key] || key;
  
  // Apply replacements if provided
  let result = translation;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replace(placeholder, value);
  }
  
  return result;
}

/**
 * Get all available languages
 * @returns {string[]} Array of language codes
 */
export function getAvailableLanguages() {
  return Object.keys(translations);
}

/**
 * Check if a language is supported
 * @param {string} lang - The language code to check
 * @returns {boolean} True if the language is supported
 */
export function isLanguageSupported(lang) {
  return lang in translations;
}
