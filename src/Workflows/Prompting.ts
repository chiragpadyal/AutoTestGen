import * as mustache from 'mustache';
import * as fs from 'fs';
import * as path from 'path';
import askGpt from '../utilities/askGpt';

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
    public templating(prompt: PromptAttrTemplate): string {
        try {
            const templatePath = path.join(this._extensionPath, PROMPTDIR, prompt.file);
            const template = fs.readFileSync(templatePath, 'utf8');
            mustache.render(template, prompt.attrs);
            return this.runPrompt(template);
        } catch (e: any) {
            throw new Error(e);
        }
    }

    private runPrompt(prompt: string): string {
        askGpt(prompt).then((response) => {
            return response;
        }).catch((error) => {
            return "Server Down! try later...";
        });
        return 'Server Down! try later...';
    }

}