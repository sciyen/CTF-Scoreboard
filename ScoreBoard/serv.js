const fs = require("fs");
const http = require('http');

const {transports, createLogger, format} = require('winston');

const logger = createLogger({
    level: 'verbose',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.Console({level: 'info'}),
        new transports.File({filename: './logs/sys_log.log', level: 'info'}),
        new transports.File({filename: './logs/combined_log.log', level: 'verbose'}),
    ]
})

// Hash
var crypto = require("crypto");
//const crypto = require('crypto');
//const hash = crypto.createHash('sha256');

// Express
const express = require('express');
const app = express();
const port = 10418;

/* session */
const session = require('express-session');

// SocketIO
const io = require('socket.io');

// Score Calculator
const SC = require('./ScoreCalculator.js')

/*********************************************************/
/*                 Configuration File                    */
/*********************************************************/
/* Read data from file */
const TeamConfigFilename = './configs/team_configs.json'
const DatabaseFilename = './configs/database.json'
const GameRuleFilename = './configs/game.json'
const KeysFilename = './configs/keys.json'

/*********************************************************/
/*                 Global varialbe setup                 */
/*********************************************************/
const game_rules = load_from_json(GameRuleFilename);
var team_configs = load_from_json(TeamConfigFilename);
var keys_configs = load_from_json(KeysFilename);

/* Helper functions for json file reading and saving */
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

function getInputValue(value){
    if( value === undefined ||
        value == null ||
        value.length <= 0 ||
        value.indexOf('\"') >= 0 ||
        value.indexOf('\'') >= 0 ||
        value.indexOf('<') >= 0 ||
        value.indexOf('>') >= 0 ||
        value.indexOf('(') >= 0 ||
        value.indexOf(')') >= 0 ||
        value.indexOf(' ') >= 0 ||
        value.indexOf(',') >= 0){
        return false
    }
    return value
}

function checkAccount(uname, pswd){
    if( getInputValue(uname) !== false &&
        keys_configs.account[uname] !== undefined && 
        getInputValue(pswd) !== false &&
        keys_configs.account[uname] === pswd)
        return true
    else
        return false
}

/*********************************************************/
/*                      Server setup                     */
/*********************************************************/
logger.info("System startup, reading database.");

server = http.createServer(app)
server.listen(port, ()=>{
    console.log (`Express listening on port:${port} `);
})

// socket.io 
sock_io = io(server);

// express-session
app.use(session({
    secret: keys_configs.session_key, 
    cookie: { "sid": 0 }
}));

var scores = null;
/* If old scores data not exist, create a new one */
if (fs.existsSync(DatabaseFilename)){
    logger.info("Restore scores data from existing config file.");
    scores = load_from_json(DatabaseFilename)
}
else{
    logger.info("Old file not found, creating new scores.");
    scores = SC.score_init(team_configs, game_rules);
}

/* Start up message */
logger.info("Initial scores. ", {'scores': scores});
logger.info("Rule settings. ", {'rules': game_rules});
logger.info("Team configuration. ", {'teams': team_configs});

/* Global variables */
// preparing, started, ended
var gameStatus = "preparing";

PassiveFlagHandler = new SC.PassiveFlagDescriptor(team_configs, game_rules, false, logger);
KingOfHillHandler = new SC.KingOfHillDescriptor(team_configs, game_rules, logger);

// app.disable('etag');
app.use(express.static(__dirname + '/public'));
app.use(function(req, res, next){
    if (req.session.uname == null && req.path.indexOf('/admin') >= 0){
        res.redirect('/index.html');
    }
    next();
})
app.use('/admin', express.static(__dirname + '/private'));

sock_io.on('connection', (sock)=>{
    var address = sock.handshake.address;
    logger.info(`New client page from ${address}`);
    sock_io.emit('game_status', gameStatus);
    sock_io.emit('scores', scores);
    sock_io.emit('configuration', team_configs);
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
app.get("/flag", function(req, res){
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

app.get("/admin/change_team_config", function (req, res){
    console.log(req.query)
    team_configs = req.query;
    res.send("ok")
})

app.get("/login", function(req, res){
    const uname = req.query.uname;
    const pswd = req.query.pswd;
    if (checkAccount(uname, pswd)){
        req.session.uname = uname;
        res.send({'Status':'Succeed'});
        logger.info(`[Login] Succeed to login, username: ${uname}`);
    }
    else{
        logger.warn(`[Login] Invalid user try to login with username: ${uname} pswd: ${pswd}`);
        res.send({'Status':'Failed'});
    }
})

app.get("/logout", function(req, res){
    req.session.destroy((err)=>{
        console.log(err)
    })
    res.send('ok')
})

/* Perform the game status change and response to the client
 */
function changeStatus(req_status, res){
    gameStatus = req_status;
    res.send('ok');
    logger.warn(`[Management Info] Game status changes to ${gameStatus}`);
}

/* Handling the request for game status setting
 * Status: 
 *      Preparing, Started, ended
 */
var saveInterval = null
app.get("/admin/change_game_status", function (req, res){
    const req_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if(req.query.set === gameStatus){
        // Repeated request, ignore it
        res.send('Repeated request');
        logger.warn(`[Management Error] Repeated request`);
    }
    else{
        // Set game status
        if (req.query.set === "started"){
            /*saveInterval = setInterval(()=>{
                save_to_json(scores, DatabaseFilename);
            }, 1000);*/
            changeStatus(req.query.set, res);
        }
        else if (req.query.set === "ended"){
            if (saveInterval !== null)
                save_to_json(scores, DatabaseFilename);
            clearInterval(saveInterval);
            changeStatus(req.query.set, res);
        }
        else if (req.query.set === "preparing"){
            changeStatus(req.query.set, res);
        }
        else{
            res.send('Bad request for game status setting!');
            logger.warn(`[Management Error] Bad request for game status setting!, from ${req_ip}`);
        }
        // Update game status
        sock_io.emit('game_status', gameStatus);
        sock_io.emit('scores', scores);
    }
})

