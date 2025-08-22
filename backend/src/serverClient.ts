import { StreamChat } from "stream-chat";

const apiKey = process.env.STREAM_API_KEY as string;
const apiSecret = process.env.STREAM_API_SECRET as string;

export const serverClient = new StreamChat(apiKey, apiSecret);