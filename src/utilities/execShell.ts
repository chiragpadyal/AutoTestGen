import * as cp from "child_process";

export const execShell = (cmd: string) =>
    new Promise<string>((resolve, reject) => {
        cp.exec(cmd, (err, stdout, stderr) => {
            if (err) {
                process.stderr.write(stderr);
                return reject(err);
            }
            // const out = stdout.trim();
            process.stdout.write(stdout);
            return resolve(stdout);
        });
    });
