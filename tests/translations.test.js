/**
 * Tests for the translations module
 */

// Since we're testing browser modules, we need to mock the module system
// For now, we'll test the functions directly by importing them

const { getTranslation, getAvailableLanguages, isLanguageSupported } = require('../public/js/modules/translations.js');

describe('Translations Module', () => {
  
  describe('getTranslation', () => {
    test('should return Italian translation by default', () => {
      const result = getTranslation('title');
      expect(result).toBe('MTG Friendly Catalog');
    });

    test('should return English translation when specified', () => {
      const result = getTranslation('title', 'eng');
      expect(result).toBe('MTG Friendly Catalog');
    });

    test('should return key if translation not found', () => {
      const result = getTranslation('nonexistent_key');
      expect(result).toBe('nonexistent_key');
    });

    test('should apply replacements correctly', () => {
      const result = getTranslation('modalCardsLoaded', 'ita', { 'CARD_COUNT': '5' });
      expect(result).toBe('Caricate 5 carte dal file JSON.');
    });

    test('should handle multiple replacements', () => {
      const result = getTranslation('modalRemoveFromDecks', 'eng', { 
        'DECK_COUNT': '3',
        'DECK_NAMES': 'Deck1, Deck2, Deck3' 
      });
      expect(result).toBe('This card is in the following deck(s): Deck1, Deck2, Deck3. Do you want to remove it from there as well?');
    });
  });

  describe('getAvailableLanguages', () => {
    test('should return array of available languages', () => {
      const languages = getAvailableLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages).toContain('ita');
      expect(languages).toContain('eng');
      expect(languages.length).toBe(2);
    });
  });

  describe('isLanguageSupported', () => {
    test('should return true for supported languages', () => {
      expect(isLanguageSupported('ita')).toBe(true);
      expect(isLanguageSupported('eng')).toBe(true);
    });

    test('should return false for unsupported languages', () => {
      expect(isLanguageSupported('fr')).toBe(false);
      expect(isLanguageSupported('es')).toBe(false);
      expect(isLanguageSupported('')).toBe(false);
    });
  });

  describe('Translation completeness', () => {
    test('should have same keys in both languages', () => {
      const { translations } = require('../public/js/modules/translations.js');
      const itaKeys = Object.keys(translations.ita);
      const engKeys = Object.keys(translations.eng);
      
      expect(itaKeys.length).toBe(engKeys.length);
      expect(itaKeys.sort()).toEqual(engKeys.sort());
    });
  });
});
