(() => {
  const emojiIcons = Object.freeze({
    '✅': 'circle-check',
    '✓': 'check',
    '⚠': 'alert-triangle',
    '⏹': 'x',
    '⏳': 'refresh',
    '⏱': 'history',
    '📄': 'file-text',
    '📊': 'chart-bar',
    '❌': 'circle-x',
    '📋': 'clipboard-list',
    '➕': 'plus',
    '🎨': 'palette',
    '🎓': 'school',
    '🔥': 'bolt',
    '⚙': 'settings',
    '💾': 'device-floppy',
    '🗑': 'trash',
    '📚': 'book-2',
    '🔢': 'list-numbers',
    '💰': 'currency-dollar',
    '🛡': 'shield-lock',
    '🔐': 'shield-lock',
    '📖': 'book',
    '📦': 'package',
    '🖨': 'printer',
    '🔄': 'refresh',
    '🔍': 'search',
    '📅': 'calendar',
    '🌐': 'world',
    '✏': 'pencil',
    '📝': 'notes',
    '📂': 'folder',
    '📕': 'book',
    '📘': 'book-2',
    '🧾': 'receipt',
    '💳': 'credit-card',
    '🚫': 'ban',
    '✕': 'x',
    '☁': 'cloud-download',
    '🧭': 'compass',
    '🛠': 'tools',
    '💡': 'bulb',
    '📭': 'mailbox',
    '💬': 'message-circle',
    '📗': 'file-spreadsheet',
    '📎': 'paperclip',
    '👇': 'arrow-down',
    '📑': 'files',
    '✂': 'scissors',
    '🌈': 'color-swatch',
    '💲': 'currency-dollar',
    '🏫': 'school',
    '🔌': 'plug-connected',
    '🧪': 'test-pipe',
    '🔎': 'search',
    '📱': 'device-mobile',
    '🔒': 'lock',
    '🔓': 'lock-open',
    '🚪': 'logout',
    '👋': 'user-circle',
    '⚫': 'contrast-2',
    '📜': 'file-invoice',
    '🧹': 'brush',
    '💿': 'disc',
    '🖼': 'photo',
    '📐': 'ruler',
    '📏': 'ruler',
    '📡': 'activity',
    '🏷': 'tag',
    '🧮': 'calculator',
    '⚡': 'bolt'
  });
  const emojiPattern = /[\u{1F000}-\u{1FAFF}\u2300-\u23FF\u2600-\u27BF](?:\uFE0F|\uFE0E)?/gu;

  window.servigacoIcon = (name) =>
    `<i class="ti ti-${name}" aria-hidden="true"></i>`;

  window.servigacoIconElement = (name) => {
    const icon = document.createElement('i');
    icon.className = `ti ti-${name}`;
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  };

  window.servigacoSetIconText = (element, name, text) => {
    element.replaceChildren(
      window.servigacoIconElement(name),
      document.createTextNode(` ${text}`)
    );
  };

  window.servigacoReplaceIconGlyphs = (text) =>
    String(text).replace(emojiPattern, (glyph) => {
      const name = emojiIcons[glyph.replace(/[\uFE0E\uFE0F]/g, '')];
      return name ? window.servigacoIcon(name) : glyph;
    });
})();
