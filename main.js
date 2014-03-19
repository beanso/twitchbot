var irc = require('irc');
var com = require('./commands/com.js');
var banphrase = require('./commands/banphrase.js');
var _ = require("underscore");
var nconf = require("nconf");

nconf.add('file', { file: 'connection.json'});
nconf.load();

var nick = nconf.get('username');
var pass = nconf.get('oauthToken');
var server = nconf.get('server');

function Anonbot(server, nick, pass, channels) {
    var bot = this;
    this.server = server;
    this.nick = nick;
    this.pass = pass;
    this.channels = channels;
    this.client = new irc.Client(server, nick, {
        channels: channels,
        userName: nick,
        password: pass
    });

    this.commands = new com("ok");
    this.banphrase = new banphrase("ok");

    this.ops = [];


    this.msgs = require("child_process").fork("./message_queue.js", {silent: true});
    this.msgs.on("message", function(data) {
        console.log(data);
        bot.client.say(data.target, data.message);
    });

    this.client.addListener('registered', function (message) {
        // log connected to server, set up JTVCLIENT
        console.log("Registered with server");
        for (var chan in this.channels) {
            this.join(this.channels[chan]);
        }
        this.send("TWITCHCLIENT"); // Send message to server to receive chat clear and user color info

    });

    this.client.addListener('pm', function (nick, text, message) {
        // only JTV pms for ban info and JTVCLIENT
        console.log(message);
        if(text == "CLEARCHAT") {
            console.log("Chat was cleared.");
            return;
        }
        if (nick == "jtv" && text.indexOf("CLEARCHAT") > -1) {
            var text = text.replace("CLEARCHAT ", ""); // Replace the CLEARCHAT command, leaving the user
            console.log("%s was timed out or banned", text);
            return;
        }

        bot.process(nick, bot.nick, text);
    });

    this.client.addListener('message', function (from, to, message) {
        if (to.charAt(0) !== "#") return; // This isn't a message to a channel
        bot.process(from, to, message);
    });

    this.client.addListener('+mode', function (channel, by, mode, argument, message) {
        var _ = require('underscore');
        if (mode == "o") {
            if (!_.contains(bot.ops, message.args[2])) { // If user is in the list of OPs yet
                bot.ops.push(message.args[2]);
                console.log("%s was moderated", message.args[2]);
            }
        }
    });

    this.client.addListener('-mode', function (channel, by, mode, argument, message) {
        var _ = require('underscore');
        if (mode == "o") {
            if (_.contains(bot.ops, message.args[2])) { // If user is in the list of OPs yet
                bot.ops = _.without(bot.ops, message.args[2]); // remove user from list
                console.log("%s was unmoderated", message.args[2]);
            }
        }
    });


}
process.stdout.on('error', function (err) {
    if (err.code == "EPIPE") {
    }
});

Anonbot.prototype.queue_message = function(target, message) {
    this.msgs.send({type: "message", target: target, message: message});
}

Anonbot.prototype.queue_command = function(target, message, user) {
    this.msgs.send({type: "timeout", target: target, message: message, user: user});
}

Anonbot.prototype.process = function (nick, target, message) {

    if (message.indexOf("@com") == 0 && _.contains(this.ops, nick)) {
        var str = this.commands.onInvoke(nick, message, target);
        this.queue_message(target, str);
    }

    if (message.indexOf("@banphrase") == 0 && _.contains(this.ops, nick)) {
        var str = this.banphrase.onInvoke(nick, message, target);
        this.queue_message(target, str);
    }

    var banphraseRet = this.banphrase.process(nick, message, target);
    if (!_.contains(this.ops, nick) && banphraseRet > 0) {
        setTimeout(this.queue_command(target, ".timeout "+nick+" "+banphraseRet * 60, nick), 1000);
    }

    var ret = this.commands.process(message);
    if (ret != "") this.queue_message(target, ret);

};

