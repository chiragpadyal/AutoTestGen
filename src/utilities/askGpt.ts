import { SecretStorage, Uri } from "vscode";
const { GoogleGenerativeAI } = require("@google/generative-ai");
import ollama, {ChatResponse, Message} from 'ollama'
import * as Mustache from 'mustache'
import * as fs from 'fs'
import { readFile } from "./fsUtils";
import generateRandomString from "./randomString";

import * as path from 'path';
import { LogLevel, Logger } from "./logger";

export class AskGPT {
  chatHistory: Message[] = [];
  constructor(private secrets: SecretStorage | null, private model: string, private extensionUri: Uri, private logger: Logger) {}


  async askGptGemini(prompt: string): Promise<string> {
    const PAT = await this.secrets?.get("autoTestGen.apiKey");
    const genAI = new GoogleGenerativeAI(PAT);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      // Gemini has different formats for chat history
      history: this.chatHistory.map(obj => {
        return {'role': obj.role, 'parts': [{'text': obj.content}]} || {};
      }),
      generationConfig: {
        maxOutputTokens: 100,
      },
    });
  
    // try {
    //     const result = await chat.sendMessage(prompt)
    //     const response = await result.response;
    //     return response.text();
    // } catch (error) {
    //     this.logger.log(LogLevel.ERROR, 'GEMINI' , `Error in askGptGemini: ${error}`)
    //     throw error;
    // }

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
  } catch (error) {
      throw error;
  }
  }

  async askOllama(prompt: string): Promise<string> {
    const message = { role: 'user', content: prompt }
    const response = await ollama.chat({ model: "phi3", messages: 
      [...this.chatHistory, message]
    })
    return response.message.content;
  }

  async askOllamaStream(prompt: string): Promise<AsyncGenerator<ChatResponse>>{
    const message = { role: 'user', content: prompt }
    const response = await ollama.chat({ model: this.model, messages: [...this.chatHistory, message], stream: true})
    return response
  }
}