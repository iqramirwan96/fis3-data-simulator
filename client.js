const io = require('socket.io-client');

// Establish WebSocket connection to the server
const socket = io('http://localhost:3005', {
    path: '/trac-sim'
});

// Listen for the 'trac' event from the server
socket.on('trac', (tracs) => {
    // Print the received tracs
    console.log('Received tracs:', tracs);
});
