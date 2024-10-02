const _extToCategoryIdMap = {
  '.html': 'htmlmixed',
  '.js': 'javascript',
  '.ts': 'javascript',
  '.json': 'json',
  '.lepus': 'javascript',
  '.vue': 'vue',
  '.css': 'css',
  '.scss': 'css',
  '.less': 'css',
  '.tsx': 'javascript',
  '.jsx': 'javascript',
  '.md': 'markdown',
  '.py': 'python',
  '.rs': 'rust',
};

export const extToCategoryIdMap = new Proxy(_extToCategoryIdMap, {
  get(target, p) {
    if (typeof p !== 'string' || !p.startsWith('.')) {
      return null;
    }

    let property = p.toLowerCase();

    if (Reflect.has(target, property)) {
      return Reflect.get(target, property);
    }

    let rest = property.slice(1);
    return rest;
  },
})

export const extToParserIdMap = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.scss': 'postcss',
  '.less': 'postcss',
};
