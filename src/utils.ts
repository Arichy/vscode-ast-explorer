import { sendToRedux, setCode } from '../shared/actions';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export const sendTextChangeToWebview = (
  webview: vscode.Webview,
  id: string,
  text: string
) => {
  webview.postMessage(sendToRedux(id, setCode({ code: text })));
};

export const sendReduxToWebview = (
  webview: vscode.Webview,
  id: string,
  actionCreator: Function,
  params: any
) => {
  webview.postMessage(sendToRedux(id, actionCreator(params)));
};

export function getWebViewContent(
  context: vscode.ExtensionContext,
  templatePath: string,
  webview: vscode.Webview,
  initialTheme?: { theme: 'light' | 'dark'; preference: 'sync' | 'light' | 'dark' }
) {
  const resourcePath = path.join(context.extensionPath, templatePath);
  const dirPath = path.dirname(resourcePath);
  let html = fs.readFileSync(resourcePath, 'utf-8');

  // vscode doesn't support load local resources directly, so replace the path with vscode's path. Here is just style's and js's path replacement.
  html = html.replace(
    // /(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g,
    /(<link.+?href="|<script.+?src="|<iframe.+?src="|<img.+?src=")(.+?)"/g,
    (m, $1, $2) => {
      const newUrl = webview.asWebviewUri(
        vscode.Uri.file(path.join(dirPath, $2))
      );

      return $1 + newUrl + '"';
    }
  );

  // Inject the initial resolved theme into the HTML so the very first paint
  // picks up the right colors (avoids a light-theme flash before the webview
  // round-trips SEND_THEME from the extension host).
  if (initialTheme) {
    const payload = JSON.stringify(initialTheme);
    const injection =
      `<script>window.__VSCODE_AST_THEME__=${payload};` +
      `document.documentElement.setAttribute('data-theme', ${JSON.stringify(initialTheme.theme)});</script>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', injection + '</head>');
    } else {
      html = injection + html;
    }
  }

  console.log(html);

  return html;
}

export function getDocumentId(document: vscode.TextDocument) {
  return document.fileName;
}

export { getColorContrast } from './dynamic-contrast';

export function getExt(filepath: string) {
  return path.extname(filepath);
}

const rootPath = vscode.workspace.workspaceFolders[0].uri.path;
export function getRelativePath(filepath: string) {
  const relativePath = path.relative(rootPath, filepath);
  return relativePath;
}

export function getWebviewPanelTitle(id: string): string {
  return `AST - ${id.slice(id.lastIndexOf('/') + 1)}`;
}

export const supportedLanguageIds = [
  'css',
  'scss',
  'less',

  'go',
  'graphql',
  'html',
  'java',
  
  'javascript',
  'typescript',
  'typescriptreact',
  'javascriptreact',
  'json',
  
  'lua',
  'markdown',
  'php',
  'python',
  'rust',
  'scala',
  'sql',
  'svelte',
  'thrift',
  'vue',
  'yaml',
];
export function isLanguageIdMatch(document: vscode.TextDocument) {
  return vscode.languages.match(
    supportedLanguageIds.map((languageId) => ({ language: languageId })),
    document
  );
}
