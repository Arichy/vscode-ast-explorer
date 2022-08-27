# vscode-ast-explorer README

This project is based on [astexplorer](https://github.com/fkling/astexplorer).
It allows you to see and interact with the ast of your code easily.

# How to use
- command: show ast.

- or click ast button at supported language editor's title area.
![alt command](https://github.com/Arichy/vscode-ast-explorer/raw/main/resources/markdown/usage.gif)

# Supported languages:

- `javascript`
- `typescript`
- `json`
- `html`
- `css`
- `vue`

# Default Configuration

```json
{
  "ast.highlightConfig": {
    "backgroundColor": "rgba(255,240,6,0.4)", // highlight backgroundColor
    "borderRadius": "3px" // highlight border-radius
  },
  "ast.reuseWebview": false // Does all ast open in one webview?
}
```
