const { MongoClient } = require('mongodb');
const cron = require('node-cron');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    path: '/trac-sim'
});

const uri = 'mongodb://localhost:27017/?replicaSet=myReplicaSet';

var tracs = {};
var i = 0;
var tracsLen = 0;

server.listen(3005, async () => {
    console.log('listening on *:3005');

    const client = new MongoClient(uri);

    await connectDatabase(client);

    const dbData = await readDB(client);

    var allTracs = dbData.result;
    var allDt = dbData.dt;

    await BackgroundProcess(io, allTracs, allDt);

    await socketHandler(io);
});

async function connectDatabase(client) {
    await client.connect()
    .then(() => {
        console.log('database connected');
    })
    .catch((err) => {
        console.log('error connecting to database.', err);
    });
}

async function readDB(client) {
    const resultCursor = await client.db("bts2").collection("trac").aggregate([
        { $match: {  } },
        { $sort: { dt: 1 } },
        { $project: { _id: 0 } }
    ]);
    
    const resultArray = await resultCursor.toArray();

    const allDt = [...new Set(resultArray.map(item => item.dt))];

    const returnData = {
        result: resultArray,
        dt: allDt
    }

    return returnData;
}

async function socketHandler(io) {
    io.on('connection', (socket) => {

        // on connect
        const clientCount = io.engine.clientsCount;
        const sessionID = socket.id;
        console.log(`a user connected. id: ${sessionID}. current no of user: ${clientCount}`);
        io.to(sessionID).emit('trac', tracs);
    
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });
}

async function BackgroundProcess(io, allTracs, allDt) {
    console.log('starting background process');

    cron.schedule('*/1 * * * * *', async function() {
        var tmpTracs = allTracs.filter(item => item.dt.indexOf(allDt[i]) !== -1);

        tmpTracs.forEach(newTrac => {
            if (tracs.hasOwnProperty(newTrac.isin)) {
                tracs[newTrac.isin] = newTrac;
            } else {
                tracs[newTrac.isin] = newTrac;
                tracsLen++;
            }
        });

        console.log(`step ${i}. len: ${tracsLen}`);
        io.emit('trac', tracs);

        i++;
        if (i >= allDt.length) i = 0;
    });
}