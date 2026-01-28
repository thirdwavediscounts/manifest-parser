import { describe, it, expect } from 'vitest';
import {
  abbreviateCommonWords,
  truncateAtWordBoundary,
  optimizeMultiCategory,
  smartTruncateTitle,
} from '../../src/utils/filename-utils';

describe('filename-utils', () => {
  describe('abbreviateCommonWords', () => {
    it('abbreviates "Accessories" to "Acc"', () => {
      expect(abbreviateCommonWords('PC Gaming Accessories')).toBe('PC Gaming Acc');
    });

    it('abbreviates "Electronics" to "Elec"', () => {
      expect(abbreviateCommonWords('Electronics & Appliances')).toBe('Elec & Appl');
    });

    it('abbreviates "Household" to "HH"', () => {
      expect(abbreviateCommonWords('Mixed Household Items')).toBe('Mixed HH Items');
    });

    it('handles multiple abbreviations in one string', () => {
      expect(abbreviateCommonWords('Computer Hardware and Software')).toBe('Comp HW and SW');
    });

    it('preserves case for non-abbreviated words', () => {
      expect(abbreviateCommonWords('Gaming Equipment Store')).toBe('Gaming Equip Store');
    });

    it('handles empty string', () => {
      expect(abbreviateCommonWords('')).toBe('');
    });

    it('handles string with no abbreviatable words', () => {
      expect(abbreviateCommonWords('Random Text Here')).toBe('Random Text Here');
    });

    it('is case-insensitive for matching', () => {
      expect(abbreviateCommonWords('ELECTRONICS items')).toBe('Elec items');
    });

    it('abbreviates all common words', () => {
      // Test all abbreviations
      expect(abbreviateCommonWords('Accessories')).toBe('Acc');
      expect(abbreviateCommonWords('Electronics')).toBe('Elec');
      expect(abbreviateCommonWords('Appliances')).toBe('Appl');
      expect(abbreviateCommonWords('Computer')).toBe('Comp');
      expect(abbreviateCommonWords('Technology')).toBe('Tech');
      expect(abbreviateCommonWords('Hardware')).toBe('HW');
      expect(abbreviateCommonWords('Software')).toBe('SW');
      expect(abbreviateCommonWords('Furniture')).toBe('Furn');
      expect(abbreviateCommonWords('Equipment')).toBe('Equip');
      expect(abbreviateCommonWords('Warehouse')).toBe('WH');
      expect(abbreviateCommonWords('Household')).toBe('HH');
    });
  });

  describe('truncateAtWordBoundary', () => {
    it('truncates at dash boundary', () => {
      expect(truncateAtWordBoundary('Electronics-And-More', 15)).toBe('Electronics-And');
    });

    it('never cuts mid-word', () => {
      // Should not return "Electronics-An"
      expect(truncateAtWordBoundary('Electronics-And-More', 14)).toBe('Electronics');
    });

    it('returns full string if within limit', () => {
      expect(truncateAtWordBoundary('Short-Title', 50)).toBe('Short-Title');
    });

    it('handles single word longer than maxLen', () => {
      expect(truncateAtWordBoundary('VeryLongSingleWord', 10)).toBe('VeryLongSi');
    });

    it('handles empty string', () => {
      expect(truncateAtWordBoundary('', 10)).toBe('');
    });

    it('handles maxLen of 0', () => {
      expect(truncateAtWordBoundary('Test', 0)).toBe('');
    });

    it('respects exact maxLen boundary on word end', () => {
      // "PC-Gaming" is 9 chars
      expect(truncateAtWordBoundary('PC-Gaming-Accessories', 9)).toBe('PC-Gaming');
    });

    it('handles multiple dashes', () => {
      expect(truncateAtWordBoundary('A-B-C-D-E-F', 7)).toBe('A-B-C-D');
    });
  });

  describe('optimizeMultiCategory', () => {
    it('deduplicates repeated category words with &', () => {
      expect(optimizeMultiCategory('PC Gaming Accessories & Tablet Accessories'))
        .toBe('PC Gaming & Tablet Acc');
    });

    it('handles Electronics duplication', () => {
      expect(optimizeMultiCategory('Kitchen Electronics & Office Electronics'))
        .toBe('Kitchen & Office Elec');
    });

    it('handles no duplication', () => {
      expect(optimizeMultiCategory('PC Gaming & Tablet Cases'))
        .toBe('PC Gaming & Tablet Cases');
    });

    it('handles empty string', () => {
      expect(optimizeMultiCategory('')).toBe('');
    });

    it('handles string without &', () => {
      expect(optimizeMultiCategory('PC Gaming Accessories'))
        .toBe('PC Gaming Accessories');
    });

    it('handles multiple & with same duplicated word', () => {
      expect(optimizeMultiCategory('Home Furniture & Office Furniture & Patio Furniture'))
        .toBe('Home & Office & Patio Furn');
    });
  });

  describe('smartTruncateTitle', () => {
    it('combines all optimizations', () => {
      const result = smartTruncateTitle('PC Gaming Accessories & Tablet Accessories', 30);
      expect(result).toBe('PC-Gaming-&-Tablet-Acc');
      expect(result.length).toBeLessThanOrEqual(30);
    });

    it('always returns string <= maxLen', () => {
      const longTitle = 'Electronics Accessories Hardware Software Equipment Furniture Warehouse';
      const result = smartTruncateTitle(longTitle, 25);
      expect(result.length).toBeLessThanOrEqual(25);
    });

    it('handles empty string', () => {
      expect(smartTruncateTitle('', 50)).toBe('');
    });

    it('handles very short maxLen', () => {
      const result = smartTruncateTitle('PC Gaming Accessories', 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('converts spaces to dashes for filename compatibility', () => {
      const result = smartTruncateTitle('PC Gaming Items', 50);
      expect(result).toBe('PC-Gaming-Items');
    });

    it('abbreviates before truncating for optimal length', () => {
      // "PC Gaming Accessories" -> "PC Gaming Acc" -> "PC-Gaming-Acc" (13 chars)
      const result = smartTruncateTitle('PC Gaming Accessories', 20);
      expect(result).toBe('PC-Gaming-Acc');
    });

    it('preserves & in filename', () => {
      const result = smartTruncateTitle('A & B', 10);
      expect(result).toBe('A-&-B');
    });

    it('handles title that needs all three transformations', () => {
      // Multi-category optimization + abbreviation + truncation
      const input = 'Gaming Electronics & Office Electronics & Home Electronics';
      const result = smartTruncateTitle(input, 25);
      expect(result.length).toBeLessThanOrEqual(25);
      // Should deduplicate "Electronics", abbreviate to "Elec", and truncate
    });
  });
});
