export function cloneSelection() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const clonedSelection = [];

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i).cloneRange(); 
    const fragment = range.cloneContents();
    clonedSelection.push({ range, fragment });
  }

  return clonedSelection;
}

export function restoreSelection(clonedSelection) {
  const selection = window.getSelection();
  selection.removeAllRanges(); // Clear existing selection

  clonedSelection.forEach(({ range }) => {
    selection.addRange(range);
  });
}
