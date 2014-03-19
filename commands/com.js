var com = function(args) {
    command = this;
    this.commands = [];


};


com.prototype.onInvoke = function(nick, message, channel) {
	var args = message.split(" ");
	if(args[1] == "add") {
		this.commands.push({trigger: args[2], string: args.splice(3).join(" ")});
        return "Command "+ args[2] + " added.";
	} else if(args[1] == "del") {

	} else if(args[1] == "edit") {

	} 
};

com.prototype.process = function(message) {
    var _ = require("underscore");
    var ret = "";
    _.each(this.commands, function(value, key, list) {
        if (message.indexOf(value.trigger) == 0) {
            ret = value.string;
            return;
        }
    });

    return ret;
};

module.exports = com;

//{
//    trigger: "",
//    perm: "",
//    string: ""
//}