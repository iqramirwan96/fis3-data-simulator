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

    // await group_trac_by_dt(allTracs, allDt);

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

// async function group_trac_by_dt(allTracs, allDt) {
//     var groups_of_tracs = [];
//     for (let i = 0; i < allDt.length; i++)
//     {
//         console.log("i: ", i);
//         var trac_group = allTracs.filter(item => item.dt.indexOf(allDt[i]) !== -1);
//         groups_of_tracs.push(trac_group);
//     }
//     console.log(groups_of_tracs.length);
// }

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

    // cron.schedule('*/1 * * * * *', async function() {
    //     var tmpTracs = allTracs.filter(item => item.dt.indexOf(allDt[i]) !== -1);

    //     tmpTracs.forEach(newTrac => {
    //         if (tracs.hasOwnProperty(newTrac.isin)) {
    //             tracs[newTrac.isin] = newTrac;
    //         } else {
    //             tracs[newTrac.isin] = newTrac;
    //             tracsLen++;
    //         }
    //     });

    //     console.log(`step ${i}. len: ${tracsLen}`);
    //     io.emit('trac', tracs);

    //     i++;
    //     if (i >= allDt.length) i = 0;
    // });

    let i = 0;
    let steps = 10000;
    let start_index = 0;
    let end_index = steps;
    let delay_in_ms = 200;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const emitTracWithDelay = async () => {
        while(true) {
            await delay(delay_in_ms);

            // var tmp_tracs = allTracs.slice(start_index, end_index);

            // for (let k = 0; k < tmp_tracs.length; k++)
            // {
            //     if (tmp_tracs[k] == null) break;
            //     io.emit('trac', tmp_tracs[k]);
            // }

            // if (end_index > allTracs.length)
            // {
            //     start_index = 0;
            //     end_index = steps;
            // }
            // else
            // {
            //     start_index = end_index;
            //     end_index = end_index + steps;
            // }

            var tracs_group = allTracs.filter(item => item.dt.indexOf(allDt[i]) !== -1);

            io.emit('trac', tracs_group);
            // console.log("time: ", new Date());

            i++;
            if (i >= allDt.length) i = 0;
        }
    };

    emitTracWithDelay();
}