import { StreamChat } from "stream-chat";
import { OpenAiAgent } from "./openAI/openaiAgent";
import { apiKey , serverClient } from "../serverClient";
import { AgentPlatform , AiAgent } from "./types";

export const createAgent = async (
    user_id : string,
    channel_id : string,
    channel_type : string,
    platform : AgentPlatform
) => {
    const token = serverClient.createToken(user_id);
    const chatClient = new StreamChat(apiKey, undefined , {allowServerSideConnect : true});
    await chatClient.connectUser({id : user_id},token);
    const channel = await chatClient.channel(channel_type , channel_id);
    channel.watch();

    switch (platform) {
        case AgentPlatform.WRITING_ASSISTANT:
        case AgentPlatform.OPENAI:
            return new OpenAiAgent(channel,chatClient);
    
        default:
            throw new Error (`unsupported agent platform : ${platform}`);
    }
}