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
  templatePath: string
) {
  const resourcePath = path.join(context.extensionPath, templatePath);
  const dirPath = path.dirname(resourcePath);
  let html = fs.readFileSync(resourcePath, 'utf-8');

  // vscode doesn't support load local resources directly, so replace the path with vscode's path. Here is just style's and js's path replacement.
  html = html.replace(
    // /(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g,
    /(<link.+?href="|<script.+?src="|<iframe.+?src="|<img.+?src=")(.+?)"/g,
    (m, $1, $2) => {
      return (
        $1 +
        vscode.Uri.file(path.resolve(dirPath, $2))
          .with({ scheme: 'vscode-resource' })
          .toString() +
        '"'
      );
    }
  );

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
  'javascript',
  'typescript',
  'typescriptreact',
  'javascriptreact',
  'json',
  'html',
  'css',
  'vue',
];
export function isLanguageIdMatch(document: vscode.TextDocument) {
  return vscode.languages.match(
    supportedLanguageIds.map((languageId) => ({ language: languageId })),
    document
  );
}
