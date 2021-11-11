export * from '../web/src/store/actions';

// webview react didmount 发送给 vscode
export const WEBVIEW_REACT_DIDMOUNT = 'WEBVIEW_REACT_DIDMOUNT';
export function webviewReactDidmount(id) {
  return { type: WEBVIEW_REACT_DIDMOUNT, id };
}

// vscode 发送 id 给 webview
export const SEND_ID = 'SEND_ID';
export function sendId(id: string) {
  return { type: SEND_ID, id };
}

// vscode 发送 redux action 给 webview
export const REDUX_MESSAGE = 'REDUX_MESSAGE';
export function sendToRedux(id: string, reduxAction: any) {
  return { type: REDUX_MESSAGE, id, reduxAction };
}

// vscode 发送当前文件类型给 webview
export const SEND_EXT = 'SEND_EXT';
export function sendExt(id: string, ext: string) {
  return { type: SEND_EXT, id, ext };
}

// vscode 发送当前文件相对路径给 webview
export const SEND_FILEPATH = 'SEND_FILEPATH';
export function sendFilePath(id: string, filepath: string) {
  return { type: SEND_FILEPATH, id, filepath };
}

// webview react 发送 高亮信息 给 vscode
export const HIGHLIGHT = 'HIGHLIGHT';
export function highlight(id, range) {
  return { type: HIGHLIGHT, id, range };
}

// webview react 发送 清楚高亮 消息 给 vscode
export const CLEAR_HIGHLIGHT = 'CLEAR_HIGHLIGHT';
export function clearHighlight(id) {
  return { type: CLEAR_HIGHLIGHT, id };
}
