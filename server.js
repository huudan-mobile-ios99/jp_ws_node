

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

   wsClient.on("message", async (data) => {
    const startTime = performance.now();
    try {
        const xmlString = data.toString();
        const parsed = parser.parse(xmlString);

        const informationBroadcast = parsed.InformationBroadcast || {};

        if (informationBroadcast.JackpotList) {
            const jackpotListXml = informationBroadcast.JackpotList;
            const parsedJackpotList = parser.parse(`<Root>${jackpotListXml}</Root>`);

            const jackpots = Array.isArray(parsedJackpotList.Root.Jackpot)
                ? parsedJackpotList.Root.Jackpot
                : [parsedJackpotList.Root.Jackpot].filter(Boolean);

            // Prepare jackpot data
            let jackpotData = jackpots.map(jackpot => ({
                jackpotId: jackpot["@Id"],
                jackpotName: jackpot["@Name"],
                // store original string and number
                rawValue: jackpot["@Value"],
                value: Number(jackpot["@Value"])
            }));

            // ----------------------------
            // ✅ FIXED: SAFEST INCREMENT LOGIC
            // ----------------------------
            const lastRecord = await IfModel.findOne().sort({ timestamp: -1 });
            if (lastRecord) {
                jackpotData.forEach(jp => {
                    const prevJP = lastRecord.jackpots.find(j => j.jackpotId === jp.jackpotId);

                    if (prevJP) {
                        const currValue = Number(jp.rawValue);
                        const prevValue = prevJP.value;

                        if (currValue === prevValue) {
                            // Increment the last digit
                            let strVal = currValue.toFixed(8); // 8 decimal places
                            let [intPart, decPart] = strVal.split(".");

                            let lastDigit = parseInt(decPart[decPart.length - 1]);
                            lastDigit = (lastDigit + 1) % 10;

                            decPart = decPart.slice(0, -1) + lastDigit.toString();
                            jp.value = parseFloat(`${intPart}.${decPart}`);
                        } else {
                            jp.value = currValue; // new number from WS
                        }
                    }
                });
            } else {
                // First ever record, just save as-is
                jackpotData.forEach(jp => {
                    jp.value = Number(jp.rawValue);
                });
            }
            // ----------------------------
            // SAVE to MongoDB
            // ----------------------------
            try {
                const newRecord = new IfModel({
                    jackpots: jackpotData.map(j => ({
                        jackpotId: j.jackpotId,
                        jackpotName: j.jackpotName,
                        value: j.value
                    })),
                    timestamp: new Date(),
                });

                await newRecord.save();

                console.log("JP saved:", {
                    jackpots: jackpotData,
                    timestamp: newRecord.timestamp,
                });
            } catch (dbError) {
                console.error("Error save jp:", dbError.message);
            }
        }

        // Log Hotseat & Hits (unchanged)
        const hits = informationBroadcast.LastJackpotHits;

        if (typeof hits === "string") {
            // raw XML
        } else if (typeof hits === "object" && !Array.isArray(hits)) {
            // JSON object
        } else if (Array.isArray(hits)) {
            hits.forEach(hit => {});
        }

        if (informationBroadcast.LastHotSeatHits) {
            // console.log(informationBroadcast.LastHotSeatHits);
        }
    } catch (error) {
        console.error("Error processing WebSocket message:", error);
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






