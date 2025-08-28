import cors from 'cors'
import express, { urlencoded } from 'express';
import "dotenv/config";
import { apiKey ,serverClient } from './serverClient';
import { createAgent } from './agents/createAgent';
import { AgentPlatform , AiAgent } from './agents/types';

const app = express();
app.use(urlencoded({ extended: true }));
app.use(cors({origin: '*'}));

const aiAgentCache = new Map<string, AiAgent>();
const pendingAiAgents = new Set<string>();

const inactivityThreshold = 480 * 60 * 1000;
setInterval(async ()=> {
    const now = Date.now();
    for(const [userId , aiAgent] of aiAgentCache){
        if(now - aiAgent.getLastInteraction() > inactivityThreshold){
            console.log(`Dispose ai agent due to inactivity : ${userId}`)
            await disposeAiAgent(aiAgent)
            aiAgentCache.delete(userId)
        }
    }
},500)

app.get("/", (req, res) => {
  res.json({
    message: "AI Writing Assistant Server is running",
    apiKey: apiKey,
    activeAgents: aiAgentCache.size,
  });
});

app.post("/start-ai-agent", async (req,res)=>{
    const {channel_id , channel_type} = req.body;
    console.log(`[API] /start-ai-agent called for channel: ${channel_id}`);
    if(!channel_id || !channel_type){
           res.status(400).json({ error: "Missing required fields" });
    return;
    }
    const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;
    try {
        if(!aiAgentCache.has(user_id) || !pendingAiAgents.has(user_id)){
            console.log(`Creating a new agent for channel : ${user_id}`)
            pendingAiAgents.add(user_id);
            await serverClient.upsertUser({ id: user_id , name : "AI Writing Assistant"});
        
        const channel = serverClient.channel(channel_type , channel_id);
        await channel.addMembers([user_id]);

        const agent =await createAgent(user_id,channel_id,channel_type,AgentPlatform.OPENAI);
        await agent.init();
        if(aiAgentCache.has(user_id)){
            await agent.dispose();
        }else {
            aiAgentCache.set(user_id,agent);
        }
    }else{
        console.log(`Ai agent already started for channel : ${user_id}`)
    }
    res.json({message : "Agent started successfully",data : []});
    } catch (error) {
        const err = (error as Error).message;
        console.error(`Failed to start agent for channel ${channel_id}`, err);
        res.json({error : err , message : "Failed to start agent"}).status(500);
    } finally {
        pendingAiAgents.delete(user_id);
    }
})

app.post("stop-ai-agent",async (req,res)=> {
const {channel_id} = req.body;
console.log(`[API] /stop-ai-agent called for channel: ${channel_id}`);
if(!channel_id){
    res.status(400).json({ error: "Missing required fields" });
return;
}
const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;
try {
    const aiAgent = aiAgentCache.get(user_id);
    if(!aiAgent){
        res.json({message : "Agent not found in cache"}).status(404);
        return;
    }
    await disposeAiAgent(aiAgent);
    aiAgentCache.delete(user_id);
    res.json({message : "Agent stopped successfully",data :[]});
    
} catch (error) {
            const err = (error as Error).message;
        console.error(`Failed to stop agent for channel ${channel_id}`, err);
        res.json({error : err , message : "Failed to stop agent"}).status(500);
}
}
)

app.get("/agent-status",async (req,res)=>{
    const {channel_id} = req.query;
    if(!channel_id || typeof channel_id !== "string"){
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    const user_id = `ai-bot-${channel_id.replace(/[!]/g, "")}`;

      console.log(
    `[API] /agent-status called for channel: ${channel_id} (user: ${user_id})`
  );
  if(aiAgentCache.has(user_id)){
      res.json({status : "connected"})
  } else if(pendingAiAgents.has(user_id)){
      res.json({status : "connecting"})
  }else{
      res.json({status : "disconnected"})
  }
})

app.post("/token", async (req,res)=>{
    try {
        const {userId} = req.body;
        if(!userId){
            res.status(400).json({ error: "UserId is required" });
            return;
        }
        const issuedAt = Math.floor(Date.now() / 1000);
        const expirationTime = issuedAt + 60 * 60 * 24;
        const token = serverClient.createToken(userId);
        res.json({token});
    } catch (error) {
            console.error("Error generating token:", error);
    res.status(500).json({
      error: "Failed to generate token",
    });
  }
    
})

async function disposeAiAgent(aiAgent: AiAgent) {
  await aiAgent.dispose();
  if (!aiAgent.user) {
    return;
  }
  await serverClient.deleteUser(aiAgent.user.id, {
    hard_delete: true,
  });
}

const port = process.env.PORT || 3000;

app.listen(port , ()=>{
    console.log(`Server is running on http://localhost:${port}`);
})