import * as LocalStorage from './components/LocalStorage';
import ASTOutputContainer from './containers/ASTOutputContainer';
import CodeEditorContainer from './containers/CodeEditorContainer';
import ErrorMessageContainer from './containers/ErrorMessageContainer';
import GistBanner from './components/GistBanner';
import LoadingIndicatorContainer from './containers/LoadingIndicatorContainer';
import PasteDropTargetContainer from './containers/PasteDropTargetContainer';
import PropTypes from 'prop-types';
import { publish, subscribe } from './utils/pubsub.js';
import * as React from 'react';
import SettingsDialogContainer from './containers/SettingsDialogContainer';
import ShareDialogContainer from './containers/ShareDialogContainer';
import SplitPane from './components/SplitPane';
import ToolbarContainer from './containers/ToolbarContainer';
import TransformerContainer from './containers/TransformerContainer';
import debounce from './utils/debounce';
import { Provider, connect } from 'react-redux';
import { astexplorer, persist, revive } from './store/reducers';
import { createStore, applyMiddleware, compose } from 'redux';
import { canSaveTransform, getRevision } from './store/selectors';
import { loadSnippet, setCode, setFilepath, setId } from './store/actions';
import { render } from 'react-dom';
import * as gist from './storage/gist';
import * as parse from './storage/parse';
import StorageHandler from './storage';
import '../css/style.css';
import parserMiddleware from './store/parserMiddleware';
import snippetMiddleware from './store/snippetMiddleware.js';
import transformerMiddleware from './store/transformerMiddleware';
import cx from './utils/classnames.js';

import {
  webviewReactDidmount,
  REDUX_MESSAGE,
  SEND_EXT,
  selectCategory,
  setParser,
  highlight,
  SEND_FILEPATH,
  clearHighlight,
  SEND_ID,
} from '../../shared/actions';
import { extToCategoryIdMap, extToParserIdMap } from '../../shared/map';

import { getCategoryByID, getParserByID } from './parsers';

function resize() {
  publish('PANEL_RESIZE');
}

if (typeof acquireVsCodeApi === 'function') {
  const vscode = acquireVsCodeApi();
  window.vscode = vscode;
}

function App({ showTransformer, hasError }) {
  // vscode 发送消息给 webview
  React.useEffect(() => {
    const messageHandler = (e) => {
      if (!e.origin.startsWith('vscode-webview')) {
        return;
      }
      console.log('[message from vscode]', e.data);

      if (e.data.type === SEND_ID) {
        const { id } = e.data;
        store.dispatch(setId(id));

        return;
      }

      const { id } = store.getState();

      if (e.data.id !== id) {
        return;
      }

      switch (e.data.type) {
        // 获得当前文件的扩展名
        case SEND_EXT:
          const { ext } = e.data;

          // 根据扩展名获得 category id
          const categoryId = extToCategoryIdMap[ext] || 'javascript';

          // 根据 category id 获得 category
          const category = getCategoryByID(categoryId);

          //  修改 category
          store.dispatch(selectCategory(category));

          if (extToParserIdMap[ext]) {
            // 根据扩展名获得 parser id
            const parserId = extToParserIdMap[ext];

            // 根据 parser id 获得 parser
            const parser = getParserByID(parserId);

            // 修改 parser
            store.dispatch(setParser(parser));
          }
          return;

        // 获得当前文件的相对路径
        case SEND_FILEPATH:
          const { filepath } = e.data;
          if (filepath) {
            store.dispatch(setFilepath(filepath));
          }

          return;

        // 获得 redux action
        case REDUX_MESSAGE:
          store.dispatch(e.data.reduxAction);
          return;
      }
    };

    window.addEventListener('message', messageHandler);

    if (window.vscode) {
      window.vscode.postMessage(webviewReactDidmount());
    }

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  // 注册 ASToutput 发送的事件，转发给 vscode
  React.useEffect(() => {
    if (!window.vscode) {
      return;
    }

    subscribe('HIGHLIGHT', ({ range }) => {
      if (!range) {
        return;
      }

      const state = store.getState();
      const { id } = state;
      console.log(state, id);
      window.vscode.postMessage(highlight(id, range));
    });

    subscribe('CLEAR_HIGHLIGHT', () => {
      const { id } = store.getState();

      window.vscode.postMessage(clearHighlight(id));
    });
  }, []);

  return (
    <>
      <ErrorMessageContainer />
      <PasteDropTargetContainer id="main" className={cx({ hasError })}>
        <LoadingIndicatorContainer />
        <SettingsDialogContainer />
        <ShareDialogContainer />
        <ToolbarContainer />
        <GistBanner />
        <SplitPane
          className="splitpane-content"
          vertical={true}
          onResize={resize}
        >
          <SplitPane className="splitpane" onResize={resize}>
            {window.vscode ? null : <CodeEditorContainer />}

            <ASTOutputContainer />
          </SplitPane>
          {showTransformer ? <TransformerContainer /> : null}
        </SplitPane>
      </PasteDropTargetContainer>
    </>
  );
}

App.propTypes = {
  hasError: PropTypes.bool,
  showTransformer: PropTypes.bool,
};

const AppContainer = connect((state) => ({
  showTransformer: state.showTransformPanel,
  hasError: !!state.error,
}))(App);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const storageAdapter = new StorageHandler([gist, parse]);
const store = createStore(
  astexplorer,
  revive(LocalStorage.readState()),
  composeEnhancers(
    applyMiddleware(
      snippetMiddleware(storageAdapter),
      parserMiddleware,
      transformerMiddleware
    )
  )
);
store.subscribe(
  debounce(() => {
    const state = store.getState();
    // We are not persisting the state while looking at an existing revision
    if (!getRevision(state)) {
      LocalStorage.writeState(persist(state));
    }
  })
);
store.dispatch({ type: 'INIT' });

render(
  <Provider store={store}>
    <AppContainer />
  </Provider>,
  document.getElementById('container')
);

global.onhashchange = () => {
  store.dispatch(loadSnippet());
};

if (location.hash.length > 1) {
  store.dispatch(loadSnippet());
}

global.onbeforeunload = () => {
  const state = store.getState();
  if (canSaveTransform(state)) {
    return 'You have unsaved transform code. Do you really want to leave?';
  }
};
