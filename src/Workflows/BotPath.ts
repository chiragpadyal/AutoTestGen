import { Uri, workspace } from "vscode";
import { DockerSpace } from "../utilities/dockerSpace";
import { Logger, LogLevel } from "../utilities/logger";
import { AskGPT } from "../utilities/askGpt";
import { readFile, writeFile } from "../utilities/fsUtils";
import * as Mustache from "mustache";
import generateRandomString from "../utilities/randomString";
import { PassThrough } from "stream";
import { PromptType, Prompting } from "./Prompting";
import { ParseTask } from "./ParseTask";
import { processJavaFiles } from "../utilities/processJavaFiles";
import ExecTest from "./ExecTest";

type CodelensCode = {
  code: string;
  position: [number, number];
  fileUri: Uri;
  packageName: string;
  methodName: string;
} | null;

export default class BotPath {
  isConfirmationMode: { task: string[]; mode: boolean } = { task: [], mode: false };
  // TODO: remove this line
  // isConfirmationMode: { task: string[]; mode: boolean } = {
  //   task: ["generate_tests"],
  //   mode: true,
  // };
  isConfirmationDockerCompose: boolean = false;
  dockerSpace: DockerSpace;
  streamCommands: Logger;
  prompt: Prompting;
  execTest: ExecTest;
  constructor(
    private readonly _workspaceUri: Uri,
    private readonly logger: Logger,
    private readonly askGpt: AskGPT,
    private readonly extensionUri: Uri,
    private readonly parseTask: ParseTask
  ) {
    this.dockerSpace = new DockerSpace(logger);
    this.streamCommands = new Logger("Commands");
    this.prompt = new Prompting(extensionUri.fsPath);
    this.execTest = new ExecTest("/home/dev/app");
  }

  async determinePath(chatReply: any, question: string, selectedCodeLens: CodelensCode) {
    if (this.isConfirmationMode.mode) {
      await this.confirmationAgent(chatReply, question, selectedCodeLens);
      return;
    }
    const deterministicAgents = await this.deterministicAgent(question);
    // TODO: remove this line
    // const deterministicAgents: string[] = [];
    if (deterministicAgents.length > 0) {
      chatReply({ command: "reply", text: deterministicAgents.join("\n") });
      chatReply({
        command: "reply",
        text: "Is above generated result satisfactory, only reply with YES or NO!",
      });
      this.isConfirmationMode.mode = true;
      this.isConfirmationMode.task = deterministicAgents;
    } else {
      await this.normalConversation(chatReply, question);
    }
  }

  private async confirmationAgent(chatReply: any, question: string, code: CodelensCode) {
    if (question.toLowerCase().includes("yes")) {
      chatReply({ command: "reply", text: "Great! I will proceed with the above result." });
      this.isConfirmationMode.mode = false;
      this.executeTask(chatReply, question, code);
    } else if (question.toLowerCase().includes("no")) {
      chatReply({ command: "reply", text: "Ok! State changes required in above response" });
      this.isConfirmationMode.mode = false;
      this.isConfirmationMode.task = [];
    } else {
      chatReply({ command: "reply", text: "I am sorry, I only understand YES or NO!" });
    }
  }

  private executeTask(chatReply: any, question: string, code: CodelensCode, error: string = "") {
    // execute task
    this.isConfirmationMode.task.forEach(async (task) => {
      switch (task) {
        case "parse_code":
          let [test, mains] = await processJavaFiles();
          if (workspace.workspaceFolders) {
            await this.parseTask.parseProject(workspace.workspaceFolders[0].name, test, mains);
          }
          break;
        case "generate_compose":
          await this.dockerConstruct(chatReply);
          break;
        case "run_container":
          await this.runContainer(chatReply);
          break;
        case "generate_installation_commands":
          await this.setupContainerCommands(chatReply);
          break;
        case "execute_installation_commands":
          await this.runContainerCommands(chatReply);
          break;
        case "delete_container":
          await this.dockerSpace.destroy();
          break;
        case "generate_tests":
          await this.generateTests(chatReply, code, question);
          break;
        case "run_tests":
          await this.runTests(chatReply, "");
          break;
        case "save_tests":
          await this.saveTests(chatReply, "");
          break;
        case "fix_tests":
          await this.fixTests(chatReply, "", error);
          break;
        default:
          break;
      }
    });
    // reset task
    this.isConfirmationMode.task = [];
  }

