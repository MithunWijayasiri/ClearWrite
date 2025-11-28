export interface GrammarMatch {
  message: string;
  shortMessage: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  type: {
    typeName: string;
  };
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    }
  };
}

export interface SidebarErrorItem {
  id: string; // unique internal ID
  from: number;
  to: number;
  message: string;
  replacements: string[];
  context: string;
  type: 'error' | 'warning';
}

export interface EditorStats {
  words: number;
  characters: number;
}
