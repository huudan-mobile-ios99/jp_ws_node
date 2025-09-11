const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { parseStringPromise } = require('xml2js');

const router = express.Router();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', router);

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    console.log('Express server running on port: ' + port);
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

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

const wsUrl = 'ws://192.168.100.202/Interfaces/Jackpot/JackpotsGateway?COMPUTERNAME=FLOOR';
let wsClient;
let reconnectAttempts = 0;
const maxReconnectAttempts = 50;
const initialReconnectDelay = 500;

// Counter for numbering log entries
let logCounter = 1;
// Flag to track if the previous message was a JP drop (empty data)
let wasLastDataEmpty = false;
// Store the latest Frequent prize value
let lastFrequentValue = null;

async function connectWebSocket() {
    wsClient = new WebSocket(wsUrl);
    wsClient.on('open', async () => {
        console.log('Connected to WebSocket server:', wsUrl);
        reconnectAttempts = 0;
    });

    wsClient.on('message', async (data) => {
        try {
            const xmlString = data.toString();
            const parsed = await parseStringPromise(xmlString);
            const informationBroadcast = parsed.InformationBroadcast || {};

            console.info('-------------------------------------------------------------------------');
            console.log(informationBroadcast);

            // Get JackpotList or empty object if undefined
            const jackpotList = informationBroadcast.JackpotList || {};
            const jackpotHit = informationBroadcast.LastJackpotHits || {};
            console.log(JSON.stringify(jackpotList));
            console.info('************************');
            console.log(JSON.stringify(jackpotHit));
            const isCurrentDataEmpty = Object.keys(jackpotList).length === 0;
            console.info('-------------------------------------------------------------------------');


            // Prepare log entry
            let logEntry = `#${logCounter}\ndata:${JSON.stringify(jackpotList)}\n\n`;
            // Check for frequent jackpot drop after a JP drop
            if (wasLastDataEmpty && !isCurrentDataEmpty && informationBroadcast.LastJackpotHits) {
                const frequentJackpots = informationBroadcast.LastJackpotHits.flatMap(
                    hit => hit.JackpotHit.filter(jackpotHit => jackpotHit.Jackpot[0].$.Id === "0").map(jackpotHit => jackpotHit.Jackpot[0])
                );
                // Get the latest Frequent prize value (last entry in frequentJackpots)
                const latestFrequent = frequentJackpots[frequentJackpots.length - 1];
                const latestValue = latestFrequent ? latestFrequent.$.Value : null;
                // Process frequent JP drop only if the value has changed or is new
                if (latestValue && latestValue !== lastFrequentValue) {
                    // Broadcast to WebSocket clients with simplified structure
                    const message = JSON.stringify({
                        type: 'frequent_jp_drop',
                        data: {
                            Id: latestFrequent.$.Id,
                            Name: latestFrequent.$.Name,
                            Value: latestFrequent.$.Value
                        }
                    });
                    clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(message);
                        }
                    });

                    // Log to console
                    console.log(`Last Frequent JP: ${JSON.stringify(frequentJackpots)}`);
                    // Add to log entry (keep full frequentJackpots for log file)
                    logEntry += `frequent jp drop: ${JSON.stringify(frequentJackpots)}\n\n`;
                    // Update stored value
                    lastFrequentValue = latestValue;
                } else if (latestValue === lastFrequentValue) {
                    console.log('No new Frequent JP drop (same value). Likely another prize dropped.');
                }
            }

            // Append to log file
            await fs.appendFile('jackpot_data.log', logEntry);

            // Update state
            wasLastDataEmpty = isCurrentDataEmpty;
            logCounter++;
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });

    wsClient.on('close', () => {
        console.log('WebSocket connection closed');
        if (reconnectAttempts < maxReconnectAttempts) {
            const delay = initialReconnectDelay * Math.pow(2, reconnectAttempts);
            console.log(`Reconnecting in ${delay}ms... (Attempt ${reconnectAttempts + 1})`);
            setTimeout(() => connectWebSocket(), delay);
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

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
