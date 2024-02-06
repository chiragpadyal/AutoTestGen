import { Disposable, Webview, WebviewView, window, Uri, ViewColumn, WebviewViewProvider, workspace } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import {ParseTask} from "../Workflows/ParseTask"
import * as Parser from 'web-tree-sitter'
import * as path from 'path'
import { LogLevel, Logger } from "../utilities/logger";
import ExecTest from "../Workflows/ExecTest";
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
export class SideBarPanel implements WebviewViewProvider {
  _panel?: WebviewView;
  _disposables: Disposable[] = [];
  logger = Logger.getInstance();
  private parseTask: ParseTask;

  constructor(private readonly _extensionUri: Uri, private readonly _extensionPath: string, _parseTask: ParseTask) {
    this.logger.showChannel();
    this.parseTask = _parseTask;
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

    // Update workspace folders
    this._updateWorkspaceFolders(this._panel.webview);

  }


  private _updateWorkspaceFolders(webview: Webview) {

    let _arr = () => {
      let projects = workspace.workspaceFolders?.map(folder => {
        return {
          "index": folder.index,
          "name": folder.name,
          "uri": folder.uri.fsPath
        }
      }) || [];
      webview.postMessage({ command: "parse", text: projects });
    }
    _arr();
    workspace.onDidChangeWorkspaceFolders(() => {
      _arr();
    });
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
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "public", "build", "bundle.css"]);
    // The JS file from the Svelte build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "public", "build", "bundle.js"]);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Hello World</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <script defer nonce="${nonce}" src="${scriptUri}"></script>
        </head>
        <body>
        </body>
      </html>
    `;
  }



  public async processJavaFiles(window: any, workspace: any) {
    let tests = [];
    let mains = [];
    const uris = await workspace.findFiles("**/*.java");

    for (const uri of uris) {
      const document = await workspace.openTextDocument(uri);
      const text = document.getText();

      if (text.match(new RegExp("@Test", "gm"))) {
        tests.push(uri.fsPath);
      } else {
        mains.push(uri.fsPath);
      }
    }

    return [tests, mains];
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
          case "parse":
            window.showInformationMessage(`Parsing ${text.name} ...` || "Nothing to parse");
            this.processJavaFiles(window, workspace).then((result) => {
              this.logger.log( LogLevel.INFO , "parse", `Parsing ${text.name} ...`);
              this.parseTask.parseProject(text.uri, result[0], result[1]);
            }).finally(() => {
              this.logger.log( LogLevel.INFO , "parse", `Parsing ${text.name} ... Done`);
              webview.postMessage({ command: "parse-done", text: "Done" });
            });
          case "compile":
            this.logger.log( LogLevel.INFO , "compile", `Compiling ${text.uri} ...`);
            try{
              new ExecTest(text.uri).runCompile().then(() => {
                this.logger.log( LogLevel.INFO , "compile", `Compile ... Done`);
              }).catch((e: any) => {
                this.logger.log( LogLevel.ERROR , "compile", `Compile ${text.uri} ${JSON.stringify(e)}... Failed`);
              });
            } catch (e: any) {
              this.logger.log( LogLevel.ERROR , "compile", `Compile ${text.uri} ${e} ... Failed`);
            }
            return;
          case "health":
            this.logger.log( LogLevel.INFO , "health", `Health Check ...`);
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
