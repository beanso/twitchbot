var fuzzyset = require("fuzzyset.js");
var config = require("../config.js");
var nconf = require("nconf");
var _ = require("underscore");

function banphrase(args) {
    var command = this;
    nconf.add('file', { file: 'config.json'});
    nconf.load();
    console.log(nconf.get('banphrases:#k4yleigh:fuzzy'));
    this.lists = {
        "fuzzy": [],
        "regex": [],
        "match": []
    };

};

banphrase.prototype.onInvoke = function(nick, message, channel) {
    var args = message.split(" ");
    var phrase;
    var savedList;
    var curList;

    if(args[1] == "add") {
        if(args[2] == "-f") { // Fuzzy matching
            phrase = args.slice(3);
            phrase = phrase.join(" ");
            savedList = nconf.get("banphrases:"+channel+":fuzzy");
            curList = savedList !== undefined ? savedList : [];
            curList.push(phrase);
            nconf.set('banphrases:'+channel+':fuzzy', curList);
            nconf.save(function (err) {
                console.log(err);
            });
            return "Added phrase to fuzzy ban list.";
        } else if(args[2] == "-r") { // Match regex pattern
            phrase = args.slice(3);
            phrase = phrase.join(" ");
            savedList = nconf.get("banphrases:"+channel+":regex");
            curList = savedList !== undefined ? savedList : [];
            curList.push(phrase);
            nconf.set('banphrases:'+channel+':regex', curList);
            nconf.save(function (err) {
                console.log(err);
            });
            return "Added phrase to regex ban list.";
        } else { // Match just raw word or phrase
            var phrase = args.slice(2);
            phrase = phrase.join(' ');
            savedList = nconf.get("banphrases:"+channel+":match");
            curList = savedList !== undefined ? savedList : [];
            curList.push(phrase);
            nconf.set('banphrases:'+channel+':match', curList);
            nconf.save(function (err) {
                console.log(err);
            });
            return "Added phrase to ban list."
        }

    } else if(args[1] == "del") {
        phrase = args.slice(2);
        phrase = phrase.join(" ");
        var savedLists = nconf.get("banphrases:"+channel);
        if(_.contains(savedLists['match'], phrase)) {
            var curList = nconf.get("banphrases:"+channel+":match");
            curList = _.without(curList, phrase);
            nconf.set("banphrases:"+channel+":match", curList);
            nconf.save(function (err) {
                console.log(err);
            });
            return "Removed phrase from ban list.";
        }

        if(_.contains(savedLists['regex'], phrase)) {
            var curList = nconf.get("banphrases:"+channel+":regex");
            curList = _.without(curList, phrase);
            nconf.set("banphrases:"+channel+":regex", curList);
            nconf.save(function (err) {
                console.log(err);
            });
            return "Removed phrase from ban list.";
        }

        if(_.contains(savedLists['fuzzy'], phrase)) {
            var curList = nconf.get("banphrases:"+channel+":fuzzy");
            curList = _.without(curList, phrase);
            nconf.set("banphrases:"+channel+":fuzzy", curList);
            nconf.save(function (err) {
                console.log(err);
            });
            return "Removed phrase from ban list.";
        }

    } else if(args[1] == "list") {
        var lists = nconf.get("banphrases:"+channel);
        var string = "";
        string += "Match: ";
        _.each(lists['match'], function(value, key, list) {
            string += value;
            if(value != _.last(lists['match'])) string += ", ";
        });
        string += "; Fuzzy: ";
        _.each(lists['fuzzy'], function(value, key, list) {
            string += value;
            if(value != _.last(lists['fuzzy'])) string += ", ";
        });
        string += "; Regex: ";
        _.each(lists['regex'], function(value, key, list) {
            string += value;
            if(value != _.last(lists['regex'])) string += ", ";
        });
        return string;
    }
};

getEditDistance = function(a, b){
    if(a.length == 0) return b.length;
    if(b.length == 0) return a.length;

    var matrix = [];

    // increment along the first column of each row
    var i;
    for(i = 0; i <= b.length; i++){
        matrix[i] = [i];
    }

    // increment each column in the first row
    var j;
    for(j = 0; j <= a.length; j++){
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for(i = 1; i <= b.length; i++){
        for(j = 1; j <= a.length; j++){
            if(b.charAt(i-1) == a.charAt(j-1)){
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                    Math.min(matrix[i][j-1] + 1, // insertion
                        matrix[i-1][j] + 1)); // deletion
            }
        }
    }

    return matrix[b.length][a.length];
};

banphrase.prototype.process = function(nick, message, channel) {
    var fset = fuzzyset(this.lists["fuzzy"]);
    var ret = 0;
    if(fset.get(message) != null && this.lists["fuzzy"].length > 0) console.log(fset.get(message));
    var _ = require("underscore");
    var savedList = nconf.get('banphrases:'+channel+':fuzzy');
    var curList = savedList !== undefined ? savedList : [];
    _.each(curList, function(value, key, list) {
        if(getEditDistance(message, value) <= 5) {
            ret = 10;
        }
    });
    if(this.lists["fuzzy"].length > 0 && fset.get(message)[0][0] > .65) { // if similarity of message to any in list is above 65%
        ret = 10;
    }
    var _ = require("underscore");
    savedList = nconf.get('banphrases:'+channel+':match');
    curList = savedList !== undefined ? savedList : [];
    _.each(curList, function(value, key, list) {
       if(message.indexOf(value) != -1) ret = 10;
    });


    savedList = nconf.get('banphrases:'+channel+':regex');
    curList = savedList !== undefined ? savedList : [];
    _.each(curList, function(value, key, list) {
        var reg = new RegExp(value);
        if(reg.test(message)) {
            ret = 10;
        }
    });

    return ret;
};


module.exports = banphrase;