const fs = require("fs");
const http = require('http');

// Hash
var crypto = require("crypto");
//const crypto = require('crypto');
//const hash = crypto.createHash('sha256');

// Express
const express = require('express');
const app = express();
const port = 10418;

// SocketIO
const io = require('socket.io');

// Score Calculator
const SC = require('./ScoreCalculator.js')

/* Read data from file */
const TeamConfigFilename = './configs/team_configs.json'
const DatabaseFilename = './configs/database.json'
const GameRuleFilename = './configs/game.json'

server = http.createServer(app)
server.listen(port, ()=>{
    console.log (`Express listening on port:${port} `);
})

sock_io = io(server);

/*
 * Helper functions for json file reading and saving
 */
function load_from_json(filename){
    var file = fs.readFileSync(filename);
    var json_obj = JSON.parse(file)
    return json_obj
}
function save_to_json(content, filename){
    var content_txt = JSON.stringify(content)
    fs.writeFile(filename, content_txt, 'utf-8', (err)=>{
        if (err) console.log("Error to write into " + filename)
    })
}

console.log (`Reading database... `);
const game_rules = load_from_json(GameRuleFilename)
const team_configs = load_from_json(TeamConfigFilename)

var scores = null;
/* If old scores data not exist, create a new one */
if (fs.existsSync(DatabaseFilename)){
    console.log("Restore scores data from existing config file")
    scores = load_from_json(DatabaseFilename)
}
else
    scores = SC.score_init(team_configs, game_rules);

/* Start up message */
console.log("Scores:");
console.log(scores)

console.log("Rules:");
console.log(game_rules)

console.log("Machines config:");
console.log(team_configs)

/* Global variables */
// preparing, started, ended
var gameStatus = "preparing";

PassiveFlagHandler = new SC.PassiveFlagDescriptor(team_configs, game_rules, false);
KingOfHillHandler = new SC.KingOfHillDescriptor(team_configs, game_rules);

// app.disable('etag');
app.use(express.static(__dirname + '/public'));

sock_io.on('connection', ()=>{
    console.log("Get new client page open")
    sock_io.emit('game_status', gameStatus);
    sock_io.emit('scores', scores);
})

/* Handling scores data updating
 */
function scores_emit(msg, score, info){
    if ( typeof(info) !== 'undefined')
        sock_io.emit('scores', score);
        
    if (msg == "ok"){
        scores = score;
        sock_io.emit('dynamic', info);
    }
    else if (msg == "InvailidRequest"){

    }
    else if (msg == "KeyError"){
        sock_io.emit('dynamic', info);
    }
    else if (info == null){
    }
}

/* Handling request from flag listener
 */
app.get("/flag", (req, res)=>{
    if (gameStatus === "started"){
        switch (req.query.type){
            case "PassiveFlag":
                PassiveFlagHandler.calc_score(req, scores, (msg, score, atk)=>{
                    scores_emit(msg, score, atk);
                    res.send(msg);
                })
                console.log(scores)
                break;
            case "KingOfHill":
                KingOfHillHandler.calc_score(req, scores, (msg, score, atk)=>{
                    scores_emit(msg, score, atk);
                    res.send(msg);
                })
                break;
        }
    }
    console.log(scores)
    save_to_json(scores, DatabaseFilename);
})

/* Handling request for score data and game status
 */
/*
app.get("/score", (req, res)=>{
    res.json({
        "status": gameStatus,
        "scores": scores
    });
})*/

/* Handling the request for team configuration
 */
app.get("/configuration", (req, res)=>{
    res.json(team_configs);
})

/* Handling the request for game status setting
 * Status: 
 *      Preparing, Started, ended
 */
var saveInterval = null
app.get("/game_status", (req, res)=>{
    if (typeof req.query.token === "undefined" || 
        req.query.token !== "pswd"){
        res.send('Authorization Failed');
    }
    else if(req.query.set === gameStatus){
        // Repeated request, ignore it
        res.send('Repeated request');
    }
    else{
        // Set game status
        gameStatus = req.query.set;
        if (req.query.set === "started"){
            /*saveInterval = setInterval(()=>{
                save_to_json(scores, DatabaseFilename);
            }, 1000);*/
            res.send('ok');
        }
        else if (req.query.set === "ended"){
            if (saveInterval !== null)
                save_to_json(scores, DatabaseFilename);
            clearInterval(saveInterval);
            res.send('ok');
        }
        else if (req.query.set === "preparing"){
            res.send('ok');
        }
        else
            res.send('Bad request for game status setting!');
        // Update game status
        console.log(`Game status change to: ${gameStatus}`);
        sock_io.emit('game_status', gameStatus);
        sock_io.emit('scores', scores);
    }
})

//console.log (`listening on port:${port} `);
//app.listen(port);


