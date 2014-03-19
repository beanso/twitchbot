var circularBuffer = function (buffer_size) {

    var bufferSize = buffer_size;
    var buffer = new Array(bufferSize); // After testing on jPerf -> 2 x 1D array seems fastest solution.

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