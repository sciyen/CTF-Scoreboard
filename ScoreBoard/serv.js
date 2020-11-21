const fs = require("fs");

// Hash
//const crypto = require('crypto');
//const hash = crypto.createHash('sha256');

// Express
const express = require('express');
const app = express();
const port = 10418;

// Score Calculator
const SC = require('./ScoreCalculator.js')

/* Read data from file */
const TeamConfigFilename = './configs/team_configs.json'
const DatabaseFilename = './configs/database.json'
const GameRuleFilename = './configs/game.json'

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

PassiveFlagHandler = new SC.PassiveFlagDescriptor(team_configs, game_rules, false)
app.disable('etag');
app.use(express.static(__dirname + '/public'));

/* 
 * Handling request from flag listener
 */
app.get("/flag", (req, res)=>{
    if (gameStatus === "started")
        PassiveFlagHandler.calc_score(req, scores)
    res.send('ok');
    /*const flag = req.query.flag;
    const time = req.query.time;
    const ip = req.query.ip;
    const attackedTeam = ip_table[ip];

    // TODO: Allow attack from any ip address?
    if (typeof attackedTeam !== "undefined" && 
        typeof flag !== "undefined"         &&
        typeof rules_table[flag] !== "undefined"){

        // Lookup rule table
        const reqTeam = rules_table[flag].team;
        const points = rules_table[flag].points;

        // Check the attacked server is not from the same team
        if (reqTeam == attackedTeam){
            res.send('Attacked from same team');
            return
        }
        
        // Calculate scores
        scores[reqTeam]["Flag"] += points;
        scores[attackedTeam]["Flag"] -= points;

        // TODO: log points history
        res.send('ok');
    }
    else
        res.send('IP not authorized or Flag format error');
        */
    console.log(scores)
})

/* 
 * Acquiring score data and game status
 */
app.get("/score", (req, res)=>{
    console.log(scores)
    res.json({
        "status": gameStatus,
        "scores": scores
    });
})

/*
 * Handling the request for team configuration
 */
app.get("/configuration", (req, res)=>{
    res.json(team_configs);
})

/*
 * Handling the request for game status setting
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
            saveInterval = setInterval(()=>{
                save_to_json(scores, DatabaseFilename);
            }, 1000);
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
    }
})

console.log (`listening port:${port} `);
app.listen(port);
