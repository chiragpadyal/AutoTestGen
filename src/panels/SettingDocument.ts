import { TextDocumentContentProvider, Uri, EventEmitter, Memento, workspace, commands, window, SecretStorage } from "vscode";
import { UserSettingType } from "../types/UesrSettingType";
import { URL } from "url";

export class SettingDocument implements TextDocumentContentProvider {
    onDidChangeEmitter = new EventEmitter<Uri>();
    onDidChange = this.onDidChangeEmitter.event;
    settings: UserSettingType;

    constructor(private readonly globalContext: Memento, private secrets: SecretStorage) {
        this.settings = {
            "host": new URL("https://api.openai.com/v1/engines/davinci-codex/completions"),
            "apiKey": "", // Empty string for now
            "modelName": "gpt-3.5-turbo",
            "temperature": 0,
            "maxTokens": 1600
        }
    }

    async initialize() {
        // Retrieve the API key from secret storage
        this.settings.apiKey = await this.secrets.get("autoTestGen.apiKey") || "";
        this.settings.host = workspace.getConfiguration("autoTestGen").get("host") || this.settings.host;
        this.settings.modelName = workspace.getConfiguration("autoTestGen").get("modelName") || this.settings.modelName;
        this.settings.temperature = workspace.getConfiguration("autoTestGen").get("temperature") || this.settings.temperature;
        this.settings.maxTokens = workspace.getConfiguration("autoTestGen").get("maxTokens") || this.settings.maxTokens;
    }

    dispose(): void {
        this.onDidChangeEmitter.dispose();
    }

    provideTextDocumentContent(uri: Uri): string {
        this.onDidChangeEmitter.fire(uri);
        return JSON.stringify(this.settings, null, 4);
    }

    // async saveSetting(settings: UserSettingType) {
    //     // Update the API key in secret storage
    //     await this.secrets.store("autoTestGen.apiKey", settings.apiKey);
    //     this.settings = settings;
    // }
}