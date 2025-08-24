
import {OpenAI} from "openai";
import { AssistantStream } from "openai/lib/AssistantStream";
import { Channel,Event, MessageResponse,StreamChat } from "stream-chat";

export class OpenAIResponseHandler {

    private message_text = "";
    private chunk_counter = 0;
    private run_id = "";
    private is_done = false;
    private last_update_time = 0;

    constructor(
        private readonly openai : OpenAI,
        private readonly chatClient : StreamChat,
        private readonly oepnAiThread : OpenAI.Beta.Threads.Thread,
        private readonly channel : Channel,
        private readonly assistantStream : AssistantStream,
        private readonly message : MessageResponse,
        private readonly onDispose : ()=> void
    ){
        this.chatClient.on("ai_indicator.stop", this.handleStopGenerating);
    }

    run = async () => {};
    dispose = async () => {
        if(this.is_done){
            return
        }
        this.is_done = true;
        this.chatClient.off("ai_indicator.stop", this.handleStopGenerating);
        this.onDispose();
    };
    private handleStopGenerating = async (event:Event) => {
        
        if(this.is_done || event.message_id !== this.message.id){
            return 
        }
        console.log("stopping ai generation",this.message);
        if(!this.openai || !this.oepnAiThread || !this.run_id){
            return
        }
        
        try {
           const cancelledRun = await this.openai.beta.threads.runs.cancel(this.oepnAiThread.id, this.run_id as any);
           console.log("Successfully cancelled run:", cancelledRun);
        } catch (error) {
            console.error("Failed to cancel run:", error);
        }
        await this.channel.sendEvent({
            type : "ai_indicator.clear",
            cid : this.message.cid,
            message_id : this.message.id,
        })
        await this.dispose();
    };
    private handleStreamEvent = async (event:Event) => {};
    private handleError = async (error:Error) => {
        if(this.is_done){
            return
        }

        await this.channel.sendEvent({
            type : "ai_indicator.update",
            ai_state : "AI_STATE_ERROR",
            cid : this.message.cid,
            message_id : this.message.id,
        })

        await this.chatClient.partialUpdateMessage(this.message.id, {
            set : {
               text : error.message ?? "Error generating response",
                message  :error.toString()
            }
        })
        await this.dispose();
    };
    private handleWebSearch = async (query:string) : Promise<string> => {
        const TAVILY_API_KEY = process.env.TAVILY_API_KEY as string;
        if(!TAVILY_API_KEY){
            return JSON.stringify({
                error : "web search is not performed because tavily api key is not configured"
            })
        }
        console.log(`performing a web search for  ${query}`);
        try {
            const response = await fetch(`https://api.tavily.com/v1/search`,{
                method : "POST",
                headers : {
                    "Content-Type" : "application/json",
                    Authorization : `Bearer ${TAVILY_API_KEY}`
                },
                body : JSON.stringify({
                    query,
                    search_depth : "advanced",
                    max_results: 5,
                    include_answers : true,
                    include_raw_content: false,
    
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Tavily search failed for query "${query}":`, errorText);
                return JSON.stringify({
                error: `Search failed with status: ${response.status}`,
                details: errorText,
            });
        }

        const data = await response.json();
        console.log(`web search is successful for ${query}`);
        return JSON.stringify(data);
        } catch (error) {
            return JSON.stringify({
                error: "An exception occurred during the search.",
                message: error instanceof Error ? error.message : "Unknown error",
            })
        }
    };
}

