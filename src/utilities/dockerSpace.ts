import { PassThrough } from "stream";
import { writeFile } from "./fsUtils";
import { LogLevel, Logger } from "./logger";

var Docker = require("dockerode");
var DockerodeCompose = require("dockerode-compose");

export class DockerSpace {
  docker: any;
  compose: any;
  constructor(private logger: Logger) {
    // check if system is windows or linux
    if (process.platform === "win32") {
      this.docker = new Docker({
        protocol: "http", //you can enforce a protocol
        host: "127.0.0.1",
        port: 2375,
        version: "v1.44",
      });
    } else {
      this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    }
  }

  private fixCommand(command: string) {
    // remove sudo from command
    let newCommand = command.replace("sudo", "");

    // add -y flag to apt-get or apt if not present
    if (newCommand.includes(" apt-get ") && !newCommand.includes("-y")) {
      newCommand = newCommand.replace(" apt-get ", " apt-get -y ");
    } else if (newCommand.includes(" apt ") && !newCommand.includes("-y")) {
      newCommand = newCommand.replace(" apt ", " apt -y ");
    }

    return newCommand;
  }

  async run_compose(composeFile: string, chatReply: any) {
    if (!this.docker) return;
    try {
      this.compose = new DockerodeCompose(this.docker, composeFile, "dev-env");
      await this.compose.pull();
      var state = await this.compose.up();
      this.logger.log(LogLevel.INFO, "dockerSpace", `State: ${state.toString()}`);
      chatReply({ command: "reply", text: `Started Containers Successfully` });
      console.log(state);
    } catch (error) {
      this.logger.log(LogLevel.ERROR, "dockerSpace", `Error from DockerSpace: ${error}`);
      chatReply({ command: "reply", text: `Failed to start container` });
      console.log(error);
    }
  }

  async run_command_in_container(containerName: string, command: string): Promise<PassThrough | undefined> {
    if (!this.docker) return;
    const container = this.docker.getContainer(containerName);
    const exec = await container.exec({
      Cmd: ["/bin/sh", "-c", this.fixCommand(command)],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
    });
    let outstream = new PassThrough();

    const stream = await exec.start({ hijack: true, stdin: true });
    return new Promise((resolve, reject) => {
      this.docker.modem.demuxStream(stream, outstream, process.stderr);
      exec.inspect((err: any, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(outstream);
        }
      });
    });
  }

  async destroy() {
    if (!this.docker && !this.compose) return;
    await this.compose.down({ volumes: true });
  }
}
