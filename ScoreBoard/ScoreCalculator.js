var crypto = require("crypto");
function score_init(team_configs, rules, logger){
    var scores = {};
    logger.info("[Scores Reset] Warning... scores reseting")
    for(var team in team_configs.Teams){
        scores[team] = {};
        for(var score in rules){
            scores[team][score] = 0;
        }
    }
    return scores;
}

class RuleDescriptor{
    constructor(label, rules, logger){
        this.label = label;
        this.rule = rules[this.label];
        this.logger = logger;
    }

    /* Generate the relation table between requesting ip address
     * and its owner team (configured in `team configuration`).
     */
    generate_ip_table(team_configs, allowRepeated=false){
        var ip_table = []
        for (var team in team_configs.Teams){
            team_configs.Teams[team]['IP'].forEach((ip)=>{
                if (!allowRepeated || typeof ip_table[ip] === "undefined")
                    // TODO: repeated ip
                    ip_table[ip] = team
                else
                    this.logger.error(`[${this.label}] IP table generating error, 
                        Conflict IP ${ip} between ${ip_table[ip]} and ${team}`)
            })
        }
        return ip_table;
    }

    calc_flag_hash(flag, team){
        return flag + team;
    }

   /* Createa table to match the relationship between flags
     * and the requesting team
     */
    generate_hash_table(team_configs){
        var hashes = [];
        for(var team in team_configs.Teams){
            hashes[this.calc_flag_hash(this.key_flag, team)] = team;
        }
        return hashes;
    }

    /* Check the required querying key is valid, which was 
     * specified in `game rule config` json file. 
     * There are two key that must be included, ip and time.
     */
    check_valid_input(req){
        this.rule.Query.forEach((key)=>{
            const query = req.query[key];
            if (typeof query === "undefined"){
                this.logger.warn(`[${this.label}] Missing game rule attribute.`, {'query': req.query})
                return false;
            }
        })
        if (typeof req.query.ip === "undefined" ||
            typeof req.query.time === "undefined"){
            this.logger.warn(`[${this.label}] Missing IP or time attribute.`, {'query': req.query})
            return false;
        }
        return true;
    }

    /* Pack up attacking information so as to visualizing
     * the procedure of attacking 
     */
    pack_attacking_info(requesting_team, attacked_team){
        return {
            "label": this.label,
            "requesting": requesting_team,
            "attacked": attacked_team
        }
    }
}

/***************************************************************
 * The attacking team should try to hack into opposite side's 
 * territory server, and send specific flag which was described 
 * in `game rule` to the FlagListenerServer, and then, the 
 * FlagListenerServer will transfer the request to this score
 * board server.
 * 
 * Methods:
 *     scores = calc_score(req, scores): 
 *         if already knowning that the type of the request is 
 *         a passive flag, call this func to calculate scores.
 ***************************************************************/
class PassiveFlagDescriptor extends RuleDescriptor{
    constructor(team_configs, rules, allowRepeatedIp=false, logger){
        super("PassiveFlag", rules, logger);
        // Only support single flag now
        this.key_flag = this.rule.Flag;
        this.ip_tables = super.generate_ip_table(team_configs, allowRepeatedIp);
        this.hash_table = super.generate_hash_table(team_configs);
    }

    check_valid_input(req, flag){
        const ip = req.query.ip;
        if (!super.check_valid_input(req))
            return false;
        if (typeof this.ip_tables[ip] === "undefined" ||
            typeof this.hash_table[flag] === "undefined"){
            this.logger.warn(`[${this.label}] Lookup failed.`, {'query': req.query})
            return false;
        }
        return true;
    }

    /* Assuming already knowing the type of this req is for 
     * Passive flag, this function check the input and updating 
     * the scores.
     */
    calc_score(req, scores, callback){
        const flag = req.query[this.rule.Query[0]];
        const ip = req.query.ip;
        var attack_info = null;
        var msg = "";
        if(!this.check_valid_input(req, flag)){
            // Valid input
            this.logger.warn(`[${this.label}] Invalid request.`, {'query': req.query})
            msg = "InvalidRequest";
        }
        else{
            const req_team = this.hash_table[flag];
            const att_team = this.ip_tables[ip];
            scores[req_team][this.label] += this.rule.Reward;
            scores[att_team][this.label] -= this.rule.Punish;
            msg = "ok";
            attack_info = super.pack_attacking_info(req_team, att_team);
            this.logger.info(`[${this.label}] Attack succeed.`, {'attack': attack_info})
        }
        callback(msg, scores, attack_info);
    }

}

