import { URL } from "url";

type zeroToTen = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface UserSettingType {
    "host": URL;
    "apiKey": string;
    "modelName": string;
    "temperature":zeroToTen;
    "maxTokens": number;
}