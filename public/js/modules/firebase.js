/**
 * Firebase module for authentication, Firestore operations, and user management
 * Handles all database operations, authentication, and real-time listeners
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, collection, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, query, getDocs, limit, startAfter, orderBy, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getConfig, validateConfig } from './config.js';
import { getSortableField } from './searchFilter.js';

setLogLevel('debug');

// Global Firebase instances
let app;
let db;
let auth;
let analytics;

// Get configuration from environment
const config = getConfig();
const firebaseConfig = config.firebase;
const appId = config.app.appId;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

/**
 * Initialize Firebase app and services
 * @returns {Object} Firebase instances { app, db, auth, analytics }
 */
export function initializeFirebase() {
  // Validate configuration
  if (!validateConfig(config)) {
    console.error("Invalid Firebase configuration. Please check your environment variables.");
    return null;
  }
  
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    analytics = getAnalytics(app);
    
    console.log("Firebase initialized successfully");
    return { app, db, auth, analytics };
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return null;
  }
}

/**
 * Authenticate user with Firebase
 * @param {Function} onAuthStateChange - Callback for auth state changes
 */
export function authenticateUser(onAuthStateChange) {
  if (!auth) {
    console.warn("Firebase auth not initialized");
    return;
  }

  // Execute authentication
  if (initialAuthToken) {
    signInWithCustomToken(auth, initialAuthToken).catch(error => {
      console.error("Error signing in with custom token:", error);
      signInAnonymously(auth); // Fallback to anonymous if token is invalid
    });
  } else {
    signInAnonymously(auth);
  }
  
  // Listen for authentication state changes
  onAuthStateChanged(auth, onAuthStateChange);
}

/**
 * Add a card to the user's collection
 * @param {string} userId - User ID
 * @param {Object} cardData - Card data to save
 * @returns {Promise<boolean>} Success status
 */
export async function addCardToCollection(userId, cardData) {
  if (!db || !userId) {
    console.error("Firebase is not initialized or user is not authenticated.");
    return false;
  }
  
  const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/collection`);
  
  try {
    const cardToSave = { ...cardData };
    delete cardToSave.cardPrints; // Remove the large array to avoid exceeding size limit
    
    await addDoc(collectionRef, cardToSave);
    return true;
  } catch (error) {
    console.error("Error adding card to collection:", error);
    return false;
  }
}

/**
 * Update a card in the user's collection
 * @param {string} userId - User ID
 * @param {string} cardId - Card document ID
 * @param {Object} cardData - Updated card data
 * @returns {Promise<boolean>} Success status
 */
export async function updateCardInCollection(userId, cardId, cardData) {
  if (!db || !userId) {
    console.error("Firebase is not initialized or user is not authenticated.");
    return false;
  }
  
  try {
    const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/collection`, cardId);
    await setDoc(cardDocRef, cardData);
    return true;
  } catch (error) {
    console.error("Error updating card in collection:", error);
    return false;
  }
}

/**
 * Remove a card from the user's collection
 * @param {string} userId - User ID
 * @param {string} cardId - Card document ID
 * @returns {Promise<boolean>} Success status
 */
export async function removeCardFromCollection(userId, cardId) {
  if (!db || !userId) {
    console.error("Firebase is not initialized or user is not authenticated.");
    return false;
  }
  
  try {
    const cardDocRef = doc(db, `artifacts/${appId}/users/${userId}/collection`, cardId);
    await deleteDoc(cardDocRef);
    return true;
  } catch (error) {
    console.error("Error removing card from collection:", error);
    return false;
  }
}

/**
 * Build base collection query with filters
 * @param {string} userId - User ID
 * @param {string} searchTerm - Search term for filtering
 * @returns {Object|null} Firestore query or null
 */
export function buildBaseCollectionQuery(userId, searchTerm = '', sortColumn = null, sortDirection = 'asc') {
  if (!db || !userId) return null;
  
  let q = collection(db, `artifacts/${appId}/users/${userId}/collection`);
  let baseConstraints = [];

  if (searchTerm) {
    const capitalizedSearchTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
    baseConstraints.push(orderBy('name'));
    baseConstraints.push(where('name', '>=', capitalizedSearchTerm));
    baseConstraints.push(where('name', '<=', capitalizedSearchTerm + '\uf8ff'));
  } else if (sortColumn) {
    const field = getSortableField(sortColumn);
    baseConstraints.push(orderBy(field, sortDirection));
  } else {
    baseConstraints.push(orderBy('name'));
  }

  return query(q, ...baseConstraints);
}

