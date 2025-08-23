import cors from 'cors'
import express, { urlencoded } from 'express';
import "dotenv/config";
import { apiKey } from './serverClient';

const app = express();
app.use(urlencoded({ extended: true }));
app.use(cors({origin: '*'}));

app.get("/",(req,res)=>{
    return res.json({message:"Connected to a running ai server",apikey:apiKey})
})

const port = process.env.PORT || 3000;

app.listen(port , ()=>{
    console.log(`Server is running on http://localhost:${port}`);
})