class KingOfHillDescriptor extends RuleDescriptor{
    constructor(team_configs, rules, logger){
        super("KingOfHill", rules, logger);
        this.key_flag = this.rule.KeyRequestFlag;
        this.generate_domainent(team_configs)
        this.hash_table = super.generate_hash_table(team_configs);
    }

    check_valid_input(req, flag){
        const ip = req.query.ip;
        if (!super.check_valid_input(req) ||
            typeof this.ip_tables[ip] === "undefined"){
            this.logger.warn(`[${this.label}] Lookup failed.`, {'query': req.query})
            return false;
        }
        return true;
    }

    generate_domainent(team_configs){
        this.domainent = {};
        this.ip_tables = {};
        for( var castle in team_configs.VuluVMs){
            this.domainent[castle] = {
                "key": "",
                "attack": {}
            }
            for( var team in team_configs.Teams){
                this.domainent[castle].attack[team] = {
                    "times": 0,
                    "last_req_time": 0
                }
            }
            // Relation table from ip to castle name
            this.ip_tables[team_configs.VuluVMs[castle]] = castle;
        }
    }

    check_domainent(flag, ip){
        const req_team = this.hash_table[flag];
        const castle = this.ip_tables[ip];
        if( Date.now() - this.domainent[castle].attack[req_team].last_req_time > this.rule.IntervalForRequest){
            // new request for key
            this.domainent[castle].attack[req_team].times = 0;
        }
        else{
            // 
            this.domainent[castle].attack[req_team].times += 1;
        }
        this.domainent[castle].attack[req_team].last_req_time = Date.now();
        return this.domainent[castle].attack[req_team].times;
    }

    calc_score(req, scores, callback){
        const flag = req.query[this.rule.Query[0]];
        const ip = req.query.ip;
        var attack_info = null;
        var msg = "";
        if(!this.check_valid_input(req, flag)){
            // Valid input
            this.logger.warn(`[${this.label}] Invalid request.`, {'query': req.query})
            msg = "InvalidRequest"
        }
        else{
            const req_team = this.hash_table[flag];
            const att_team = this.ip_tables[ip];
            if (flag === this.key){
                if( typeof req.query.team === "undefined" ||
                    typeof scores[req.query.team] === "undefined")
                    msg = "team name not specified or team name error"
                else{
                    scores[req.query.team][this.label] += this.rule.Reward;
                    console.log(`${this.label} attack succeed`);
                    this.logger.info(`[${this.label}] ${req.query.team} Succeed to occupy the castle ${att_team}.`)
                    msg = "ok";
                }
            }
            else if (typeof this.hash_table[flag] !== "undefined"){
                // Request for key
                const req_times = this.check_domainent(flag, ip);
                if ( req_times >= this.rule.TimesForKey){
                    // Generate new key
                    //this.key = Math.random().toString(36).substring(20);
                    this.key = crypto.randomBytes(20).toString('hex');
                    msg = this.key;
                    this.logger.info(`[${this.label}] ${req_team} Succeed to get the key of castle ${att_team}.`)
                }
                else{
                    msg = req_times.toString();
                }
                this.logger.info(`[${this.label}] ${req_team} requests the key of castle ${att_team}.`)
            }
            else{
                console.log("key error");
                msg = "keyError"
            }
            attack_info = super.pack_attacking_info(req.query.team, att_team);
            this.logger.info(`[${this.label}] Attack succeed.`, {'attack': attack_info})
        }
        callback(msg, scores, attack_info);
    }
}

module.exports.score_init = score_init
module.exports.PassiveFlagDescriptor = PassiveFlagDescriptor
module.exports.KingOfHillDescriptor = KingOfHillDescriptor
