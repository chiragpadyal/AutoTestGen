import * as vscode from 'vscode';

export class StateManager {
    private static instance: StateManager;
    private context: vscode.ExtensionContext;
    private state: vscode.Memento;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.state = context.workspaceState;
    }

    public async setState(key: string, value: any): Promise<void> {
        await this.state.update(key, value);
    }

    public getState<T>(key: string): T | undefined {
        return this.state.get<T>(key);
    }

    public async clearState(key: string): Promise<void> {
        await this.state.update(key, undefined);
    }
}
