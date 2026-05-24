/*!
Copyright 2012-2026 Sarven Capadisli <https://csarven.ca/>
Copyright 2023-2026 Virginia Balseiro <https://virginiabalseiro.com/>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

// PM's MutationObserver reverts external DOM writes; route .active and rail tops through decorations.
export const slideshowDecorationsKey = new PluginKey("slideshowDecorations");

const THUMB_TOP_BASE = 24;
const THUMB_STRIDE = 152;

function isSlideSection(node) {
  if (node.type.name !== "section") return false;
  const cls = node.attrs.originalAttributes?.class || "";
  return cls.split(/\s+/).includes("slide");
}

function buildDecorations(doc, activeIndex) {
  const decos = [];
  let idx = 0;
  doc.descendants((node, pos) => {
    if (!isSlideSection(node)) return true;
    if (idx === activeIndex) {
      decos.push(Decoration.node(pos, pos + node.nodeSize, { class: "active" }));
    } else {
      const top = THUMB_TOP_BASE + idx * THUMB_STRIDE;
      decos.push(Decoration.node(pos, pos + node.nodeSize, { style: `top:${top}px`, draggable: "true" }));
    }
    idx++;
    return false;
  });
  return DecorationSet.create(doc, decos);
}

export const slideshowDecorationsPlugin = new Plugin({
  key: slideshowDecorationsKey,
  state: {
    init(_, state) {
      return { activeIndex: 0, decorations: buildDecorations(state.doc, 0) };
    },
    apply(tr, value, _oldState, newState) {
      const meta = tr.getMeta(slideshowDecorationsKey);
      let activeIndex = value.activeIndex;
      if (meta && typeof meta.activeIndex === "number") {
        activeIndex = meta.activeIndex;
      }
      if (tr.docChanged || activeIndex !== value.activeIndex) {
        return { activeIndex, decorations: buildDecorations(newState.doc, activeIndex) };
      }
      return value;
    },
  },
  props: {
    decorations(state) {
      return slideshowDecorationsKey.getState(state).decorations;
    },
  },
  view() {
    return {
      update() {
        window.dispatchEvent(new Event("dokieli:slideshow-decorations-updated"));
      },
    };
  },
});

export function setActiveSlideIndex(view, activeIndex) {
  if (!view) return;
  view.dispatch(view.state.tr.setMeta(slideshowDecorationsKey, { activeIndex }));
}