/**
 * Fetch and render collection page with pagination
 * @param {string} userId - User ID
 * @param {string} direction - 'first', 'next', or 'prev'
 * @param {number} cardsPerPage - Number of cards per page
 * @param {Array} pageFirstDocs - Array of first documents for each page
 * @param {Object} lastVisible - Last visible document for pagination
 * @returns {Promise<Object>} Page data with cards and pagination info
 */
export async function fetchCollectionPage(userId, direction = 'first', cardsPerPage = 50, pageFirstDocs = [null], lastVisible = null, searchTerm = '', sortColumn = null, sortDirection = 'asc') {
  if (!db) return { cards: [], hasMore: false, lastVisible: null };
  
  let baseQuery = buildBaseCollectionQuery(userId, searchTerm, sortColumn, sortDirection);
  let pageQuery;

  if (direction === 'first') {
    pageQuery = query(baseQuery, limit(cardsPerPage));
  } else if (direction === 'next' && lastVisible) {
    pageQuery = query(baseQuery, startAfter(lastVisible), limit(cardsPerPage));
  } else if (direction === 'prev' && pageFirstDocs.length > 1) {
    const prevPageFirstDoc = pageFirstDocs[pageFirstDocs.length - 2];
    if (prevPageFirstDoc) {
      pageQuery = query(baseQuery, startAfter(prevPageFirstDoc), limit(cardsPerPage));
    } else {
      pageQuery = query(baseQuery, limit(cardsPerPage));
    }
  } else {
    pageQuery = query(baseQuery, limit(cardsPerPage));
  }

  try {
    const snapshot = await getDocs(pageQuery);
    const cards = snapshot.docs.map(doc => ({ id: doc.id, result: doc.data() }));
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === cardsPerPage;

    return {
      cards,
      hasMore,
      lastVisible: newLastVisible,
      firstVisible: snapshot.docs[0] || null
    };
  } catch (error) {
    console.error("Error fetching collection page:", error);
    return { cards: [], hasMore: false, lastVisible: null };
  }
}

/**
 * Get all collection cards (for deck editor)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of collection cards
 */
