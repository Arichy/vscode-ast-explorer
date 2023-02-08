// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';

import {
  WEBVIEW_REACT_DIDMOUNT,
  sendExt,
  HIGHLIGHT,
  sendFilePath,
  CLEAR_HIGHLIGHT,
  setCursor,
  sendId,
  setId,
} from '../shared/actions';

const merge = require('lodash.merge');
const cloneDeep = require('lodash.cloneDeep');

import {
  getWebViewContent,
  sendTextChangeToWebview,
  sendReduxToWebview,
  getDocumentId,
  getWebviewPanelTitle,
  isLanguageIdMatch,
  supportedLanguageIds,
} from './utils';

const configurationKey = 'ast';

const map = new Map<string, { webviewPanel: vscode.WebviewPanel }>();

let webviewPanelSingleton: vscode.WebviewPanel = null;

type Config = {
  highlightConfig: Partial<vscode.DecorationRenderOptions>;
  reuseWebview: boolean;
  hideEditorTitleButton: boolean;
};

const defaultConfig: Config = {
  highlightConfig: {
    backgroundColor: 'rgba(255,240,6,0.4)',
    borderRadius: '3px',
  },
  reuseWebview: false,
  hideEditorTitleButton: false,
};

let config: Config = cloneDeep(defaultConfig);

let highlightDecorationType = vscode.window.createTextEditorDecorationType(
  config.highlightConfig
);

// --- section start: bridge ---

/**
 * @description send editor's information (language, relative path,current text) to webview
 */
const sendEditorInfoToWebview = (id: string, editor: vscode.TextEditor) => {
  let webviewPanel: vscode.WebviewPanel = null;
  if (config.reuseWebview) {
    webviewPanel = webviewPanelSingleton;
  } else {
    webviewPanel = map.get(id).webviewPanel;
  }
  if (!webviewPanel) {
    return;
  }

  if (config.reuseWebview) {
    webviewPanel.title = getWebviewPanelTitle(id);
  }

  // send current id (absolute path) to webview
  webviewPanel.webview.postMessage(sendId(id));

  // send ext, which is astexplorer's category
  const ext = path.extname(id);
  webviewPanel.webview.postMessage(sendExt(id, ext));

  // send file relative path shown in webview
  const rootPath = vscode.workspace.workspaceFolders[0].uri.path;
  const relativePath = path.relative(rootPath, id);
  webviewPanel.webview.postMessage(sendFilePath(id, relativePath));

  // send current editor's text to webview to render the initiate AST
  const text = editor.document.getText();
  sendTextChangeToWebview(webviewPanel.webview, id, text);
};

const getTargetEditor = (id: string): vscode.TextEditor => {
  const editors = vscode.window.visibleTextEditors;

  let targetEditor: vscode.TextEditor = null;

  // choose editor for id, current active editor as a priority
  for (const editor of editors) {
    if (getDocumentId(editor.document) === id) {
      if (vscode.window.activeTextEditor === editor) {
        targetEditor = editor;
        break;
      } else {
        if (!targetEditor) {
          targetEditor = editor;
        }
      }
    }
  }

  return targetEditor;
};

const onHighlight = (message) => {
  const { id } = message;

  const targetEditor = getTargetEditor(id);

  if (!targetEditor) {
    return;
  }

  const range: [number, number] = message.range;
  const [startIndex, endIndex] = range;

  targetEditor.setDecorations(highlightDecorationType, [
    new vscode.Range(
      targetEditor.document.positionAt(startIndex),
      targetEditor.document.positionAt(endIndex)
    ),
  ]);
};

const onClearHighlight = (message) => {
  const { id } = message;
  const targetEditor = getTargetEditor(id);
  if (!targetEditor) {
    return;
  }

  targetEditor.setDecorations(highlightDecorationType, []);
};

// --- section end: bridge ---

