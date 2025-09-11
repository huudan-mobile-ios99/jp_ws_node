const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs').promises;
const chalk = require('chalk');
const { parseStringPromise } = require('xml2js');

const router = express.Router();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use('/', router);

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    console.log('Express server running on port: ' + port);
});

// WebSocket server for clients
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();



// Handle WebSocket client connections
wss.on('connection', ws => {
    console.log('Client connected to WebSocket server');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', error => {
        console.error('WebSocket client error:', error);
    });
});

// WebSocket client to connect to external jackpot gateway
const wsUrl = 'ws://192.168.100.202/Interfaces/Jackpot/JackpotsGateway?COMPUTERNAME=Application';
let wsClient;
let reconnectAttempts = 0;
const maxReconnectAttempts = 50;
const initialReconnectDelay = 500; // 500ms


async function connectWebSocket() {
    wsClient = new WebSocket(wsUrl);
    wsClient.on('open', async () => {
        console.log('Connected to WebSocket server:', wsUrl);
        reconnectAttempts = 0; // Reset reconnect attempts
    });

    wsClient.on('message', async (data) => {
        try {
            // Convert buffer to string (assuming XML data)
            const xmlString = data.toString();
            const parsed = await parseStringPromise(xmlString);
            const informationBroadcast = parsed.InformationBroadcast || {};
            // console.log('informationBroadcast.JackpotHit:',JSON.stringify(informationBroadcast.JackpotHit));
            // console.log('informationBroadcast.Jackpot:',JSON.stringify(informationBroadcast.Jackpot));

            // console.log('JackpotList:',JSON.stringify(informationBroadcast.JackpotList));
            console.log('Data:',JSON.stringify(informationBroadcast));
            console.log('Jackpots:',JSON.stringify(informationBroadcast.JackpotList.Jackpot[0]));

            const frequentJackpots = informationBroadcast.LastJackpotHits.flatMap(
                hit =>hit.JackpotHit.filter(jackpotHit =>jackpotHit.Jackpot[0].$.Id === "0").map(jackpotHit => jackpotHit.Jackpot[0])
            );
            console.log(`\x1b[33m LastJackpotHits: \x1b[0m ${JSON.stringify(frequentJackpots)}`);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });

    wsClient.on('close', () => {
        console.log('WebSocket connection closed');
        if (reconnectAttempts < maxReconnectAttempts) {
            const delay = initialReconnectDelay * Math.pow(2, reconnectAttempts);
            console.log(`Reconnecting in ${delay}ms... (Attempt ${reconnectAttempts + 1})`);
            setTimeout(() => connectWebSocket(), delay); // New log file on reconnect
            reconnectAttempts++;
        } else {
            console.error('Max reconnect attempts reached. Stopping reconnection.');
        }
    });

    wsClient.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

// Start WebSocket connection
connectWebSocket();

// Serve the HTML page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