export async function getAllCollectionCards(userId) {
  if (!db || !userId) return [];
  
  try {
    const collectionSnapshot = await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/collection`)));
    const cards = collectionSnapshot.docs.map(d => ({ id: d.id, result: d.data() }));
    cards.sort((a, b) => (a.result.name || '').localeCompare(b.result.name || ''));
    return cards;
  } catch (error) {
    console.error("Error fetching all collection cards:", error);
    return [];
  }
}

/**
 * Set up real-time listener for decks
 * @param {string} userId - User ID
 * @param {Function} onDecksChange - Callback for deck changes
 * @returns {Function} Unsubscribe function
 */
export function setupDecksListener(userId, onDecksChange) {
  if (!db || !userId) return () => {};
  
  const decksRef = collection(db, `artifacts/${appId}/users/${userId}/decks`);
  
  return onSnapshot(decksRef, (snapshot) => {
    const decksData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onDecksChange(decksData);
  });
}

/**
 * Add a new deck
 * @param {string} userId - User ID
 * @param {string} name - Deck name
 * @returns {Promise<boolean>} Success status
 */
export async function addDeck(userId, name) {
  if (!db || !userId) return false;
  
  try {
    const decksRef = collection(db, `artifacts/${appId}/users/${userId}/decks`);
    const newDeck = {
      name,
      cards: []
    };
    await addDoc(decksRef, newDeck);
    return true;
  } catch (error) {
    console.error("Error adding deck:", error);
    return false;
  }
}

/**
 * Update a deck
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {Object} data - Updated deck data
 * @returns {Promise<boolean>} Success status
 */
export async function updateDeck(userId, deckId, data) {
  if (!db || !userId) return false;
  
  try {
    const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deckId);
    await updateDoc(deckDocRef, data);
    return true;
  } catch (error) {
    console.error("Error updating deck:", error);
    return false;
  }
}

/**
 * Delete a deck
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteDeck(userId, deckId) {
  if (!db || !userId) return false;
  
  try {
    const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deckId);
    await deleteDoc(deckDocRef);
    return true;
  } catch (error) {
    console.error("Error deleting deck:", error);
    return false;
  }
}

/**
 * Add a card to a deck
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {Object} cardData - Card data
 * @param {Array} currentCards - Current deck cards
 * @returns {Promise<boolean>} Success status
 */
export async function addCardToDeck(userId, deckId, cardData, currentCards = []) {
  if (!db || !userId) return false;

  try {
    const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deckId);
    // Assicura che currentCards sia sempre un array
    const existingCards = Array.isArray(currentCards) ? currentCards : [];
    const updatedCards = [...existingCards, cardData];
    await updateDoc(deckDocRef, { cards: updatedCards });
    return true;
  } catch (error) {
    console.error("Error adding card to deck:", error);
    return false;
  }
}

/**
 * Remove a card from a deck
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {string} cardId - Card ID to remove
 * @param {Array} currentCards - Current deck cards
 * @returns {Promise<boolean>} Success status
 */
export async function removeCardFromDeck(userId, deckId, cardId, currentCards = []) {
  if (!db || !userId) return false;
  
  try {
    const deckDocRef = doc(db, `artifacts/${appId}/users/${userId}/decks`, deckId);
    const cardIndex = currentCards.findIndex(card => card.id === cardId);
    if (cardIndex > -1) {
      const updatedCards = [...currentCards];
      updatedCards.splice(cardIndex, 1);
      await updateDoc(deckDocRef, { cards: updatedCards });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error removing card from deck:", error);
    return false;
  }
}

/**
 * Remove a card from all decks by oracle ID
 * @param {string} userId - User ID
 * @param {string} oracleId - Oracle ID of the card
 * @returns {Promise<number>} Number of decks updated
 */
export async function removeCardFromAllDecksByOracleId(userId, oracleId) {
  if (!db || !userId || !oracleId) return 0;

  try {
    const decksRef = collection(db, `artifacts/${appId}/users/${userId}/decks`);
    const decksSnapshot = await getDocs(decksRef);
    const updatePromises = [];

    decksSnapshot.forEach(deckDoc => {
      const deckData = deckDoc.data();
      if (deckData.cards && Array.isArray(deckData.cards)) {
        const originalCardCount = deckData.cards.length;
        const filteredCards = deckData.cards.filter(card => card.oracle_id !== oracleId);
        
        if (filteredCards.length !== originalCardCount) {
          updatePromises.push(updateDoc(deckDoc.ref, { cards: filteredCards }));
        }
      }
    });

    await Promise.all(updatePromises);
    return updatePromises.length;
  } catch (error) {
    console.error("Error removing card from all decks:", error);
    return 0;
  }
}

/**
 * Export all decks to JSON
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of deck data
 */
export async function exportDecks(userId) {
  if (!db || !userId) return [];
  
  try {
    const decksRef = collection(db, `artifacts/${appId}/users/${userId}/decks`);
    const decksSnapshot = await getDocs(decksRef);
    return decksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error exporting decks:", error);
    return [];
  }
}

/**
 * Import decks from JSON data
 * @param {string} userId - User ID
 * @param {Array} decksData - Array of deck data
 * @returns {Promise<boolean>} Success status
 */
export async function importDecks(userId, decksData) {
  if (!db || !userId || !Array.isArray(decksData)) return false;
  
  try {
    const decksRef = collection(db, `artifacts/${appId}/users/${userId}/decks`);

    // Clear existing decks
    const existingDecksSnapshot = await getDocs(decksRef);
    const deletePromises = existingDecksSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(deletePromises);

    // Add new decks
    const addPromises = decksData.map(deckData => {
      const { id, ...deckToSave } = deckData;
      return addDoc(decksRef, deckToSave);
    });
    await Promise.all(addPromises);

    return true;
  } catch (error) {
    console.error("Error importing decks:", error);
    return false;
  }
}

/**
 * Get Firebase instances
 * @returns {Object} Firebase instances
 */
export function getFirebaseInstances() {
  return { app, db, auth, analytics };
}

/**
 * Check if Firebase is initialized
 * @returns {boolean} True if Firebase is initialized
 */
export function isFirebaseInitialized() {
  return !!(app && db && auth);
}

/**
 * Import collection from JSON data
 * @param {string} userId - User ID
 * @param {Array} collectionData - Array of card data
 * @returns {Promise<boolean>} Success status
 */
export async function importCollection(userId, collectionData) {
  if (!db || !userId || !Array.isArray(collectionData)) return false;
  
  try {
    const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/collection`);

    // Clear existing collection
    const existingDocsSnapshot = await getDocs(collectionRef);
    const deletePromises = existingDocsSnapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(deletePromises);

    // Add new cards from the imported file
    const addPromises = collectionData.map(cardObject => {
      // The file saves the card data inside a "result" object
      if (cardObject.result) {
        return addDoc(collectionRef, cardObject.result);
      }
      return null;
    }).filter(p => p); // Filter out any null promises
    await Promise.all(addPromises);

    return true;
  } catch (error) {
    console.error("Error importing collection:", error);
    return false;
  }
}

// Re-export Firestore functions for use in other modules
export { 
  doc, 
  collection, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  getDocs, 
  limit, 
  startAfter, 
  orderBy, 
  where,
  onSnapshot
};
