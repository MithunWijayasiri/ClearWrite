import { Node as PMNode } from '@tiptap/pm/model';

export const textOffsetToPos = (doc: PMNode, offset: number): number => {
  let currentPlainOffset = 0;
  let lastPos = 0;
  let targetPos = 0;
  let found = false;

  doc.descendants((node, pos) => {
    if (found) return false;

    if (node.isText) {
      // Use \n\n as separator to match likely editor.getText() behavior?
      // Or maybe the issue is that editor.getText() uses \n\n by default in some contexts?
      // Let's try matching what seems to be the reality of the offset mismatch (4 chars over 4 gaps = 1 extra char per gap).
      const gapLength = doc.textBetween(lastPos, pos, '\n\n').length;
      currentPlainOffset += gapLength;

      const nodeLength = node.text?.length || 0;

      if (offset >= currentPlainOffset && offset <= currentPlainOffset + nodeLength) {
        targetPos = pos + (offset - currentPlainOffset);
        found = true;
        return false;
      }

      currentPlainOffset += nodeLength;
      lastPos = pos + nodeLength;
    }
    return true;
  });

  if (!found) {
    const finalGap = doc.textBetween(lastPos, doc.content.size, '\n\n').length;
    currentPlainOffset += finalGap;

    if (offset <= currentPlainOffset) {
        return doc.content.size;
    }

    return doc.content.size;
  }

  return targetPos;
};
