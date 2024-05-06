import { workspace } from "vscode";

export async function processJavaFiles() {
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