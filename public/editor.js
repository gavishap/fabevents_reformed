(() => {
  if (new URLSearchParams(window.location.search).get('edit') !== '1') return;
  const page = document.body.dataset.editorPage;
  if (!page) return;

  const toolbar = document.createElement('div');
  toolbar.id = 'fab-editor-toolbar';
  toolbar.innerHTML = '<strong>Edit mode</strong><span>Tap text to edit. Changes save automatically when you tap outside. Use Undo or Previous saves if needed.</span><button type="button" data-action="undo">Undo</button><button type="button" data-action="history">Previous saves</button><button type="button" data-action="done">Done editing</button>';
  document.body.append(toolbar);

  const style = document.createElement('style');
  style.textContent = `
    #fab-editor-toolbar { position: fixed; z-index: 999999; right: 16px; bottom: 16px; display: grid; grid-template-columns: max-content minmax(210px, 1fr) max-content max-content max-content; align-items: center; gap: 10px; width: min(900px, calc(100vw - 32px)); padding: 12px 14px; border: 1px solid #d86e79; border-radius: 12px; background: #fff7f7; box-shadow: 0 10px 30px rgba(50, 20, 20, .18); color: #3b2527; font: 14px/1.3 Poppins, Arial, sans-serif; }
    #fab-editor-toolbar strong { white-space: nowrap; }
    #fab-editor-toolbar span { min-width: 0; }
    #fab-editor-toolbar button { border: 0; border-radius: 7px; padding: 9px 12px; background: #d86e79; color: white; font: inherit; white-space: nowrap; cursor: pointer; }
    #fab-editor-toolbar button[data-action="history"] { background: #71505a; }
    #fab-editor-history { position: fixed; z-index: 1000000; right: 16px; bottom: 76px; width: min(420px, calc(100vw - 32px)); padding: 14px; border: 1px solid #d86e79; border-radius: 12px; background: #fffafa; box-shadow: 0 10px 30px rgba(50, 20, 20, .18); color: #3b2527; font: 14px/1.35 Poppins, Arial, sans-serif; }
    #fab-editor-history strong { display: block; margin-bottom: 8px; }
    #fab-editor-history button { display: block; width: 100%; margin-top: 8px; border: 1px solid #e6b9bd; border-radius: 7px; padding: 9px; background: white; color: #3b2527; font: inherit; text-align: left; cursor: pointer; }
    [data-fab-editable] { cursor: text !important; }
    [data-fab-editing] { outline: 2px solid #d86e79 !important; outline-offset: 3px; cursor: text !important; white-space: pre-wrap !important; }
    @media (max-width: 760px) { #fab-editor-toolbar { left: 10px; right: 10px; bottom: 10px; width: auto; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; font-size: 12px; } #fab-editor-toolbar strong, #fab-editor-toolbar span { grid-column: 1 / -1; } #fab-editor-toolbar button { min-width: 0; padding: 9px 6px; } }
  `;
  document.head.append(style);

  const isEditorText = (node) => {
    const parent = node.parentElement;
    return node.nodeValue.trim() && parent && !parent.closest('header, script, style, noscript, textarea, #fab-editor-toolbar, .dev-toolbar-root');
  };

  // The site header remains navigation, not editable content. Keep edit mode
  // switched on when its internal links take the owner to another page.
  document.querySelectorAll('header a[href]').forEach((link) => {
    const destination = new URL(link.getAttribute('href'), window.location.origin);
    if (destination.origin !== window.location.origin) return;
    destination.searchParams.set('edit', '1');
    link.href = `${destination.pathname}${destination.search}${destination.hash}`;
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (node) => isEditorText(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const span = document.createElement('span');
    span.dataset.fabEditable = '';
    span.textContent = node.nodeValue;
    // Use the browser's HTML representation for matching. It keeps characters
    // like "&" compatible with the encoded version saved in the source file.
    span.dataset.fabOriginal = span.innerHTML;
    node.parentNode.replaceChild(span, node);
  });

  let selected = null;
  let active = true;
  const areaFor = (element) => element.closest('header') ? 'header' : element.closest('footer') ? 'footer' : 'content';
  const message = (text, isError = false) => {
    toolbar.querySelector('span').textContent = text;
    toolbar.style.borderColor = isError ? '#a33434' : '#d86e79';
  };
  const request = async (path, body) => {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'That change could not be completed.');
    return result;
  };
  const refreshToCurrentPlace = () => window.location.reload();
  const occurrenceFor = (element, oldText) => [...document.querySelectorAll('[data-fab-editable]')]
    .filter((candidate) => areaFor(candidate) === areaFor(element) && candidate.dataset.fabOriginal === oldText)
    .indexOf(element);

  // Browsers turn Enter in editable text into <div> or <br> elements. Store
  // those as <br> tags in the website source instead of flattening them back
  // into one run of text. This also keeps intentional spacing intact.
  const formattedMarkupFor = (element) => element.innerHTML
    .replace(/<div><br><\/div>/gi, '<br>')
    .replace(/<\/div>\s*<div>/gi, '<br>')
    .replace(/<div>/gi, '<br>')
    .replace(/<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/\r?\n/g, '<br>');

  async function save(element) {
    const oldText = element.dataset.fabOriginal;
    const newText = element.textContent;
    const newMarkup = formattedMarkupFor(element);
    element.contentEditable = 'false';
    element.removeAttribute('data-fab-editing');
    selected = null;
    if (!oldText || oldText === newMarkup) return;
    if (!newText.trim()) {
      element.innerHTML = oldText;
      message('Text cannot be left blank.', true);
      return;
    }
    message('Saving…');
    try {
      await request('/api/save-edit/', { page, area: areaFor(element), oldText, newText: newMarkup, occurrence: occurrenceFor(element, oldText) });
      element.dataset.fabOriginal = newMarkup;
      message('Saved to the website files.');
    } catch (error) {
      element.innerHTML = oldText;
      message(error.message || 'Could not save this text.', true);
    }
  }

  document.addEventListener('click', async (event) => {
    if (!active || event.target.closest('#fab-editor-toolbar')) return;
    const target = event.target.closest('[data-fab-editable]');
    if (selected && selected !== target) await save(selected);
    if (!target) return;
    event.preventDefault();
    selected = target;
    target.dataset.fabEditing = '';
    target.contentEditable = 'true';
    target.focus();
    message('Type your new text, then tap outside it to save.');
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!active || !selected) return;
    if (event.key === 'Escape') {
      selected.textContent = selected.dataset.fabOriginal;
      selected.contentEditable = 'false';
      selected.removeAttribute('data-fab-editing');
      selected = null;
      message('Change cancelled.');
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save(selected);
    }
  });

  toolbar.querySelector('[data-action="undo"]').addEventListener('click', async () => {
    if (selected) await save(selected);
    try {
      await request('/api/undo-edit/', { page });
      message('Last saved change undone. Refreshing…');
      refreshToCurrentPlace();
    } catch (error) { message(error.message || 'Could not undo the last save.', true); }
  });

  toolbar.querySelector('[data-action="history"]').addEventListener('click', async () => {
    document.querySelector('#fab-editor-history')?.remove();
    const panel = document.createElement('div');
    panel.id = 'fab-editor-history';
    panel.innerHTML = '<strong>Previous saves</strong><span>Loading saved versions…</span>';
    document.body.append(panel);
    try {
      const response = await fetch(`/api/edit-history/?page=${encodeURIComponent(page)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load saved versions.');
      if (!result.entries.length) { panel.querySelector('span').textContent = 'No earlier saves on this page yet.'; return; }
      panel.querySelector('span').remove();
      result.entries.forEach((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `Restore ${new Date(entry.savedAt).toLocaleString()}: ${entry.description || 'previous version'}`;
        button.addEventListener('click', async () => {
          try {
            await request('/api/restore-edit/', { page, id: entry.id });
            message('Earlier version restored. Refreshing…');
            refreshToCurrentPlace();
          } catch (error) { message(error.message || 'Could not restore that version.', true); }
        });
        panel.append(button);
      });
    } catch (error) { panel.querySelector('span').textContent = error.message || 'Could not load saved versions.'; }
  });

  toolbar.querySelector('[data-action="done"]').addEventListener('click', async () => {
    if (selected) await save(selected);
    active = false;
    document.querySelectorAll('[data-fab-editable]').forEach((span) => span.replaceWith(...span.childNodes));
    style.remove();
    toolbar.remove();
  });
})();
