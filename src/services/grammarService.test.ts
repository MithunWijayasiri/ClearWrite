import { splitTextIntoChunks } from './grammarService';

describe('grammarService', () => {
  describe('splitTextIntoChunks', () => {
    it('should return empty array for empty input', () => {
      const result = splitTextIntoChunks('', 100);
      expect(result).toEqual([]);
    });

    it('should not split text shorter than the limit', () => {
      const text = "This is a short text.";
      const result = splitTextIntoChunks(text, 100);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(text);
      expect(result[0].startOffset).toBe(0);
    });

    it('should split text exceeding the limit', () => {
      const text = "This is the first part. This is the second part.";
      // Limit small enough to force split
      const result = splitTextIntoChunks(text, 30);
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].text.length).toBeLessThanOrEqual(30);
    });

    it('should split at sentence boundaries when possible', () => {
      const text = "First sentence. Second sentence is here.";
      // "First sentence." is 15 chars.
      // The splitter includes the trailing space in the first chunk if it fits.
      // The regex /([.?!])(\s+|$)/g captures the punctuation and the following space.
      // The split occurs immediately after the period, so "First sentence." is 15 chars (no trailing space).
      // " Second sentence is here." is 25 chars (including the leading space).

      // Use limit 30 to allow second sentence to fit if standalone, but force split of combined text (39 chars).
      const result = splitTextIntoChunks(text, 30);

      expect(result[0].text).toBe("First sentence.");
      expect(result[1].text).toBe(" Second sentence is here.");
    });

    it('should handle splits without clear sentence boundaries (fallback)', () => {
      const text = "ThisIsAReallyLongStringWithoutSpacesOrPunctuationThatNeedsToBeSplitSomething";
      const result = splitTextIntoChunks(text, 20);

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].text.length).toBeLessThanOrEqual(20);
      expect(result[0].text).toBe("ThisIsAReallyLongStr");
    });

    it('should track offsets correctly', () => {
        const text = "Chunk one. Chunk two.";
        const result = splitTextIntoChunks(text, 15);
        // "Chunk one. " is 11 chars

        expect(result[0].startOffset).toBe(0);
        expect(result[1].startOffset).toBe(result[0].text.length);
        expect(result[0].text + result[1].text).toBe(text);
    });

    it('should not infinite loop if a space is at the very start of a chunk', () => {
        // " AVeryLongWord..." where the first char is space, and the rest is longer than limit
        const limit = 10;
        const text = " " + "a".repeat(20);
        // The first chunk starts at 0.
        // remainingText = " aaaaaaaaaaaaaaaaaaaa"
        // limit = 10.
        // lastIndexOf(' ', 10) will find space at 0.
        // If we split at 0, we get empty chunk and offset doesn't advance -> infinite loop.
        // Fix ensures we hard split if space is at 0.

        const result = splitTextIntoChunks(text, limit);
        expect(result.length).toBeGreaterThan(1);
        expect(result[0].text.length).toBe(limit); // Should hard split at limit
    });
  });
});
