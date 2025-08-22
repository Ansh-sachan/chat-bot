import type { Channel,User ,StreamChat } from "stream-chat";

export interface AiAgent {
    user ?: User;
    channel : Channel;
    chatClient : StreamChat;
    getLastInteraction : ()=>number;
    init : ()=>Promise<void>;
    dispose : ()=>Promise<void>;
}

export enum AgentPlatform {
  OPENAI = "openai",
  WRITING_ASSISTANT = "writing_assistant",
}

export interface WritingMessage {
    custom ?: {
        messageType ?: "user_input" | "ai_response" | "system_message";
        writingTask ?: string;
        suggestions ?: string[];
    }
}