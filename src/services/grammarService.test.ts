import { splitTextIntoChunks, parseAIResponse, resolveAIMatchOffsets, mergeMatches } from './grammarService';
import { GrammarMatch } from '../types';

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
      const result = splitTextIntoChunks(text, 30);
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].text.length).toBeLessThanOrEqual(30);
    });

    it('should split at sentence boundaries when possible', () => {
      const text = "First sentence. Second sentence is here.";
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

        expect(result[0].startOffset).toBe(0);
        expect(result[1].startOffset).toBe(result[0].text.length);
        expect(result[0].text + result[1].text).toBe(text);
    });

    it('should not infinite loop if a space is at the very start of a chunk', () => {
        const limit = 10;
        const text = " " + "a".repeat(20);

        const result = splitTextIntoChunks(text, limit);
        expect(result.length).toBeGreaterThan(1);
        expect(result[0].text.length).toBe(limit);
    });
  });

  describe('parseAIResponse', () => {
    it('should parse a valid JSON array', () => {
      const raw = '[{"text":"Me and him","replacement":"He and I","message":"Use subject pronouns","category":"grammar"}]';
      const result = parseAIResponse(raw);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Me and him');
      expect(result[0].replacement).toBe('He and I');
    });

    it('should handle JSON wrapped in code fences', () => {
      const raw = '```json\n[{"text":"heavy","replacement":"heavily","message":"Use adverb","category":"grammar"}]\n```';
      const result = parseAIResponse(raw);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('heavy');
    });

    it('should handle code fences without json label', () => {
      const raw = '```\n[{"text":"heavy","replacement":"heavily","message":"Use adverb","category":"grammar"}]\n```';
      const result = parseAIResponse(raw);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid JSON', () => {
      const result = parseAIResponse('this is not json');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = parseAIResponse('');
      expect(result).toEqual([]);
    });

    it('should filter out entries with missing fields', () => {
      const raw = '[{"text":"heavy","replacement":"heavily","message":"Use adverb","category":"grammar"},{"text":"bad","replacement":"good"}]';
      const result = parseAIResponse(raw);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('heavy');
    });

    it('should handle extra text around the JSON array', () => {
      const raw = 'Here are the errors:\n[{"text":"heavy","replacement":"heavily","message":"Use adverb","category":"grammar"}]\nDone!';
      const result = parseAIResponse(raw);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty JSON array', () => {
      const result = parseAIResponse('[]');
      expect(result).toEqual([]);
    });
  });

  describe('resolveAIMatchOffsets', () => {
    it('should find a unique error text and return correct offset', () => {
      const text = 'The cat decides to went home.';
      const aiMatches = [{ text: 'to went', replacement: 'to go', message: 'Use base form after to', category: 'grammar' }];
      const result = resolveAIMatchOffsets(text, aiMatches);

      expect(result).toHaveLength(1);
      expect(result[0].offset).toBe(16);
      expect(result[0].length).toBe(7);
      expect(result[0].replacements[0].value).toBe('to go');
      expect(result[0].rule.id).toBe('AI_GRAMMAR');
      expect(result[0].rule.issueType).toBe('grammar');
    });

    it('should handle duplicate error text by claiming first unclaimed occurrence', () => {
      const text = 'He go home. He go school.';
      const aiMatches = [
        { text: 'He go', replacement: 'He goes', message: 'Subject-verb agreement', category: 'agreement' },
        { text: 'He go', replacement: 'He goes', message: 'Subject-verb agreement', category: 'agreement' },
      ];
      const result = resolveAIMatchOffsets(text, aiMatches);

      expect(result).toHaveLength(2);
      expect(result[0].offset).toBe(0);
      expect(result[1].offset).toBe(12);
    });

    it('should silently drop matches where text is not found', () => {
      const text = 'The cat sat on the mat.';
      const aiMatches = [{ text: 'nonexistent phrase', replacement: 'fix', message: 'Error', category: 'grammar' }];
      const result = resolveAIMatchOffsets(text, aiMatches);

      expect(result).toEqual([]);
    });

    it('should handle multiple non-overlapping errors', () => {
      const text = 'Me and him decides to went home.';
      const aiMatches = [
        { text: 'Me and him', replacement: 'He and I', message: 'Use subject pronouns', category: 'grammar' },
        { text: 'decides', replacement: 'decided', message: 'Use past tense', category: 'tense' },
        { text: 'to went', replacement: 'to go', message: 'Use base form after to', category: 'grammar' },
      ];
      const result = resolveAIMatchOffsets(text, aiMatches);

      expect(result).toHaveLength(3);
      expect(result[0].offset).toBe(0);
      expect(result[1].offset).toBe(11);
      expect(result[2].offset).toBe(19);
    });

    it('should set rule category name with capitalized category', () => {
      const text = 'He go home.';
      const aiMatches = [{ text: 'He go', replacement: 'He goes', message: 'Agreement error', category: 'agreement' }];
      const result = resolveAIMatchOffsets(text, aiMatches);

      expect(result[0].rule.category.name).toBe('AI: Agreement');
    });
  });

  describe('mergeMatches', () => {
    const makeLTMatch = (offset: number, length: number, issueType: string = 'grammar'): GrammarMatch => ({
      message: 'LT error',
      shortMessage: 'LT',
      replacements: [{ value: 'lt-fix' }],
      offset,
      length,
      type: { typeName: 'Other' },
      rule: { id: 'LT_RULE', description: 'LT rule', issueType, category: { id: 'LT', name: 'LanguageTool' } },
    });

    const makeAIMatch = (offset: number, length: number): GrammarMatch => ({
      message: 'AI error',
      shortMessage: 'AI',
      replacements: [{ value: 'ai-fix' }],
      offset,
      length,
      type: { typeName: 'Other' },
      rule: { id: 'AI_GRAMMAR', description: 'AI rule', issueType: 'grammar', category: { id: 'AI_GRAMMAR', name: 'AI: Grammar' } },
    });

    it('should include both when no overlap', () => {
      const lt = [makeLTMatch(0, 5)];
      const ai = [makeAIMatch(10, 5)];
      const result = mergeMatches(lt, ai);

      expect(result).toHaveLength(2);
      expect(result[0].offset).toBe(0);
      expect(result[1].offset).toBe(10);
    });

    it('should keep LT spelling match when overlapping with AI', () => {
      const lt = [makeLTMatch(0, 5, 'misspelling')];
      const ai = [makeAIMatch(0, 5)];
      const result = mergeMatches(lt, ai);

      expect(result).toHaveLength(1);
      expect(result[0].rule.id).toBe('LT_RULE');
    });

    it('should replace LT grammar match with AI when overlapping', () => {
      const lt = [makeLTMatch(0, 5, 'grammar')];
      const ai = [makeAIMatch(0, 5)];
      const result = mergeMatches(lt, ai);

      expect(result).toHaveLength(1);
      expect(result[0].rule.id).toBe('AI_GRAMMAR');
    });

    it('should return only LT matches when AI has none', () => {
      const lt = [makeLTMatch(0, 5), makeLTMatch(10, 3)];
      const result = mergeMatches(lt, []);

      expect(result).toHaveLength(2);
    });

    it('should sort final results by offset', () => {
      const lt = [makeLTMatch(20, 5)];
      const ai = [makeAIMatch(5, 3)];
      const result = mergeMatches(lt, ai);

      expect(result[0].offset).toBe(5);
      expect(result[1].offset).toBe(20);
    });

    it('should handle partial overlap (AI span overlaps LT span)', () => {
      const lt = [makeLTMatch(3, 5)];  // covers 3-8
      const ai = [makeAIMatch(5, 6)];  // covers 5-11
      const result = mergeMatches(lt, ai);

      expect(result).toHaveLength(1);
      expect(result[0].rule.id).toBe('AI_GRAMMAR');
    });
  });
});
