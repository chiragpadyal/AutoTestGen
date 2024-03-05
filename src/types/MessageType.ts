export interface MessageType {
    command: "reply" | "chain-reply";
    text: string;
    from: string;
    isChainDone?: boolean;
}