//var child_process = require('child_process');
//
//setTimeout(stop, 75 * 1000);
//var livestreamer = child_process.spawn('./livestreamer/livestreamer.exe',
//    [
//        'twitch.tv/moldran', 'best', '-O'
//    ], function (err, stdout, stderr) {
//    });
//
//var ffmpeg = child_process.spawn("ffmpeg",
//    ["-i", "-", "-vcodec", "flv", "-f", "flv", "-an", "-preset", "ultrafast", "-g", "1", "-keyint_min", "1", "-"],
//    { stdio: ['pipe', null, null] },
//    function (err, stdout, stderr) {
//    });
//
//ffmpeg.on('error', function (err) {
//});
//livestreamer.on('error', function (err) {
//});
//ffmpeg.stderr.on('data', function (data) {
//    console.log('stderr: ' + data);
//});
//livestreamer.stderr.on('data', function (data) {
//    //console.log('stderr: ' + data);
//});
//var util = require("util");
//process.on('uncaughtException', function (err) {
//    console.log(util.inspect(err));
//});
//
//var circularBuffer = function (buffer_size) {
//
//    var bufferSize = buffer_size;
//    var buffer = new Array(bufferSize); // After testing on jPerf -> 2 x 1D array seems fastest solution.
//
//    var end = 0;
//    var start = 0;
//
//    // Adds values to array in circular.
//    this.addValue = function (val) {
//        buffer[end] = val;
//        if (end != bufferSize) end++;
//        else end = 0;
//        if (end == start) start++;
//    };
//
//    // Returns a value from the buffer
//    this.getValue = function (index) {
//
//        var i = index + start;
//
//        if (i >= bufferSize) i -= bufferSize; //Check here.
//
//        return buffer[i];
//    };
//};
//
//var out = livestreamer.stdout;
//livestreamer.stdout.pipe(ffmpeg.stdin);
////out.on('data', function (data) {
////    ffmpeg.stdin.write(data);
////});
//var fs = require('fs');
////var writeStream = fs.createWriteStream("test.flv", {flags: "a"});
//var streamer = require("streamifier");
//var header = null;
//var flvTags = new circularBuffer(1500);
//
//var cnt = 0;
//var stop = false;
//var gotMetaTag = false;
//var gotKeyframe = false;
//
//var keyframe;
//
//ffmpeg.stdout.on("data", function (data) {
//    cnt++;
//    var stream = streamer.createReadStream(data);
//    var chunk;
//    chunk = stream.read(13); // take what might be header + prev tag size off the stream (first prevtagsize = 0)
//    if (chunk != null && chunk.readUInt8(0) == 0x46 && chunk.readUInt8(1) == 0x4c && chunk.readUInt8(2) == 0x56) //header
//    {
//        header = chunk.toString("hex"); // if found FLV, save header for later use
//    } else {
//        stream.unshift(chunk); // not header, we're in the middle of the stream
//    }
//
//    while (1) {
//
//        var curPacket = {}; // initialize current packet object
//        curPacket["fullString"] = "";
//
//        var tagTest = stream.read(1);
//        if (tagTest == null) break; // if null, reached end of stream, break out
//        curPacket["tag"] = tagTest.toString("hex"); // if it wasn't null, it's our tag
//        curPacket["fullString"] = curPacket["fullString"] + tagTest.toString("hex");  // Tag type
//
//        var lenStr = stream.read(3).toString("hex"); // get tag body length (full tag - 11 bytes)
//        curPacket["len"] = lenStr;
//        var lenNum = parseInt(lenStr, 16); // convert hex string to number for reading
//        curPacket["fullString"] = curPacket["fullString"] + lenStr; // append length of body
//
//        var timestamp = stream.read(4).toString("hex");
//        curPacket["timestamp"] = timestamp;
//        curPacket["fullString"] = curPacket["fullString"] + timestamp; // append timestamp and timestampextended, might separate later
//
//        curPacket["streamid"] = stream.read(3).toString("hex");
//        curPacket["fullString"] = curPacket["fullString"] + curPacket["streamid"]; // append streamid
//
//        curPacket["body"] = stream.read(lenNum).toString("hex");
//        curPacket["fullString"] = curPacket["fullString"] + curPacket["body"]; // append the body of the tag, using lenNum
//
//        var testChunk = stream.read(4);
//        if (testChunk == null) {
//            break;
//        } else {
//            curPacket["prevTagSize"] = testChunk.toString("hex");
//            curPacket["fullString"] = curPacket["fullString"] + testChunk.toString("hex"); // append previous tag size
//        }
//
//        if (tagTest.toString("hex") == "12") console.log("found meta");
//
//        if (tagTest.toString("hex") == "12" && gotMetaTag == false) {
//            gotMetaTag = true;
//            header = header + curPacket["fullString"];
//        } else {
//            if (curPacket["tag"] === "09" && curPacket["body"].slice(0, 1) === "1" && gotKeyframe == false) {
//                gotKeyframe = true;
//                keyframe = curPacket;
//                console.log("found keyframe");
//            }
//            flvTags.addValue(curPacket)
//        }
//    }
//});
//
//function tryParseJSON (jsonString){
//    try {
//        var o = JSON.parse(jsonString);
//
//        // Handle non-exception-throwing cases:
//        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
//        // but... JSON.parse(null) returns 'null', and typeof null === "object",
//        // so we must check for that, too.
//        if (o && typeof o === "object" && o !== null) {
//            return o;
//        }
//    }
//    catch (e) { }
//
//    return false;
//};
//
//function makeid() {
//    var text = "";
//    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//
//    for (var i = 0; i < 8; i++)
//        text += possible.charAt(Math.floor(Math.random() * possible.length));
//
//    return text;
//}
//
//function stop() {
//
//    ffmpeg.kill();
//    livestreamer.kill();
//    console.log("okok");
//    var tagString = "";
//    for (var i = 0; i < 1500; i++) {
//        tagString = tagString + flvTags.getValue(i)["fullString"];
//    }
//    tagString = keyframe["fullString"] + tagString;
//    tagString = header + tagString;
//    var fileBuffer = new Buffer(tagString, "hex");
//    var fs = require('fs');
//    fs.writeFile("test.flv", fileBuffer, function (err) {
//        if (err) {
//            console.log(err);
//        } else {
//            console.log("The file was saved!");
////            var id = makeid();
////            var request = require('request');
////            var youtube = require('youtube');
////            var video = youtube
////                .createUpload('test.flv')
//          //     .user("anonymoose654321")
////            var aws = require('aws-sdk');
////            var s3 = new aws.S3({
////                accessKeyId: "AKIAIV5N5MH7L3P67NYA",
////                secretAccessKey: "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",
////                region: "us-west-2"
////            });
////            child_process.exec("ffmpeg -i test.flv -t 8 -r 10 -vf scale=640:-1 -qscale 5 imgs/out%02d.png",
////                function (err, stdout, stderr) {
////                    console.log("exploded");
////                    var readStream = fs.readFileSync("res.gif");
////                    var params = {
////                        Body: readStream,
////                        Bucket: "anonbotgif",
////                        Key: id + ".gif",
////                        ACL: "public-read"
////                    };
////                    s3.putObject(params, function (err, data) {
////                        console.log(err);
////                        console.log(data);
////                        console.log(id);
////                        request("http://upload.gfycat.com/transcode/" + id + "?fetchUrl=" + encodeURIComponent("https://s3-us-west-2.amazonaws.com/anonbotgif/" + id + ".gif"), function (error, response, body) {
////                            if(tryParseJSON(body)) {
////                                var bodyObj = tryParseJSON(body);
////                                var gfyName = bodyObj.gfyname;
////                                var url = "http://gfycat.com/"+gfyName;
////                                console.log(url);
////                            } else {
////                                console.log(body);
////                            }
////                        });
////                    });
////                    child_process.exec("convert -delay 1 imgs/out*.png res.gif",
////                        function (err, stdout, stderr) {
////                            console.log("giffed");
////                            var readStream = fs.readFileSync("res.gif");
////                            var params = {
////                                Body: readStream,
////                                Bucket: "anonbotgif",
////                                Key: id + ".gif",
////                                ACL: "public-read"
////                            };
////                            s3.putObject(params, function (err, data) {
////                                console.log(err);
////                                console.log(data);
////                                console.log(id);
////                                request("http://upload.gfycat.com/transcode/" + id + "?fetchUrl=" + encodeURIComponent("https://s3-us-west-2.amazonaws.com/anonbotgif/" + id + ".gif"), function (error, response, body) {
////                                    if(tryParseJSON(body)) {
////                                        var bodyObj = tryParseJSON(body);
////                                        var gfyName = bodyObj.gfyname;
////                                        var url = "http://gfycat.com/"+gfyName;
////                                        console.log(url);
////                                    } else {
////                                        console.log(body);
////                                    }
////                                });
////                            });
////
////                        });
//               // });
//        }
//    });
//}
//
//
//Anonbot.prototype.make_gif = function () {
//    console.log("okok");
//    var tagString = "";
//    for (var i = 0; i < 1500; i++) {
//        tagString = tagString + flvTags.getValue(i)["fullString"];
//    }
//    tagString = keyframe["fullString"] + tagString;
//    tagString = header + tagString;
//    var fileBuffer = new Buffer(tagString, "hex");
//    var fs = require('fs');
//    fs.writeFile("test.flv", fileBuffer, function (err) {
//        if (err) {
//            console.log(err);
//        } else {
//            console.log("The file was saved!");
//            var id = makeid();
//            var request = require('request');
//            var aws = require('aws-sdk');
//            var s3 = new aws.S3({
//                accessKeyId: "AKIAIV5N5MH7L3P67NYA",
//                secretAccessKey: "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",
//                region: "us-west-2"
//            });
//            child_process.exec("ffmpeg -i test.flv -t 8 -r 10 -vf scale=1024:-1 -qscale 5 imgs/out%02d.png",
//                function (err, stdout, stderr) {
//                    console.log("exploded");
//                    child_process.exec("convert -delay 1 imgs/out*.png res.gif",
//                        function (err, stdout, stderr) {
//                            console.log("giffed");
//                            var readStream = fs.readFileSync("res.gif");
//                            var params = {
//                                Body: readStream,
//                                Bucket: "anonbotgif",
//                                Key: id + ".gif",
//                                ACL: "public-read"
//                            };
//                            s3.putObject(params, function (err, data) {
//                                console.log(err);
//                                console.log(data);
//                                console.log(id);
//                                request("http://upload.gfycat.com/transcode/" + id + "?fetchUrl=" + encodeURIComponent("https://s3-us-west-2.amazonaws.com/anonbotgif/" + id + ".gif"), function (error, response, body) {
//                                    var bodyObj = JSON.parse(body);
//                                    var gfyName = bodyObj.gfyname;
//                                    var url = "http://gfycat.com/"+gfyName;
//                                    return url;
//                                });
//                            });
//
//                        });
//                });
//        }
//    });
//
//}


var a = new Anonbot(server, nick, pass, ['#anon7654321', '#k4yleigh', '#nl_kripp']);
