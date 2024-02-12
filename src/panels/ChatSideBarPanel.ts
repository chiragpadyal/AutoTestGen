import { Disposable, Webview, WebviewView, window, Uri, ViewColumn, WebviewViewProvider, workspace } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { LogLevel, Logger } from "../utilities/logger";
import askGpt from "../utilities/askGpt";
/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering HelloWorld webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class ChatSideBarPanel implements WebviewViewProvider {
  _panel?: WebviewView;
  _disposables: Disposable[] = [];
  logger = Logger.getInstance();

  constructor(private readonly _extensionUri: Uri) {
    this.logger.showChannel();
  }

  public resolveWebviewView(webviewView: WebviewView) {
    // this._panel = webviewView;
    this._panel = webviewView;
    this._panel.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, this._extensionUri);

    // Set up message passing from the webview to the extension
    this._setWebviewMessageListener(this._panel.webview);

  }



  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the Svelte webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the Svelte build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui-chat", "public", "build", "bundle.css"]);
    // The JS file from the Svelte build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui-chat", "public", "build", "bundle.js"]);
    const codiconsUri = getUri(webview ,extensionUri, ['node_modules', '@vscode/codicons', 'dist', 'codicon.css']);


    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Hello World</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <link href="${codiconsUri}" rel="stylesheet" />
          <script defer nonce="${nonce}" src="${scriptUri}"></script>
        </head>
        <body>
        </body>
      </html>
    `;
  }



  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;
        switch (command) {
          case "hello":
            window.showInformationMessage(text);
            return;
          case "ask":
            this.logger.log(LogLevel.INFO,  'ASK-BOT', `Received message from webview: ${text}`);
            let response = askGpt(text).then((response) => {
              this.logger.log(LogLevel.INFO,  'ASK-BOT', `Response from GPT-3: ${response}`);
              webview.postMessage({ command: "reply", text: response });
            }).catch((error) => {
              this.logger.log(LogLevel.ERROR,  'ASK-BOT', `Error from GPT-3: ${error}`);
              webview.postMessage({ command: "reply", text: "Server Down! try later..." });
            });
            return;
          default:
            return;
        }
      },
      undefined,
      this._disposables
    );
  }



}
