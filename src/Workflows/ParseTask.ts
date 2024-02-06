import * as fs from 'fs';
import * as path from 'path';
import ClassParser from './ClassParser';
import { Logger } from '../utilities/logger';
import { ParsedClassType } from '../types/ParsedClassType';
import { workspace, window } from 'vscode';

class ParseTask {
    private output: string;
    private extensionPath: string;  
    private logger: any;


    constructor(outputFolder: string, _extensionPath: string) {
        this.output = outputFolder;
        this.extensionPath = _extensionPath;
        this.logger = Logger.getInstance();
    }

    public async parseProject(targetPath: string, tests: string[], mains: string[]): Promise<void> {
        try{
            targetPath = targetPath.replace(/\/+$/, ''); // Remove trailing slashes
            const projectName = path.basename(targetPath);
            const output = path.join(this.output, projectName);
            fs.mkdirSync(output, { recursive: true });
            const outputPathTest = await this.parseAllClasses(tests, projectName);
            const outputPathMain = await this.parseAllClasses(mains, projectName);
            this.logger.log('INFO', 'ParseTask', `Parsed ${Object.keys(outputPathTest).length} test classes and ${Object.keys(outputPathMain).length} main classes in ${projectName}`);
            for (const [key, value] of Object.entries(outputPathTest)) {
                this.exportResult(value, path.join( this.extensionPath ,output, 'test', `${key}.json`));
            }

            for (const [key, value] of Object.entries(outputPathMain)) {
                this.exportResult(value, path.join(this.extensionPath , output, 'main', `${key}.json`));
            }
        }
        catch(err){
            this.logger.log('ERROR', 'ParseTask', `Error parsing project: ${err}`);
        }
    }


    private async parseAllClasses(focals: string[], projectName: string): Promise<Record<string, ParsedClassType>> {
        this.logger.log('INFO', 'ParseTask', `Parsing ${focals.length} classes in ${projectName}`);
        const classes: Record<string, ParsedClassType> = {};
        const parsedClasses = new ClassParser();
        const parserInstance = parsedClasses.initializeParser(this.extensionPath);
    
        for (const focal of focals) {
            try {
                const parser: any = await parserInstance;
                const content:  ParsedClassType= parsedClasses.parseJavaFile(focal);
                // Store the parsed content in your 'classes' object, if needed
                classes[path.basename(focal)] = content;
            } catch (err) {
                this.logger.log('ERROR', 'ParseTask', `Error parsing ${focal}: ${err}`);
            }
        }
        return classes;
    }


    private async parseClass(filePath: string): Promise<ParsedClassType> {
        const projectName = path.basename(filePath);
        const parsedClasses = new ClassParser();
        const parserInstance = parsedClasses.initializeParser(this.extensionPath);
        const parser: any = await parserInstance;
        const content: ParsedClassType = parsedClasses.parseJavaFile(filePath);
        return content;
    }


    /*
    * Update the parsed class file
    * @param filePath - Java file path to update
    * @returns void
    */
    public async updateParsedClassFile(filePath: string): Promise<void> {
        if (!window.activeTextEditor || !workspace.workspaceFolders) {
            this.logger.log('ERROR', 'ParseUpdate', 'No active text editor or workspace folder');
            return;
        }
    
        let typeOfFile: string = 'none';
    
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            typeOfFile = fileContent.includes('@Test') ? 'test' : 'main';
        } catch (err) {
            this.logger.log('ERROR', 'ParseUpdate', `Error reading file: ${err}`);
            return;
        }
    
        const jsonPath = path.join(this.extensionPath, 'temp', workspace.workspaceFolders[0].name, typeOfFile, path.basename(filePath) + '.json');
    
        if (!fs.existsSync(jsonPath)) {
            this.logger.log('ERROR', 'ParseUpdate', `File not found: ${jsonPath}`);
            return;
        }
    
        try {
            const parsedClass = await this.parseClass(filePath);
            fs.writeFileSync(jsonPath, JSON.stringify(parsedClass));
        } catch (err) {
            this.logger.log('ERROR', 'ParseUpdate', `Error updating parsed class file: ${err}`);
        }
    }

    private exportResult(data: any, out: string): void {
        try {
            const directory = path.dirname(out);
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            fs.writeFileSync(out, JSON.stringify(data));
        } catch (err) {
            this.logger.log('ERROR', 'ParseTask', `Error exporting result: ${err}`);
        }
    }    
}

export { ParseTask };