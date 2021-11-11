import defaultParserInterface from '../utils/defaultParserInterface';
import pkg from 'json-to-ast/package.json';
import jsonToAst from 'json-to-ast';

const ID = 'jsonToAst';

export default {
  ...defaultParserInterface,

  id: ID,
  displayName: ID,
  version: pkg.version,
  homepage: pkg.homepage,
  locationProps: new Set(['loc']),

  loadParser(callback) {
    callback(jsonToAst);
  },

  parse(jsonToAst, code) {
    return jsonToAst(code);
  },

  nodeToRange({ loc }) {
    if (loc) {
      return [loc.start.offset, loc.end.offset];
    }
  },
};
