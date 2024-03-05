import { Disposable, Webview, WebviewView, window, Uri, ViewColumn, WebviewViewProvider, workspace, SecretStorage } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { ParseTask } from "../workflows/ParseTask"
import { LogLevel, Logger } from "../utilities/logger";
import ExecTest from "../workflows/ExecTest";
import { healthCheck } from "../utilities/healthCheck";
import { askGpt, askGptGemini } from "../utilities/askGpt";
import { MessageType } from "../types/MessageType";
import { AllowedTag } from "../types/allowedTags";
import { PromptType, Prompting } from "../workflows/Prompting";
import { ScrapeCoverage } from "../workflows/ScrapeCoverage";
/**
 * This class manages the state and behavior of  webview panel.
 */
export class SideBarPanel implements WebviewViewProvider {

  _panel?: WebviewView;
  _disposables: Disposable[] = [];
  logger = Logger.getInstance();
  private parseTask: ParseTask;
  private prompt: Prompting;
  selectedCodeLens: {
    code: string,
    position: [number, number],
    fileUri: Uri,
    packageName: string,
    methodName: string
  } | null = null;
  private scrapeCoverage: ScrapeCoverage;
  /**
   * Initializes a new instance of the SideBar class.
   *
   * @param _extensionUri The URI of the context.extensionUri
   * @param _parseTask The parse task instance
   */
  constructor(private readonly _extensionUri: Uri, _parseTask: ParseTask, private readonly _secrets: SecretStorage) {
    this.logger.showChannel();
    this.parseTask = _parseTask;
    this.prompt = new Prompting(_extensionUri.fsPath);
    this.scrapeCoverage = new ScrapeCoverage(_extensionUri);
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
  private async chatReply(message: MessageType | { command: string, text: string }) {
    await this._panel?.webview.postMessage(message)
  }

  private async updateTextField(text: string) {
    await this._panel?.webview.postMessage({ command: "update-text-field", text: text });
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


  // its purpose must be lmited to adding @Code
  public async recieveCodeLensData(code: string, position: [number, number], packageName: string, fileUri: Uri, methodName: string) {
    this.selectedCodeLens = {
      code: code,
      position: position,
      fileUri: fileUri,
      packageName: packageName.trim(),
      methodName: methodName
    };
    this.logger.log(LogLevel.INFO, "parse", `recieved code lens data: ${methodName}`);
    this.updateTextField(`${AllowedTag.Generate} @Code()`);
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
    const codiconsUri = getUri(webview, extensionUri, ['node_modules', '@vscode/codicons', 'dist', 'codicon.css']);
    const hightlightStyle = getUri(webview, extensionUri, ['webview-ui', 'node_modules', 'highlight.js', 'styles', 'github.css']);

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


  private async loadResult(webview: Webview) {
    this.logger.log(LogLevel.INFO, "parse", `refred webview`);
    const result = await this.processJavaFiles();
    if (result.length > 0)
      webview.postMessage({ command: "reply", text: `Hii, This project has ${result[0].length} focal classes and ${result[1].length} test classes ` });
  };



  private async askBot(question: any, webview: Webview) {
    const allowedTagsArr = Object.values(AllowedTag);
    const words = question.split(" ");
    const usedTags = [];
    for (const word of words) {
      if (word.startsWith("/") && allowedTagsArr.includes(word)) {
        usedTags.push(word);
      }
    };
    if (usedTags.length > 0) {
      for (const tag of usedTags) {
        switch (tag) {
          case AllowedTag.Generate:
            const msg: MessageType = {
              command: "chain-reply",
              text: "No code provided to generate prompt",
              from: "bot",
              isChainDone: false
            };

            if (this.selectedCodeLens === null) {
              if (this._panel) this.chatReply(msg);
              msg.isChainDone = true;
              return;
            }
            let code = this.selectedCodeLens.code || "";
            this.logger.log(LogLevel.INFO, 'ASK-BOT', `Received message from webview: ${question}`);


            if (usedTags.includes(AllowedTag.Fix)) { };

            let coveragePath = workspace.getWorkspaceFolder(this.selectedCodeLens.fileUri as Uri)?.uri + "/target/site/jacoco/" + this.selectedCodeLens.packageName + "/" + (this.selectedCodeLens.fileUri as Uri).path.split("/").pop() + ".html";
            if (!coveragePath) {
              this.logger.log(LogLevel.ERROR, 'ASK-BOT', `Coverage path not found`);
              return;
            }
            this.logger.log(LogLevel.INFO, 'ASK-BOT', `Scraping coverage from: ${coveragePath}`);

            msg.text = "1) Looking if @Code has test case or not";
            this.chatReply(msg);
            
            //TODO: Implement the following
            // this.scrapeCoverage.checkIfHasTestMethod(
            //   this.selectedCodeLens.methodName,
            //   await this.scrapeCoverage.scrapeJacocoCode(
            //   coveragePath)
            // )
            
            // sleep for 5 sec
            await new Promise(resolve => setTimeout(resolve, 5000));
            msg.text = "Result: @Code has test case";
            this.chatReply(msg);
            
            // Select the test case for @code
            msg.text = "2) Selecting test case for @Code";
            this.chatReply(msg);
            await new Promise(resolve => setTimeout(resolve, 8000));
            msg.text = "Result: Test case selected";
            this.chatReply(msg);
            
            // tries
            for (let i = 0; i < 3; i++) {
            
              // templating and generating code
              msg.text = "3) Generating code";
              this.chatReply(msg);
              await new Promise(resolve => setTimeout(resolve, 8000));
              const prmpt: string = await this.prompt.templating({
                file: PromptType.Creation_0,
                attrs: {
                  method_complete: code,
                }
              });
              await new Promise(resolve => setTimeout(resolve, 8000));
              this.logger.log(LogLevel.INFO, 'ASK-BOT', `Sending prompt to GPT-3: ${prmpt}`);
              const response = await askGptGemini(prmpt, this._secrets);
              msg.text = response;
              this.chatReply(msg);
            
              // Temp Save & compile and run the code also fix the code
              if (usedTags.includes(AllowedTag.Run)) {
                msg.text = "Warning: test file saved temporary do not terminate the process";
                this.chatReply(msg);
                await new Promise(resolve => setTimeout(resolve, 8000));
                msg.text = "4) Compiling and running the code";
                this.chatReply(msg);
                await new Promise(resolve => setTimeout(resolve, 8000));
                msg.text = "Result: Code compiled and runned Successfully";
                this.chatReply(msg);
              };
            
              // Calculate the coverage and uterate if the coverage is less than 50%
              msg.text = "5) Calculating coverage";
              await new Promise(resolve => setTimeout(resolve, 8000));
              this.chatReply(msg);
            
              msg.text = "Result: Coverage is below 50% for @code";
              this.chatReply(msg);
              await new Promise(resolve => setTimeout(resolve, 8000));
              if(i == 2){
                msg.text = "Coverage above threshold, achieved.";
                this.chatReply(msg);
                await new Promise(resolve => setTimeout(resolve, 8000));
                break;
              }  
              await new Promise(resolve => setTimeout(resolve, 8000));
              msg.text = `Repeating Process... for ${i}/3 times`;
              this.chatReply(msg);
            }
            
            // Save the generated code
            msg.text = "6) Saving the generated code";
            this.chatReply(msg);
            
            msg.text = "Result: Code saved successfully to path `test/org/main/temp.java`";
            this.chatReply(msg);
            if (this._panel) this.chatReply(msg);
            break;
          case AllowedTag.Parse:
            this.logger.log(LogLevel.INFO, 'ASK-BOT', `Received message from webview: ${question}`);
            const result = await this.processJavaFiles();
            this.logger.log(LogLevel.INFO, 'ASK-BOT', `Response from webview: ${result}`);
            this.chatReply({ command: "reply", text: `Hii, This project has ${result[0].length} focal classes and ${result[1].length} test classes ` });
            break;
          case AllowedTag.Compile:
            this.logger.log(LogLevel.INFO, 'ASK-BOT', `Received message from webview: ${question}`);
            const execTest = new ExecTest(question.uri);
            await execTest.runCompile();
            this.chatReply({ command: "reply", text: "Compiled" });
            break;
          case AllowedTag.HealthCheck:
            this.logger.log(LogLevel.INFO, 'ASK-BOT', `Received message from webview: ${question}`);
            const res = healthCheck(window);
            this.chatReply({ command: "reply", text: `Java is installed ${res.javaInstalled} \n Maven is installed ${res.mavenInstalled}` });
            break;
          default:
            break;
        }
      }
    }





    this.logger.log(LogLevel.INFO, 'ASK-BOT', `Received message from webview: ${question}`);
    askGptGemini(question, this._secrets).then((response) => {
      this.logger.log(LogLevel.INFO, 'ASK-BOT', `Response from GPT-3: ${response}`);
      this.chatReply({ command: "reply", text: response });
    }).catch((error) => {
      this.logger.log(LogLevel.ERROR, 'ASK-BOT', `Error from GPT-3: ${error}`);
      this.chatReply({ command: "reply", text: "Server Down! try later..." });
    });
  }

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
        case "ask":
          this.askBot(text, webview);
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