import { Disposable, Webview, WebviewView, window, Uri, ViewColumn, WebviewViewProvider, workspace } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import {ParseTask} from "../workflows/ParseTask"
import { LogLevel, Logger } from "../utilities/logger";
import ExecTest from "../workflows/ExecTest";
import { healthCheck } from "../utilities/healthCheck";
import askGpt from "../utilities/askGpt";
import { MessageType } from "../types/MessageType";
import { AllowedTag } from "../types/allowedTags";
/**
 * This class manages the state and behavior of  webview panel.
 */
export class SideBarPanel implements WebviewViewProvider {

  _panel?: WebviewView;
  _disposables: Disposable[] = [];
  logger = Logger.getInstance();
  private parseTask: ParseTask;

  /**
   * Initializes a new instance of the SideBar class.
   *
   * @param _extensionUri The URI of the context.extensionUri
   * @param _parseTask The parse task instance
   */
  constructor(private readonly _extensionUri: Uri, _parseTask: ParseTask) {
    this.logger.showChannel();
    this.parseTask = _parseTask;
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
   * @param message message to send in {@link MessageType}
   */
  private async chatReply(webview: Webview, message: MessageType){
    await webview.postMessage(message)
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
      this.logger.log(LogLevel.INFO, "parse", `Updating workspace folders ... ${projects[0].name}`);
      webview.postMessage({ command: "parse", text: projects });
    }
    _arr();
    workspace.onDidChangeWorkspaceFolders(() => {
      _arr();
    });
  }


  public sendCodeLensData(data: any) {
    if (this._panel) {
      let msg: MessageType = {
        command: "reply",
        text: `${AllowedTag.Method} generate test case for method`,
        from: "user"
      }
      this.chatReply(this._panel.webview, msg);

      this.logger.log(LogLevel.INFO, "parse", `Received data from code lens: ${data}`);
    }
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



  public async processJavaFiles() {
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


  private async loadResult(webview: Webview){
    this.logger.log(LogLevel.INFO, "parse", `refred webview`);
    const result = await this.processJavaFiles();
    if (result.length > 0)
    webview.postMessage({ command: "reply", text: `Hii, This project has ${result[0].length} focal classes and ${result[1].length} test classes ` });
  };

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private async _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(async (message: any) => {
      const command = message.command;
      const text = message.text;
      switch (command) {
        case "hello":
          window.showInformationMessage(text);
          return;
        case "parse-project":
          this.chatReply( webview, { command: "reply", text: `${AllowedTag.Parse} ${text.name}`, from: "user"})
          window.showInformationMessage(`Parsing ${text.name} ...` || "Nothing to parse");
          let result = null;
          try {
            result = await this.processJavaFiles();
            this.logger.log(LogLevel.INFO, "parse", `Parsing ${text.name} ...`);
            this.parseTask.parseProject(text.uri, result[0], result[1]);
            this.chatReply( webview, { command: "reply", text: `Parsing ${text.name} ... Done`, from: "bot"})
          } catch (error) {
            this.logger.log(LogLevel.ERROR, "parse", `Parsing ${text.name} ... Failed: ${error}`);
            this.chatReply( webview, { command: "reply", text: `Parsing ${text.name} Failed`, from: "bot"})
          } finally {
            this.logger.log(LogLevel.INFO, "parse", `Parsing ${text.name} ... Done`);
            if (result)
            webview.postMessage({ command: "parse-done", text: {
              "no-of-tests": result[0].length || 0,
              "no-of-mains": result[1].length || 0
            } });
          }
          return;
        case "compile":
          this.chatReply( webview, { command: "reply", text: `${AllowedTag.Compile} ${text.uri}`, from: "user"})
          this.logger.log(LogLevel.INFO, "compile", `Compiling ${text.uri} ...`);
          try {
            const execTest = new ExecTest(text.uri);
            await execTest.runCompile();
            this.logger.log(LogLevel.INFO, "compile", `Compile ... Done`);
            this.chatReply( webview, { command: "reply", text: `Compiled ${text.uri}`, from: "bot"})
            window.showInformationMessage(`Compiled ${text.uri}`);
            await execTest.runTestAll();
            this.logger.log(LogLevel.INFO, "compile", `Test ... Done`);
            this.chatReply( webview, { command: "reply", text: `Tested ${text.uri}`, from: "bot"})
            window.showInformationMessage(`Tested ${text.uri}`);       
          } catch (error) {
            this.logger.log(LogLevel.ERROR, "compile", `Compile/Test ${text.uri} ... Failed: ${error}`);
            this.chatReply( webview, { command: "reply", text: `Compile/Test ${text.uri} Failed`, from: "bot"})
          }
          return;
        case "health":
          this.chatReply( webview, { command: "reply", text: `${AllowedTag.HealthCheck}`, from: "user"})
          this.logger.log(LogLevel.INFO, "health", `Health Check ...`);
          const res = healthCheck(window);
          this.chatReply( webview, { command: "reply", text: `Java is installed ${res.javaInstalled} \nMaven is installed ${res.mavenInstalled}`, from: "bot"})
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
    }, undefined, this._disposables);
  }


  /**
   * Disposes of the resources used by the webview panel.
   */
  public dispose() {
    this._disposables.forEach((d) => d.dispose())
  }
}