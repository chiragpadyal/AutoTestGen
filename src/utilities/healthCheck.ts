import { execShell } from "./execShell";
export function healthCheck(window: any): void{
    let javaInstalled = false;
    let mavenInstalled = false;
    // check if java is installed
    execShell('java -version').then((stdout) => {
        if (stdout.includes('11')) {
            javaInstalled = true;
            window.showInformationMessage(`[Health Check] Java is installed`);
        } else {
            window.showErrorMessage(`[Health Check] Java version 11 is required`);
        }
        // check if maven is installed
        execShell('mvn -v').then((stdout) => {
            if (stdout.includes('Maven')) {
                mavenInstalled = true;
                window.showInformationMessage(`[Health Check] Maven is installed`);
            } else {
                window.showErrorMessage(`[Health Check] Maven is not installed`);
            }
        }).catch((e) => {
            window.showErrorMessage(`[Health Check] Maven is not installed`);
        });
    }).catch((e) => {
        window.showErrorMessage(`[Health Check] Java is not installed`);
    });
}