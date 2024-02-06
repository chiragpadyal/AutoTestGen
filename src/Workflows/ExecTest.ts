
// import Maven from 'maven';
import * as path from 'path';
import * as fs from 'fs';
import { execShell } from '../utilities/execShell';
export default class ExecTest {
    constructor(private readonly _projectPath: string) {}

    addJacocoPlugin() {
        const configFile = path.join(this._projectPath, 'pom.xml');
        const content = fs.readFileSync(configFile, 'utf8');
    }

    async runCompile() {
        await execShell(`mvn clean install -f ${path.join(this._projectPath, 'pom.xml')} -DskipTests` );
    }
    
    // async runTest(_test: string) {
    //     await Maven.create({
    //         cwd: this._projectPath
    //       }).execute(['test'], { stdio: 'inherit', test: _test });
    // }
}