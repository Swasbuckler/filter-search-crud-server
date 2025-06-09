import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { Express } from 'express';
import cors from 'cors';
import setRoutes from './routes/head-router';
'tt'
const app: Express = express();

const corsOptions: { origin: string } = {
  origin: process.env.FRONTEND_URL!,
};

app.use( cors(corsOptions) );
app.use( express.json() );

setRoutes( app );

export default app;