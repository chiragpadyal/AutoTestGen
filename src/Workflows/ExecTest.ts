import * as path from 'path';
import * as fs from 'fs';
import { execShell } from '../utilities/execShell';
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";

export default class ExecTest {
    constructor(private readonly _projectPath: string) {
        this.addJacocoPlugin();
    }

    private addJacocoPlugin() {
        try {

            const parser = new XMLParser();
            const configFile = path.join(this._projectPath, 'pom.xml');
            const content = fs.readFileSync(configFile, 'utf8');
            let jObj = parser.parse(content);

            if (jObj.project.build.plugins.plugin.find((plugin: any) => plugin.artifactId === 'jacoco-maven-plugin') !== undefined) {
                return;
            }

            jObj.project.build.plugins.plugin.push({
                "groupId": "org.jacoco",
                "artifactId": "jacoco-maven-plugin",
                "version": "0.8.11",
                "executions": {
                    "execution": [
                        {
                            "goals": {
                                "goal": "prepare-agent"
                            }
                        },
                        {
                            "id": "report",
                            "phase": "test",
                            "goals": {
                                "goal": "report"
                            }
                        }
                    ]
                }
            });

            const builder = new XMLBuilder();
            const xmlContent = builder.build(jObj);
            fs.writeFileSync(configFile, xmlContent, 'utf8');
        } catch (e) {
            throw new Error('Error adding Jacoco plugin to pom.xml');
        }
    }

    private buildCmd(execute: string, defines: { [name: string]: string }, file: string = 'pom.xml') {
        const args = [];
        let cmd = 'mvn ' + execute + ' -f ' + file + ' ';
        if (defines) {
            for (let define in defines) {
                if (defines.hasOwnProperty(define)) {
                    args.push(`-D${define}=${defines[define]}`);
                }
            }
        }
        cmd += ` ${args.join(' ')}`;
        return cmd;
    }

    async runCompile() {
        let cmd = this.buildCmd(
            'clean install',
            { 'skipTests': 'true' },
            path.join(this._projectPath, 'pom.xml')
        );
        await execShell(cmd);
    }

    async runTest(_test: string) {
        let cmd = this.buildCmd(
            'test',
            { 'test': _test },
            path.join(this._projectPath, 'pom.xml')
        );
        await execShell(cmd);
    }

    async runTestAll() {
        let cmd = this.buildCmd(
            'test',
            {},
            path.join(this._projectPath, 'pom.xml')
        );
        await execShell(cmd);
    }

    // async runJacoco() {
    //     let cmd = this.buildCmd(
    //         'jacoco:report',
    //         {},
    //         path.join(this._projectPath, 'pom.xml')
    //     );
    //     await execShell(cmd);
    // }
}