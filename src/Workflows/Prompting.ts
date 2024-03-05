import * as mustache from 'mustache';
import * as fs from 'fs'; //TODO: change to vscode.workspace.fs
import * as path from 'path';
// import askGpt from '../utilities/askGpt';

const PROMPTDIR = path.join('src', 'prompts');

export enum PromptType {
    Repair_1 = "repair-test-case.mustache",
    Creation_1 = "1_generate-test-case.mustache",
    Creation_0 = "basic_generate-method.mustache",
}

export interface PromptAttrTemplate {
    file: PromptType;
    attrs: {
        // 1_generate-test-case.mustache
        method_signature?: string;
        method_body?: string;
        expected_behavior?: string;
        test_case_inputs?: string;
        test_case_expected_outputs?: string;
        additional_context?: string;

        // basic creation
        method_complete?: string;
    };
}

export class Prompting {
    constructor(private readonly _extensionPath: string) {}
    public async templating(prompt: PromptAttrTemplate): Promise<string> {
        try {
            const templatePath = path.join(this._extensionPath, PROMPTDIR, prompt.file);
            const template = fs.readFileSync(templatePath, 'utf8');
            return mustache.render(template, prompt.attrs);
            // let response = await askGpt(template);
            // return this.parseCode(response);
        } catch (e: any) {
            throw new Error(e);
        }
    }

    private parseCode(gptResonse: string): string {
        // TODO: write better code block parser
        const hasCodeBlock = gptResonse.includes("```");
        if (hasCodeBlock) {
            const codeBlock = gptResonse.split("```")[1];
            return codeBlock;
        }
        return '';
    }

}