import { Uri, workspace } from "vscode";

/**
 * Read string file using vscode workspace.readFile
 * @param {string | Uri} path: path as string or Uri 
 * @returns 
 */
export async function readFile(path: string | Uri) : Promise<string> {
    let pathUri: Uri;
    if (typeof path == 'string') pathUri = Uri.file(path);
    else pathUri = path;
    const fileContent = await workspace.fs.readFile(pathUri)
    return Buffer.from(fileContent).toString('utf8')  
}

/**
 * Write string to a file using vscode workspace.writeFile
 * @param {string | Uri} path path as string or Uri 
 * @param {string} content content to be written to file
 * @returns string
 */
export async function writeFile(path: string | Uri, content: string): Promise<void> {
    let pathUri: Uri;
    if (typeof path == 'string') pathUri = Uri.file(path);
    else pathUri = path;
    await workspace.fs.writeFile(pathUri,
        Buffer.from(content)
    )
}

export function joinPath(url: Uri, ...paths: string[]){
    return Uri.joinPath(url, ...paths);
}