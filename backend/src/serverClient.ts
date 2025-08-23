import { StreamChat } from "stream-chat";

export const apiKey = process.env.STREAM_API_KEY as string;
export const apiSecret = process.env.STREAM_API_SECRET as string;

export const serverClient = new StreamChat(apiKey, apiSecret);