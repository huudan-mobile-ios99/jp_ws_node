const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const { XMLParser } = require('fast-xml-parser');

const router = express.Router();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', router);

const port = process.env.PORT || 8088; // Match Flutter app's port
const server = app.listen(port, () => {
    console.log('Express server running on port: ' + port);
});

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

const wsUrl = 'ws://192.168.100.202/Interfaces/Jackpot/JackpotsGateway?COMPUTERNAME=Application';
let wsClient;
let reconnectAttempts = 0;
const maxReconnectAttempts = 50;
const reconnectDelay = 50; // 50ms for fast reconnection
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    parseTagValue: false,
    trimValues: true,
    stopNodes: ['*.JackpotList', '*.HotSeatList', '*.LastHotSeatHits'], // Skip irrelevant nodes
});
const bufferedMessages = new Map(); // Unique messages by value
const maxBufferSize = 20; // Last 10 unique messages
let lastFrequentValue = null; // Track last broadcasted value

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
            const parseStart = performance.now();
            const parsed = parser.parse(xmlString);
            const parseEnd = performance.now();

            const informationBroadcast = parsed.InformationBroadcast || {};




            //Log JP Frequent
            if ( informationBroadcast.LastJackpotHits) {
                            const frequentJackpots = informationBroadcast.LastJackpotHits.flatMap(
                                hit => hit.JackpotHit.filter(jackpotHit => jackpotHit.Jackpot[0].$.Id === "0").map(jackpotHit => jackpotHit.Jackpot[0])
                            );
                            console.log(`frequentJackpots: ${frequentJackpots}`);
            }

            if (!informationBroadcast.LastJackpotHits || !informationBroadcast.LastJackpotHits.JackpotHit) {
                console.log('No LastJackpotHits or JackpotHit found');
                return;
            }
            console.log(JSON.stringify(informationBroadcast));
            const processStart = performance.now();
            // Extract all Id=0 jackpots
            const frequentJackpots = [];
            for (const jackpotHit of informationBroadcast.LastJackpotHits.JackpotHit) {
                if (jackpotHit.Jackpot) {
                    const jackpot = jackpotHit.Jackpot;
                    const jackpotId = jackpot['@Id'] || jackpot.Id;
                    if (jackpotId === '0') {
                        frequentJackpots.push(jackpot);
                    }
                }
            }

            console.log('Frequent Jackpots (Id=0):', JSON.stringify(frequentJackpots, null, 2));

            // Broadcast first Id=0 jackpot if new
            const firstFrequent = frequentJackpots[0];
            if (firstFrequent) {
                const currentValue = firstFrequent['@Value'] || firstFrequent.Value;
                if (currentValue && currentValue !== lastFrequentValue) {
                    const message = JSON.stringify({
                        type: 'frequent_jp_drop',
                        data: {
                            Id: firstFrequent['@Id'] || firstFrequent.Id || '0',
                            Name: firstFrequent['@Name'] || firstFrequent.Name || 'Frequent',
                            Value: currentValue
                        }
                    });

                    const broadcastStart = performance.now();
                    const broadcastPromises = Array.from(clients).map(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            return new Promise(resolve => {
                                client.send(message, () => resolve());
                            });
                        }
                        return Promise.resolve();
                    });
                    await Promise.all(broadcastPromises);
                    const broadcastEnd = performance.now();

                    bufferedMessages.set(currentValue, message);
                    if (bufferedMessages.size > maxBufferSize) {
                        const oldestKey = bufferedMessages.keys().next().value;
                        bufferedMessages.delete(oldestKey);
                    }

                    lastFrequentValue = currentValue;
                    console.log(`Broadcasted: ${message}`);
                    console.log(`Timing: Parse=${(parseEnd - parseStart).toFixed(2)}ms, Process=${(broadcastStart - processStart).toFixed(2)}ms, Broadcast=${(broadcastEnd - broadcastStart).toFixed(2)}ms, Total=${(broadcastEnd - startTime).toFixed(2)}ms`);
                } else {
                    console.log('No new Frequent jackpot value');
                }
            } else {
                console.log('No Frequent jackpot (Id=0) found');
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

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
