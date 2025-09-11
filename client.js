const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'frequent_jp_drop') {
        console.log('Received Frequent JP Drop:', message.data);
        // Update UI, e.g., display message.data in a div
        document.getElementById('jp-drop').textContent = `Frequent JP Drop: ID=${message.data.Id}, Name=${message.data.Name}, Value=${message.data.Value}`;
    }
};

ws.onclose = () => {
    console.log('Disconnected from WebSocket server');
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};
