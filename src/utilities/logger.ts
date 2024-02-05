import { window, OutputChannel } from "vscode";

export enum LogLevel {
    ERROR = 'ERROR',
    WARN = 'WARN',
    INFO = 'INFO'
}

export class Logger {
    private static _instance: Logger;
    private _channel: OutputChannel;

    private constructor(channel:string = "Orange") {
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
}
