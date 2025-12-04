import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { GrammarMatch, SidebarErrorItem } from '../types';
import { textOffsetToPos } from '../utils/editorUtils';

export const grammarPluginKey = new PluginKey('grammar');

export const GrammarExtension = Extension.create<{
  onErrorsUpdate: (errors: SidebarErrorItem[]) => void;
}>({
  name: 'grammar',

  addOptions() {
    return {
      onErrorsUpdate: () => {},
    };
  },

  addCommands() {
    return {
      setGrammarMatches: (matches: GrammarMatch[]) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta('GRAMMAR_MATCHES', matches);
        }
        return true;
      },
    }
  },

  addProseMirrorPlugins() {
    const { onErrorsUpdate } = this.options;

    return [
      new Plugin({
        key: grammarPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            const matches = tr.getMeta('GRAMMAR_MATCHES');
            if (matches) {
              const doc = tr.doc;
              const decorations: Decoration[] = [];

              matches.forEach((match: GrammarMatch, idx: number) => {
                const from = textOffsetToPos(doc, match.offset);
                const to = textOffsetToPos(doc, match.offset + match.length);

                if (to <= doc.content.size) {
                  decorations.push(
                    Decoration.inline(from, to, {
                      class: match.rule.issueType === 'misspelling' ? 'grammar-error' : 'grammar-warning',
                      'data-error-id': `${match.offset}-${match.rule.id}-${idx}`,
                    }, {
                      // Custom spec data
                      match,
                      idx,
                      originalId: `${match.offset}-${match.rule.id}-${idx}`
                    })
                  );
                }
              });

              return DecorationSet.create(doc, decorations);
            }

            return oldState.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        view(editorView) {
            return {
                update(view, prevState) {
                    const pluginState = grammarPluginKey.getState(view.state);
                    const prevPluginState = grammarPluginKey.getState(prevState);

                    if (pluginState && (pluginState !== prevPluginState || !view.state.doc.eq(prevState.doc))) {
                        const decorations = pluginState.find();

                        const sidebarItems: SidebarErrorItem[] = decorations.map(deco => {
                            const match = deco.spec.match as GrammarMatch;
                            const originalId = deco.spec.originalId;

                            return {
                                id: originalId,
                                from: deco.from,
                                to: deco.to,
                                message: match.shortMessage || match.message,
                                replacements: match.replacements.map(r => r.value),
                                context: view.state.doc.textBetween(
                                    Math.max(0, deco.from - 10),
                                    Math.min(view.state.doc.content.size, deco.to + 10),
                                    ' '
                                ),
                                type: match.rule.issueType === 'misspelling' ? 'error' : 'warning',
                            };
                        });

                        sidebarItems.sort((a, b) => a.from - b.from);

                        onErrorsUpdate(sidebarItems);
                    }
                }
            }
        }
      }),
    ];
  },
});
