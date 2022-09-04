# vscode-ast-explorer README

This project is based on [astexplorer](https://github.com/fkling/astexplorer).
It allows you to inspect and interact with the ast of your code easily.

# How to use? There are 2 ways:

- Use command: `show ast`.

- Click ast button at supported language editor's title area.(make sure the value of option `ast.hideEditorTitleButton` is `false`)
  ![alt command](https://github.com/Arichy/vscode-ast-explorer/raw/main/resources/markdown/usage.gif)

# Supported languages:

- `javascript`
- `typescript`
- `jsx`
- `tsx`
- `json`
- `html`
- `css`
- `scss`
- `less`
- `vue`

# Default Configuration

```json
{
  "ast.highlightConfig": {
    "backgroundColor": "rgba(255,240,6,0.4)", // highlight backgroundColor
    "borderRadius": "3px" // highlight border-radius
  },
  "ast.reuseWebview": false, // Does all ast open in one webview?
  "ast.hideEditorTitleButton": false // whether to hide the ast button in editor's title area, set to true if there are too many buttons in your title area.
}
```
