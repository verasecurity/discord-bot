import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { client } from './bot.js';
import { createAPI } from './api.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

createAPI(app);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
