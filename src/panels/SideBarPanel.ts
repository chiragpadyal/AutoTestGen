import {
  Disposable,
  Webview,
  WebviewView,
  window,
  Uri,
  ViewColumn,
  WebviewViewProvider,
  workspace,
  SecretStorage,
} from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { ParseTask } from "../workflows/ParseTask";
import { LogLevel, Logger } from "../utilities/logger";
import ExecTest from "../workflows/ExecTest";
import { healthCheck } from "../utilities/healthCheck";
import { processJavaFiles } from "../utilities/processJavaFiles";
import { MessageType } from "../types/MessageType";
// import { AllowedTag } from "../types/allowedTags";
import { PromptType, Prompting } from "../workflows/Prompting";
import { ScrapeCoverage } from "../workflows/ScrapeCoverage";
import { joinPath, writeFile } from "../utilities/fsUtils";
import { AskGPT } from "../utilities/askGpt";
import { DockerSpace } from "../utilities/dockerSpace";
import BotPath from "../workflows/BotPath";
/**
 * This class manages the state and behavior of  webview panel.
 */
export class SideBarPanel implements WebviewViewProvider {
  _panel?: WebviewView;
  _disposables: Disposable[] = [];
  logger = Logger.getInstance();
  private parseTask: ParseTask;
  private prompt: Prompting;
  private askGpt: AskGPT;
  private botPath: BotPath;
  selectedCodeLens: {
    code: string;
    position: [number, number];
    fileUri: Uri;
    packageName: string;
    methodName: string;
  } | null = null;
  private scrapeCoverage: ScrapeCoverage;
  /**
   * Initializes a new instance of the SideBar class.
   *
   * @param _extensionUri The URI of the context.extensionUri
   * @param _parseTask The parse task instance
   */
  constructor(
    private readonly _extensionUri: Uri,
    _parseTask: ParseTask,
    private readonly _secrets: SecretStorage,
    private readonly _storageUri: Uri
  ) {
    this.logger.showChannel();
    this.parseTask = _parseTask;
    this.prompt = new Prompting(_extensionUri.fsPath);
    this.scrapeCoverage = new ScrapeCoverage(_storageUri, this.logger);
    this.askGpt = new AskGPT(_secrets, "tinyollama", _extensionUri, this.logger);
    const workspaceFolderUri = workspace.workspaceFolders?.[0]?.uri || Uri.file("");
    this.botPath = new BotPath(workspaceFolderUri, this.logger, this.askGpt, _extensionUri, this.parseTask);
  }

  public resolveWebviewView(webviewView: WebviewView) {
    this.logger.log(LogLevel.INFO, "parse", `Resolving webview ...`);
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

    // Load result
    // this.loadResult(this._panel.webview);

    // Update workspace folders
    this._updateWorkspaceFolders(this._panel.webview);
  }

  /**
   *
   * @param webview webview to send message
   * @param message message to send in {@link MessageType} or {command: string, text: any} format
   */
  private async chatReply(message: MessageType | { command: string; text: string }) {
    await this._panel?.webview.postMessage(message);
  }

  private async updateTextField(text: string) {
    await this._panel?.webview.postMessage({ command: "update-text-field", text: text });
  }

  private _updateWorkspaceFolders(webview: Webview) {
    let _arr = () => {
      let projects =
        workspace.workspaceFolders?.map((folder) => {
          return {
            index: folder.index,
            name: folder.name,
            uri: folder.uri.fsPath,
          };
        }) || [];
      this.logger.log(LogLevel.INFO, "parse", `Updating workspace folders ... ${projects[0].name}`);
      webview.postMessage({ command: "parse", text: projects });
    };
    _arr();
    workspace.onDidChangeWorkspaceFolders(() => {
      _arr();
    });
  }

  // its purpose must be lmited to adding @Code
  public async recieveCodeLensData(
    code: string,
    position: [number, number],
    packageName: string,
    fileUri: Uri,
    methodName: string
  ) {
    this.selectedCodeLens = {
      code: code,
      position: position,
      fileUri: fileUri,
      packageName: packageName.trim(),
      methodName: methodName,
    };
    this.logger.log(LogLevel.INFO, "parse", `recieved code lens data: ${methodName}`);
    this.logger.log(LogLevel.INFO, "parse-code", code);
    this.updateTextField(`@Code()`);
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
    const codiconsUri = getUri(webview, extensionUri, [
      "node_modules",
      "@vscode/codicons",
      "dist",
      "codicon.css",
    ]);
    const hightlightStyle = getUri(webview, extensionUri, [
      "webview-ui",
      "node_modules",
      "highlight.js",
      "styles",
      "github.css",
    ]);

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
          <link rel="stylesheet"  href="${codiconsUri}" />
          <link rel="stylesheet" type="text/css" href="${hightlightStyle}" />
          <script defer nonce="${nonce}" src="${scriptUri}"></script>
        </head>
        <body>
        </body>
      </html>
    `;
  }

  private async loadResult(webview: Webview) {
    this.logger.log(LogLevel.INFO, "parse", `refred webview`);
    const result = await processJavaFiles();
    if (result.length > 0)
      webview.postMessage({
        command: "reply",
        text: `Hii, This project has ${result[0].length} focal classes and ${result[1].length} test classes `,
      });
  }

  private async askBot(question: any, webview: Webview) {

    try{
      await this.botPath.determinePath(this.chatReply.bind(this), question, this.selectedCodeLens);
    } catch (error) {
      this.chatReply({ command: "reply", text: "NETWORK ERROR!" });
      this.logger.log(LogLevel.ERROR, 'CHATBOT', `Error Responding: ${error}`);
      console.log(error)
    }
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private async _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const text = message.text;
        switch (command) {
          case "ask":
            this.askBot(text, webview);
            return;
          default:
            return;
        }
      },
      undefined,
      this._disposables
    );
  }

  /**
   * Disposes of the resources used by the webview panel.
   */
  public dispose() {
    this._disposables.forEach((d) => d.dispose());
  }
}
