var utils = require('./utilities.js');
var moment = require('moment');

var circularBuffer = function (buffer_size) {

    var bufferSize = buffer_size;
    var buffer = new Array(bufferSize);

    var end = 0;
    var start = 0;

    // Adds values to array in circular.
    this.addValue = function (val) {
        buffer[end] = val;
        if (end != bufferSize) end++;
        else end = 0;
        if (end == start) start++;
    };

    // Returns a value from the buffer
    this.getValue = function (index) {

        var i = index + start;

        if (i >= bufferSize) i -= bufferSize; //Check here.

        return buffer[i];
    };
};
queue = [];
cbuffer = new circularBuffer(17);

// initialize buffer with times 30s earlier
for(var i = 0; i <= 17; i++) {
    cbuffer.addValue(moment().subtract("seconds", 30));
}

// Add a message object to the queue
var add = function(obj) {
    queue.push(obj);
    console.log(obj.message);
}

// Get next message in queue
var getNext = function() {
    return queue.shift();
}


var dispatch = function() {

    // If first message in buffer is less than 30s ago, we've said 17 lines in the past 30s
    // Return to avoid hitting global ban trigger (more than 20 lines in 30s)
    if(moment().diff(cbuffer.getValue(1)) < 30 * 1000) {
        return;
    }

    var msg = getNext();

    // Send message to main process to send to server and add current time to time buffer
    if(typeof msg != "undefined") {
        process.send(msg);
        cbuffer.addValue(moment());
    }
}

process.on('message', function(m) {
    if(m.type === "timeout") {
        for(var i in queue) {
            // If the user is already in queue to receive a timeout, ignore
            if(queue[i].type === "timeout" && queue[i].user == m.user)
                return;
        }
    }
   add(m);
});

setInterval(dispatch, 1000);

