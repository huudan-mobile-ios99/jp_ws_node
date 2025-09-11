const WebSocket = require('ws');
const fs = require('fs').promises;
const { parseStringPromise } = require('xml2js');

// WebSocket URL
const wsUrl = 'ws://192.168.100.202/Interfaces/Jackpot/JackpotsGateway?COMPUTERNAME=Application';

// Generate a unique log file name based on timestamp
function generateLogFileName() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // e.g., 2025-05-01T12-00-00
    return `jackpot_hits_${timestamp}.log`;
}

async function logJackpotHit(hit, logFile) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        jackpot: {
            id: hit.Jackpot.Id,
            name: hit.Jackpot.Name,
            value: hit.Jackpot.Value,
            active: hit.Jackpot.Active
        },
        time: hit.Time,
        amount: hit.Amount,
        amountPaidOut: hit.AmountPaidOut,
        machine: hit.Machine
    };

    try {
        await fs.appendFile(logFile, JSON.stringify(logEntry, null, 2) + '\n');
        console.log(`Logged jackpot hit to ${logFile}:`, logEntry.jackpot.name, logEntry.time);
    } catch (error) {
        console.error(`Error writing to log file ${logFile}:`, error);
    }
}

async function connectWebSocket() {
    const logFile = generateLogFileName(); // New log file for this session
    const ws = new WebSocket(wsUrl);

    ws.on('open', async () => {
        console.log('Connected to WebSocket server:', wsUrl);
        await fs.appendFile(logFile, `Connection established at ${new Date().toISOString()}\n`);
    });

    ws.on('message', async (data) => {
        try {
            // Convert buffer to string (assuming XML data)
            const xmlString = data.toString();
            const parsed = await parseStringPromise(xmlString);

            // Check for JackpotHit messages
            const jackpotHit = parsed.JackpotHit;
            if (jackpotHit) {
                const hit = {
                    Jackpot: {
                        Id: parseInt(jackpotHit.Jackpot[0].Id[0]),
                        Name: jackpotHit.Jackpot[0].Name[0],
                        Value: parseFloat(jackpotHit.Jackpot[0].Value[0]),
                        Active: jackpotHit.Jackpot[0].Active[0] === 'true'
                    },
                    Time: jackpotHit.Time[0],
                    Amount: parseFloat(jackpotHit.Amount[0]),
                    AmountPaidOut: parseFloat(jackpotHit.Amount[0]),
                    Machine: {
                        MachineNumber: parseInt(jackpotHit.Machine[0].MachineNumber[0]),
                        SerialNumber: jackpotHit.Machine[0].SerialNumber[0],
                        Area: jackpotHit.Machine[0].Area[0],
                        Bank: jackpotHit.Machine[0].Bank[0],
                        Location: jackpotHit.Machine[0].Location[0],
                        CabinetGameTheme: jackpotHit.Machine[0].CabinetGameTheme[0],
                        MachineManufacturer: jackpotHit.Machine[0].MachineManufacturer[0]
                    }
                };

                // Log the jackpot hit
                await logJackpotHit(hit, logFile);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        process.exit(0); // Terminate script, mimicking wscat
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        process.exit(1); // Terminate on error
    });
}

// Run the connection
connectWebSocket();
