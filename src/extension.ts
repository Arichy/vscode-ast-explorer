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
};

const defaultConfig: Config = {
  highlightConfig: {
    backgroundColor: 'rgba(255,240,6,0.4)',
    borderRadius: '3px',
  },
  reuseWebview: false,
};

let config: Config = cloneDeep(defaultConfig);

let highlightDecorationType = vscode.window.createTextEditorDecorationType(
  config.highlightConfig
);

// --- section start: bridge ---

/**
 * @description 发送 editor 的信息：语言、相对路径。当前文本 给 webview
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

  // 发送当前 id 给 webview
  // sendReduxToWebview(webviewPanel.webview, setId, id);
  webviewPanel.webview.postMessage(sendId(id));

  // 更改代码语言，即 webview 中的 category
  const ext = path.extname(id);
  webviewPanel.webview.postMessage(sendExt(id, ext));

  // 发送文件相对路径，在 webview 中显示
  const rootPath = vscode.workspace.workspaceFolders[0].uri.path;
  const relativePath = path.relative(rootPath, id);
  webviewPanel.webview.postMessage(sendFilePath(id, relativePath));

  // 将当前文本发送给 webview 用于初始化首屏 AST
  const text = editor.document.getText();
  sendTextChangeToWebview(webviewPanel.webview, id, text);
};

const getTargetEditor = (id: string): vscode.TextEditor => {
  const editors = vscode.window.visibleTextEditors;

  let targetEditor: vscode.TextEditor = null;

  // 在所有 visible editors 里，筛选展示当前 document 的，然后优先选择 currentActiveEditor
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

  webviewPanel.webview.html = getWebViewContent(context, 'web_dist/index.html');

  // 插件监听 webview 发送过来的消息
  webviewPanel.webview.onDidReceiveMessage((message) => {
    console.log('[message from webview]', message);
    switch (message.type) {
      case WEBVIEW_REACT_DIDMOUNT:
        // webview 初始化完成
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
      // webview 关闭后，复用时设置单例为空，非复用时删除对应的 map
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

export function activate(context: vscode.ExtensionContext) {
  // @ts-ignore
  let customConfig = vscode.workspace.getConfiguration(
    configurationKey
  ) as Config;
  config = merge(cloneDeep(defaultConfig), customConfig);

  highlightDecorationType = vscode.window.createTextEditorDecorationType(
    config.highlightConfig
  );

  // 注册 context，在 package.json editor/title 里用
  vscode.commands.executeCommand(
    'setContext',
    `${configurationKey}.supportedLanguageIds`,
    supportedLanguageIds
  );

  // 注册命令
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

  // 更新配置文件相关
  vscode.workspace.onDidChangeConfiguration((e) => {
    // @ts-ignore
    const newConfig = vscode.workspace.getConfiguration(
      configurationKey
    ) as Config;

    config = merge(cloneDeep(defaultConfig), newConfig);

    highlightDecorationType = vscode.window.createTextEditorDecorationType(
      config.highlightConfig
    );
  });

  // 监听当前文本变化
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

  // 监听当前 editor 变化，即从一个文件切到了另一个文件，切换对应的 AST webview
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

  // 监听当前 cursor 变化
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
    // 筛选出【改变 cursor 位置】这个行为

    // 这个行为只会有一个选中部分
    if (selections.length === 1) {
      const [selection] = selections;

      // 这个行为选中部分开始结束应该一致
      if (
        selection.start.line === selection.end.line &&
        selection.start.character === selection.end.character
      ) {
        // 发送当前 cursor 给 webview。因为 redux 里有对应的 action，所以直接发送 redux action 就可以
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
        // 一个文档关闭时，关掉对应 webview
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
