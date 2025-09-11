

const express = require('express');
const { parseStringPromise } = require('xml2js');

const app = express();
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const { XMLParser } = require('fast-xml-parser');
const { connectDBSUB } = require('./mongodb_config'); // Your MongoDB connection module
const IfModel = require('./info_model');
const { initializeCleanup } = require('./cleanup');
const { default: mongoose } = require('mongoose');

const router = express.Router();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', router);

const port = process.env.PORT || 8087;
const server = app.listen(port, () => {
    console.log('Express server running on port: ' + port);
});


process.on("uncaughtException", (err) => {// Handle uncaught exceptions
    console.error("Uncaught Exception:", err.message);// Optionally, keep the server running or trigger graceful shutdown
});
process.on("unhandledRejection", (err) => {// Handle unhandled promise rejections
    console.error("Unhandled Rejection:", err.message);// Optionally, keep the server running or trigger graceful shutdown
});




(async () => {
    try {
        // Connect to MongoDB
        await connectDBSUB();
        await initializeCleanup(mongoose);
    } catch (error) {
        console.warn('Error connecting to DB and initializing cleanup:', error);
    }
})();



const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', ws => {
    console.log('Client connected to WebSocket server');
    clients.add(ws);

    // Send buffered messages to new client
    bufferedMessages.forEach(message => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', error => {
        console.error('WebSocket client error:', error);
    });
});

const wsUrl = 'ws://192.168.100.202/Interfaces/Jackpot/JackpotsGateway?COMPUTERNAME=media';
let wsClient;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 5000; // 5000ms / 5s for fast reconnection
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    parseTagValue: false,
    trimValues: true,
    stopNodes: ['*.JackpotList', '*.HotSeatList', '*.LastHotSeatHits'],
});
const bufferedMessages = new Map();

async function connectWebSocket() {
    wsClient = new WebSocket(wsUrl, {
        headers: { 'Connection': 'keep-alive' },
        perMessageDeflate: false,
    });

    wsClient.on('open', () => {
        console.log('Connected to WebSocket server:', wsUrl);
        reconnectAttempts = 0;
        wsClient.pingInterval = setInterval(() => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.ping();
            }
        }, 30000);
    });

    wsClient.on('pong', () => {
        reconnectAttempts = 0;
    });

    wsClient.on('message', async (data) => {
        const startTime = performance.now();
        try {
            const xmlString = data.toString();
            const parsed = parser.parse(xmlString);
            // console.log(parsed);
            const informationBroadcast = parsed.InformationBroadcast || {};

            if (informationBroadcast.JackpotList) {
                const jackpotListXml = informationBroadcast.JackpotList;
                const parsedJackpotList = parser.parse(`<Root>${jackpotListXml}</Root>`);
                const jackpots = Array.isArray(parsedJackpotList.Root.Jackpot)
                    ? parsedJackpotList.Root.Jackpot
                    : [parsedJackpotList.Root.Jackpot].filter(Boolean);

                // Prepare jackpot data for MongoDB
                const jackpotData = jackpots.map(jackpot => ({
                    jackpotId: jackpot['@Id'],
                    jackpotName: jackpot['@Name'],
                    value: parseFloat(jackpot['@Value']),
                }));

                // Save to MongoDB
                try {
                    const newRecord = new IfModel({
                       jackpots: jackpotData,
                        timestamp: new Date(),
                    });
                    await newRecord.save();
                    console.log('JP saved:', {
                        jackpots: jackpotData,
                        timestamp: newRecord.timestamp,
                    });
                } catch (dbError) {
                    console.error('Error save jp:', dbError.message);
                }
            }
                const hits = informationBroadcast.LastJackpotHits;
                // If it’s a string → just log
                if (typeof hits === "string") {
                    // console.log("LastJackpotHits (raw XML):", hits);
                }
                // If it’s an object → log as JSON
                else if (typeof hits === "object" && !Array.isArray(hits)) {
                    // console.log("LastJackpotHits (object):", JSON.stringify(hits, null, 2));
                }
                // If it’s an array → loop
                else if (Array.isArray(hits)) {
                    hits.forEach(hit => {
                        // console.log("Hit:", JSON.stringify(hit, null, 2));
                    });
                }
            //log hotseat
            if ( informationBroadcast.LastHotSeatHits) {
                // console.log(informationBroadcast.LastHotSeatHits);
            }

        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

    wsClient.on('close', () => {
        console.log('WebSocket connection closed');
        clearInterval(wsClient.pingInterval);
        if (reconnectAttempts < maxReconnectAttempts) {
            console.log(`Reconnecting in ${reconnectDelay}ms... (Attempt ${reconnectAttempts + 1})`);
            setTimeout(() => connectWebSocket(), reconnectDelay);
            reconnectAttempts++;
        } else {
            console.error('Max reconnect attempts reached. Stopping reconnection.');
        }
    });

    wsClient.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

connectWebSocket();