function createWebviewPanel(
  id: string,
  context: vscode.ExtensionContext
): vscode.WebviewPanel {
  const editorWhenCreateWebview = vscode.window.activeTextEditor;

  const title = getWebviewPanelTitle(id);
  const webviewPanel = vscode.window.createWebviewPanel(
    'ast',
    title,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  webviewPanel.webview.html = getWebViewContent(
    context,
    'web_dist/index.html',
    webviewPanel.webview
  );

  // listen to messages sent by webview
  webviewPanel.webview.onDidReceiveMessage((message) => {
    console.log('[message from webview]', message);
    switch (message.type) {
      case WEBVIEW_REACT_DIDMOUNT:
        // webview react didmount(useEffect)
        sendEditorInfoToWebview(id, editorWhenCreateWebview);
        return;

      case HIGHLIGHT:
        onHighlight(message);
        return;

      case CLEAR_HIGHLIGHT:
        onClearHighlight(message);
        return;
    }
  });

  webviewPanel.onDidDispose(
    () => {
      // when webview is closed, set singleton to null in reuse mode, delete id in map in non-reuse mode
      if (config.reuseWebview) {
        webviewPanelSingleton = null;
      } else {
        map.delete(id);
      }
    },
    null,
    context.subscriptions
  );

  return webviewPanel;
}

function getWebviewPanel(
  id: string,

  context: vscode.ExtensionContext
): vscode.WebviewPanel {
  if (config.reuseWebview) {
    if (!webviewPanelSingleton) {
      webviewPanelSingleton = createWebviewPanel(id, context);
    }
    return webviewPanelSingleton;
  } else {
    if (!map.has(id)) {
      const webviewPanel = createWebviewPanel(id, context);
      map.set(id, { webviewPanel });
    }
    return map.get(id).webviewPanel;
  }
}

function updateContext() {
  // register context used in package.json editor/title
  vscode.commands.executeCommand(
    'setContext',
    `${configurationKey}.supportedLanguageIds`,
    supportedLanguageIds
  );

  vscode.commands.executeCommand(
    'setContext',
    `${configurationKey}.hideEditorTitleButton`,
    config.hideEditorTitleButton
  );
}

export function activate(context: vscode.ExtensionContext) {
  // @ts-ignore
  let customConfig = vscode.workspace.getConfiguration(
    configurationKey
  ) as Config;
  config = merge(cloneDeep(defaultConfig), customConfig);

  highlightDecorationType = vscode.window.createTextEditorDecorationType(
    config.highlightConfig
  );

  updateContext();

  // register commands
  const webviewDisposable = vscode.commands.registerCommand(
    'vscode-ast-explorer.show',
    () => {
      const curEditor = vscode.window.activeTextEditor;
      const id = curEditor.document.fileName;

      const webviewPanel = getWebviewPanel(id, context);

      if (config.reuseWebview) {
        sendEditorInfoToWebview(id, curEditor);
      }

      webviewPanel.reveal();
    }
  );

  // configuration updated
  vscode.workspace.onDidChangeConfiguration((e) => {
    // @ts-ignore
    const newConfig = vscode.workspace.getConfiguration(
      configurationKey
    ) as Config;

    config = merge(cloneDeep(defaultConfig), newConfig);

    highlightDecorationType = vscode.window.createTextEditorDecorationType(
      config.highlightConfig
    );

    updateContext();
  });

  // current editor's text changed
  vscode.workspace.onDidChangeTextDocument((e) => {
    const changedFilePath = e.document.fileName;
    const id = changedFilePath;

    if (config.reuseWebview) {
      if (webviewPanelSingleton) {
        const text = e.document.getText();

        sendTextChangeToWebview(webviewPanelSingleton.webview, id, text);
      }
    } else {
      if (map.has(id)) {
        const { webviewPanel } = map.get(id);

        const text = e.document.getText();

        sendTextChangeToWebview(webviewPanel.webview, id, text);
      }
    }
  });

  // when current active editor changes (switch from one editor to another), switch to the corresponding AST webview
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!editor) {
      return;
    }

    const id = editor.document.fileName;
    if (config.reuseWebview) {
      // const curEditor = vscode.window.activeTextEditor;
      // if (curEditor) {
      //   if (isLanguageIdMatch(curEditor.document)) {
      //     sendEditorInfoToWebview(id, curEditor);
      //   }
      // }
    } else {
      if (map.has(id)) {
        const { webviewPanel } = map.get(id);
        if (!webviewPanel.visible) {
          webviewPanel.reveal();
        }
      }
    }
  });

  // current cursor changed
  vscode.window.onDidChangeTextEditorSelection((e) => {
    const { textEditor } = e;

    const {
      document: { fileName },
    } = textEditor;

    const id = fileName;

    let webviewPanel = null;
    if (config.reuseWebview) {
      if (!webviewPanelSingleton) {
        return;
      }
      webviewPanel = webviewPanelSingleton;
    } else {
      if (!map.has(fileName)) {
        return;
      }
      webviewPanel = map.get(fileName).webviewPanel;
    }

    const { selections } = e;
    // filter the [cursor change] action

    // this action must have only one selection
    if (selections.length === 1) {
      const [selection] = selections;

      // this action's start should be the same as end
      if (
        selection.start.line === selection.end.line &&
        selection.start.character === selection.end.character
      ) {
        // send current cursor to webview to jump to the corresponding AST node. It's defined by webview's redux.
        const cursorOffset = textEditor.document.offsetAt(selection.start);

        sendReduxToWebview(webviewPanel.webview, id, setCursor, cursorOffset);
      }
    }
  });

  vscode.workspace.onDidCloseTextDocument((document) => {
    const id = getDocumentId(document);

    if (!isLanguageIdMatch(document)) {
      return;
    }

    if (config.reuseWebview) {
    } else {
      if (map.has(id)) {
        // when a document is closed, close its webview
        const { webviewPanel } = map.get(id);
        webviewPanel.dispose();
        map.delete(id);
      }
    }
  });

  context.subscriptions.push(webviewDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
  map.clear();
}