  private async deterministicAgent(question: string): Promise<string[]> {
    var deterministicAgent = await readFile(
      Uri.joinPath(this.extensionUri, "src", "agents", "deterministic_agent.mustache")
    );

    deterministicAgent = Mustache.render(deterministicAgent, { question: question });

    let res = await this.askGpt.askOllama(deterministicAgent);

    if (res.includes("normal") || !res.includes("[") || !res.includes("]")) {
      return [];
    }

    // parse
    let pattern = /\[(.*?)\]/gm;
    let matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(res)) !== null) {
      matches.push(match[1].replace(/"/g, "").split(",")[0]);
    }

    return matches;
  }

  private async normalConversation(chatReply: any, question: string) {
    const res = await this.askGpt.askGptGemini(question);
    chatReply({ command: "reply", text: res });
  }

  /**
   * Agent to create docker compose for test environment
   * @returns docker-compose.yml content as string
   */
  private async packContainer(readme_path: string): Promise<string> {
    const networks = {
      default: {
        external: {
          name: "bridge",
        },
      },
    };

    const defaultNetwork = ["default"];

    let dockerJson: any = await readFile(
      Uri.joinPath(this.extensionUri, "src", "agents", "docker-compose.base.json")
    );
    dockerJson = JSON.parse(dockerJson);

    var dockerAgent = await readFile(
      Uri.joinPath(this.extensionUri, "src", "agents", "docker_agent.mustache")
    );

    var readme = "";
    try {
      readme = await readFile(Uri.joinPath(this._workspaceUri, "README.md"));
    } catch (e) {
      readme = "";
    }

    dockerAgent = Mustache.render(dockerAgent, { readme: readme, userchanges: "" });
    // ask

    // this.logger.log(LogLevel.INFO, "prompt", dockerAgent);
    const res = await this.askGpt.askGptGemini(dockerAgent);
    this.logger.log(LogLevel.INFO, "response", res);

    // parse
    let pattern = /<service>(.*?)<\/service>/g;
    let matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(res)) !== null) {
      let ser = JSON.parse(match[1]);
      let container_name: string = ser["container_name"] ?? generateRandomString(5);
      ser["networks"] = defaultNetwork;
      dockerJson.services[container_name] = ser;
    }

    if (Object.keys(dockerJson.services).length >= 2) {
      dockerJson["networks"] = networks;
    }

    return JSON.stringify(dockerJson);
  }

  /**
   * Agent to returns commands be to executed in container for setup and execution of project
   * @returns {"installation": string[], "execution": string[]}
   */
  private async setupContainerCommands(
    chatReply: any
  ): Promise<{ installation: string[]; execution: string[] }> {
    this.logger.log(LogLevel.INFO, "dockerSpace", `Fetching up Docker Container Commands...`);
    var commandAgent = await readFile(
      Uri.joinPath(this.extensionUri, "src", "agents", "commands_agent.mustache")
    );
    commandAgent = Mustache.render(commandAgent, { readme: "", userchanges: "" });
    this.logger.log(LogLevel.INFO, "commands-ask", commandAgent);
    // ask
    let res = "";
    try {
      res = await this.askGpt.askGptGemini(commandAgent);
      this.logger.log(LogLevel.INFO, "commands-resp", res);
    } catch (e: any) {
      this.logger.log(LogLevel.ERROR, "commands-resp", e);
    }
    // parse
    let pattern = /<command-install>(.*?)<\/command-install>/g;
    let matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(res)) !== null) {
      matches.push(match[1]);
    }
    this.logger.log(LogLevel.INFO, "commands-resp", matches.toString());

    let pattern2 = /<command-exec>(.*?)<\/command-exec>/g;
    let matches2: string[] = [];
    let match2: RegExpExecArray | null;
    while ((match2 = pattern2.exec(res)) !== null) {
      matches2.push(match2[1]);
    }
    this.logger.log(LogLevel.INFO, "commands-resp", matches2.toString());

    const filePath: Uri = Uri.joinPath(this._workspaceUri, "commands.json");
    await writeFile(filePath, JSON.stringify({ installation: matches, execution: matches2 }, null, 4));

    chatReply({
      command: "reply",
      text: `Commands generated successfully! at location \`${filePath.fsPath}\`
    \`\`\`json
    ${JSON.stringify({ installation: matches, execution: matches2 }, null, 4)}
    \`\`\`
    `,
    });

    return { installation: matches, execution: matches2 };
  }

  private async runContainerCommands(chatReply: any) {
    try {
      const filePath: Uri = Uri.joinPath(this._workspaceUri, "commands.json");
      const commands = await readFile(filePath);
      const commandsJson = JSON.parse(commands);
      const installationCommands = commandsJson["installation"];
      const executionCommands = commandsJson["execution"];
      chatReply({ command: "reply", text: "Running Installation Commands..." });
      for (let i = 0; i < installationCommands.length; i++) {
        chatReply({ command: "reply", text: installationCommands[i] });
        let strmOut = await this.dockerSpace.run_command_in_container(
          "ubuntu-test-enviroment",
          installationCommands[i]
        );
        if (strmOut instanceof PassThrough) {
          await this.streamCommands.stream(strmOut);
        }
      }
      chatReply({ command: "reply", text: "Running Execution Commands..." });
      for (let i = 0; i < executionCommands.length; i++) {
        chatReply({ command: "reply", text: executionCommands[i] });
        let strmOut = await this.dockerSpace.run_command_in_container(
          "ubuntu-test-enviroment",
          executionCommands[i]
        );
        if (strmOut instanceof PassThrough) {
          if (strmOut instanceof PassThrough) {
            // this.streamCommands.stream(strmOut);
            await this.streamCommands.stream(strmOut);
          }
        }
      }
    } catch (error) {
      this.logger.log(LogLevel.ERROR, "dockerSpace", `Error from DockerSpace: ${error}`);
      chatReply({ command: "reply", text: `Failed to start container` });
      console.log(error);
    }
  }

  /**
   * start docker container
   * @returns docker-compose.yml content as string
   */
  private async dockerConstruct(chatReply: any) {
    const filePath: Uri = Uri.joinPath(this._workspaceUri, "workspace.json");

    chatReply({
      command: "reply",
      text: "Is there any README or Installation file for the project? mention path. Currently selecting `README.md` file at project root! ",
    });
    const dockerComposeStr: string = await this.packContainer("");

    chatReply({
      command: "reply",
      text: `
        Generating Docker Compose file...
        \`\`\`json
        ${JSON.stringify(JSON.parse(dockerComposeStr), null, 4)}
        \`\`\`
  
        Type YES to continue
        `,
    });

    await writeFile(filePath, dockerComposeStr);
    chatReply({
      command: "reply",
      text: `Docker Compose file generated successfully! at location \`${filePath.fsPath}\``,
    });
  }

  private async runContainer(chatReply: any) {
    this.logger.log(LogLevel.INFO, "dockerSpace", `Running Docker Compose...`);
    const filePath: Uri = Uri.joinPath(this._workspaceUri, "workspace.json");
    try {
      await this.dockerSpace.run_compose(filePath.fsPath, chatReply);
    } catch (error) {
      this.logger.log(LogLevel.ERROR, "dockerSpace", `Error from DockerSpace: ${error}`);
      chatReply({ command: "reply", text: `Failed to start container` });
      console.log(error);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                Task related to test generation and execution               */
  /* -------------------------------------------------------------------------- */

  async generateTests(chatReply: any, focalMethod: CodelensCode, question: string) {
    this.logger.log(
      LogLevel.INFO,
      "check-gemini",
      await this.askGpt.askGptGemini("Generate test case ti add two number in java")
    );
    if (!focalMethod?.code) {
      chatReply({ command: "reply", text: "No focal method selected!" });
      return;
    }

    const prmpt: string = await this.prompt.templating({
      file: PromptType.Creation_0,
      attrs: {
        method_complete: focalMethod.code,
      },
    });

    const response = await this.askGpt.askGptGemini(prmpt);
    chatReply({ command: "reply", text: response });
  }

  async runTests(chatReply: any, generatedTest: string) {
    chatReply({ command: "reply", text: "Executing New Generated Test" });
    let cmd , strmOut;
    cmd = this.execTest.runCompile();

    strmOut = await this.dockerSpace.run_command_in_container("ubuntu-test-enviroment", cmd);
    if (strmOut instanceof PassThrough) {
      if (strmOut instanceof PassThrough) {
        // this.streamCommands.stream(strmOut);
        await this.streamCommands.stream(strmOut);
      }
    }

    chatReply({ command: "reply", text: "Java Project Compiled Successfully" });

    cmd = this.execTest.runTest("test_case");

    strmOut = await this.dockerSpace.run_command_in_container("ubuntu-test-enviroment", cmd);
    if (strmOut instanceof PassThrough) {
      if (strmOut instanceof PassThrough) {
        // this.streamCommands.stream(strmOut);
        await this.streamCommands.stream(strmOut);
      }
    }

    chatReply({ command: "reply", text: "Test Execution Completed" });

    cmd = this.execTest.runJacoco();

    strmOut = await this.dockerSpace.run_command_in_container("ubuntu-test-enviroment", cmd);
    if (strmOut instanceof PassThrough) {
      if (strmOut instanceof PassThrough) {
        // this.streamCommands.stream(strmOut);
        await this.streamCommands.stream(strmOut);
      }
    }

    chatReply({ command: "reply", text: "Jacoco Report Generated" });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    chatReply({ command: "reply", text: "View Jacoco Report at http://localhost:7777" });
  }

  async saveTests(chatReply: any, generatedTest: string, isTempory: boolean = false) {
    const testFolder = ["src", "tests"];
    const path = Uri.joinPath(this._workspaceUri, ...testFolder, "test_case.py").fsPath;
    const resp = await this.askGpt.askGptGemini(`Saving test case at \`${path}\``);
    chatReply({ command: "reply", text: resp });
  }

  async fixTests(chatReply: any, generatedTest: string, error: string) {
    const prmpt: string = await this.prompt.templating({
      file: PromptType.Repair_1,
      attrs: {
        error: error,
        method_complete: generatedTest,
      },
    });
    const response = await this.askGpt.askGptGemini(prmpt);
    chatReply({
      command: "reply",
      text: `Fixing Test Cases:
    ${response}
    `,
    });
  }
}
