export * from '../web/src/store/actions';

// webview sends [react didmount] to vscode
export const WEBVIEW_REACT_DIDMOUNT = 'WEBVIEW_REACT_DIDMOUNT';
export function webviewReactDidmount(id) {
  return { type: WEBVIEW_REACT_DIDMOUNT, id };
}

// vscode sends [id] to webview
export const SEND_ID = 'SEND_ID';
export function sendId(id: string) {
  return { type: SEND_ID, id };
}

// vscode sends [redux action] to webview
export const REDUX_MESSAGE = 'REDUX_MESSAGE';
export function sendToRedux(id: string, reduxAction: any) {
  return { type: REDUX_MESSAGE, id, reduxAction };
}

// vscode sends [current file ext] to webview
export const SEND_EXT = 'SEND_EXT';
export function sendExt(id: string, ext: string) {
  return { type: SEND_EXT, id, ext };
}

// vscode sends [current file absolute path] to webview
export const SEND_FILEPATH = 'SEND_FILEPATH';
export function sendFilePath(id: string, filepath: string) {
  return { type: SEND_FILEPATH, id, filepath };
}

// webview sends [highlight info] to vscode
export const HIGHLIGHT = 'HIGHLIGHT';
export function highlight(id, range) {
  return { type: HIGHLIGHT, id, range };
}

// webview sends [clear highlight request] to vscode
export const CLEAR_HIGHLIGHT = 'CLEAR_HIGHLIGHT';
export function clearHighlight(id) {
  return { type: CLEAR_HIGHLIGHT, id };
}
