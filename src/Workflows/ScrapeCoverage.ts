import { JSDOM } from 'jsdom';
import { ParsedClassType, ParsedMethodType, LineData } from '../types/ParsedClassType';
import { getUrlEnding } from '../utilities/getUrlEnding';
import { Uri, workspace } from 'vscode';
import { readFile, writeFile } from '../utilities/fsUtils';
import { LogLevel, Logger } from '../utilities/logger';

export class ScrapeCoverage {
    constructor(private readonly vsStorageURL: Uri, private readonly logger: Logger) {}

    
    async scrapeJacocoCode(jacocoHtmlResultUrl: Uri): Promise<ParsedMethodType[]> {

// [INFO] [ASK-BOT] Scraping coverage from: file:///d%3A/Code/Code/ChatUniTest/jfreechart/target/site/jacoco/org.jfree.chart.labels/AbstractXYItemLabelGenerator.java.html
        
        const htmlContent = await readFile(jacocoHtmlResultUrl)
        
        // Parse HTML content using jsdom
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;
        
        // Find the <pre> tag containing the code
        const codeCover = document.querySelector('pre');
        if (!codeCover) {
            this.logger.log(LogLevel.ERROR, '[ScrapeJacococCode]' ,'No <pre> tag found')
            throw new Error('No <pre> tag found');
        }
    

        this.logger.log(LogLevel.INFO, '[ScrapeJacococCode]' ,'Parsing the coverage data')
        // ---------- Find the line number of focal method {} start and end. ---------- //
        // const className = getUrlEnding(jacocoHtmlResultUrl).replace('.html', '') + '.java' + '.json';
        const className = jacocoHtmlResultUrl.path.split('/').pop()?.replace('.html', '') + '.json';
        this.logger.log(LogLevel.INFO, '[ScrapeJacococCode]' ,'className: ' + className);
        if(!workspace.workspaceFolders){
            this.logger.log(LogLevel.ERROR, '[ScrapeJacococCode]' ,'No workspace folder found')
            throw new Error('No workspace folder found');
        }

        this.logger.log(LogLevel.INFO, '[ScrapeJacococCode]' ,'Reading the parsed coverage data 1')
        const filePath: Uri = Uri.joinPath(this.vsStorageURL, 'temp', workspace.workspaceFolders[0].name , 'main' , className);

        this.logger.log(LogLevel.INFO, '[ScrapeJacococCode]' ,'Reading the parsed coverage from: ' + filePath)
        const parsedCLSRes = await readFile(filePath)
        const parsedCLS: ParsedClassType = JSON.parse(Buffer.from(parsedCLSRes).toString('utf8'));
        if (!parsedCLS.methods) {
            this.logger.log(LogLevel.ERROR, '[ScrapeJacococCode]' ,'No methods found')
            throw new Error('No methods found');
        }
        const mtd: ParsedMethodType[] = parsedCLS.methods;
    
        this.logger.log(LogLevel.INFO, '[ScrapeJacococCode]' ,'Parsing the coverage data')
        for (let i = 0; i < mtd.length - 1; i++) {
            const focalMethodArr: LineData[] = [];
            for (let j = mtd[i].star_line; j <= mtd[i].end_line; j++) {
                const span = codeCover.querySelector(`span#L${j}`);
                const className = span ? span.getAttribute('class') || '' : '';
    
                focalMethodArr.push({
                    line: span ? span.textContent || '' : '',
                    status: className || 'none'
                });
            }
            mtd[i].coverage_lines = focalMethodArr;
            mtd[i].number_of_PC = focalMethodArr.filter(x => x.status === 'nc').length;
            mtd[i].number_of_NC = focalMethodArr.filter(x => x.status === 'pc').length;
        }

        parsedCLS.methods = mtd;

        this.logger.log(LogLevel.INFO, '[ScrapeJacococCode]' ,'Writing the parsed coverage data to file')
        await writeFile(filePath, JSON.stringify(parsedCLS))    
        return mtd;
    }

    /**
     * Check if a method has a test method
     * @param methodName method name
     * @param parsedFilePathOrContent parsed file path or content
     * @returns boolean
     */
    async checkIfHasTestMethod(methodName: string, parsedFilePathOrContent: string | ParsedMethodType[]): Promise<boolean> {
        let parsedClass: ParsedClassType;
        if (typeof parsedFilePathOrContent === 'string') {
            this.logger.log(LogLevel.INFO, '[checkIfHasTestMethod]' ,'Reading the parsed coverage data')
            const parsedContent = await readFile(parsedFilePathOrContent);
            parsedClass = JSON.parse(parsedContent);
        }else {
            parsedClass = {methods: parsedFilePathOrContent};
        }
        if (!parsedClass.methods) {
            this.logger.log(LogLevel.ERROR, '[checkIfHasTestMethod]' ,'No methods found')
            return false;
        }
        for (const method of parsedClass.methods) {
            if (method.method_name === methodName) {
                return true;
            }
        }
        return false;
    }


    async findTestMethod(className: string): Promise<Uri>{
        let testMethodPath = Uri.joinPath(this.vsStorageURL, 'temp', 'test', 'test.java');
        const uris = await workspace.findFiles('**/' + className + 'Test.java');
        if (uris.length > 0) {
            for (const uri of uris) {
                const content = await readFile(uri);
                if (content.match(new RegExp("@Test", "gm"))) {
                    testMethodPath = uri;
                    break;                    
                }
            }
        }
        return testMethodPath;
    }
}