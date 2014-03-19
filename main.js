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

var args = process.argv.slice(2);


var a = new Anonbot(server, nick, pass, args);
