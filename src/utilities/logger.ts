import { PassThrough } from "stream";
import { window, OutputChannel } from "vscode";

export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO'
}

export class Logger {
    private static _instance: Logger;
    private _channel: OutputChannel;

    constructor(channel:string = "Orange") {
        this._channel = window.createOutputChannel(channel);
    }

    /*
    * Create a new logger object
    * Usage: Logger.getInstance("MyChannel")
    * @param channel The name of the output channel
    */
    public static getInstance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    /*
    * Show the output channel
    * Usage: Logger.showChannel()
    * @returns void
    * */
    public showChannel() {
        this._channel.show();
    }

    /*
    * Log a message using the output channel
    * Usage: Logger.log(LogLevel.INFO, "MyMessage", "This is a message")
    * @param level The log level
    * @param messageType The message type
    * @param message The message
    * @returns void
    */
    public log(level: LogLevel, messageType: string, message: string) {
        const logEntry = `[${level}] [${messageType}] ${message}`;
        this._channel.appendLine(logEntry);
    }

    public async stream(str: PassThrough) {
        const TIMEOUT = 10000;
    
        // Listening for data event
        str.on("data", (chunk) => {
            this._channel.append(chunk.toString());
        });
    
        // Creating a promise that resolves when either 'end' or 'error' event occurs
        await new Promise<void>((resolve, reject) => {
            // let timeoutId = setTimeout(() => {
            //     clearTimeout(timeoutId);
            //     reject(new Error("Stream timeout")); // Reject the Promise if no updates are received within the timeout in 10 seconds
            // }, TIMEOUT);
    
            // Listening for 'end' event
            str.once("end", () => {
                resolve(); // Resolve the promise when the stream ends
            });
    
            str.once("error", (error) => {
                console.error("Warning:", error); // Log the error as a warning
                resolve(); // Resolve the promise despite the error
            });
        });
    }
    
}
