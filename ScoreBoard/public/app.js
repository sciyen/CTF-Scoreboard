var svg = d3.select("#RealTimeSvgContainer")
    .append("svg:svg").style("pointer-events", "all")
    .attr('class', "extend-height")
    .attr("width", "100%")
    //.attr("width", window.innerWidth)
    //.attr("height", window.innerHeight);

var waiting_svg = d3.select('#ScoreContainer')
    .append("svg:svg").style("pointer-events", "all")
    .attr('id', 'waiting-svg')
    .attr('class', "extend-height hide cover")
    .attr("width", "100%")

/* Draw background */
svg.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "#222831");

var scoreTableDiv = d3.select('#RealTimeScoreContainer')
    .append('div').attr('id', 'tableContainer')

var colors = d3.scale.category20b();
var gameStatus = null;
var teamConfig = null;
var ci = 0;
var debug = true;
var winWidth = window.innerWidth, winHeight = window.innerHeight;
function log(msg) {if (debug) {console.log(msg);}}

var teamConfig = null;
$(document).ready(()=>{
    $.get("/configuration", (teams)=>{
        teamConfig = {
            'name': 'parent',
            'children': []
        };
        for (var team in teams.Teams){
            ips = []
            teams.Teams[team]["IP"].forEach((ip)=>{
                ips.push({
                    'name':ip,
                    'rad': d3.randomUniform(0.5, 1.5)()
                });
            })
            teamConfig['children'].push({
                'name': team,
                'score': 0,
                'children': ips
            });
        }
    })
})

var waitGameAnimate = null;
var packLayout = null;

function getDivWidth(div){
    var width = d3.select(div).style('width').slice(0, -2)
    return Math.round(Number(width))
}
function getDivHeight(div){
    var height = d3.select(div).style('height').slice(0, -2)
    return Math.round(Number(height))
}

function getScoreInfo(){
    $.get("/score", (data)=>{
        if (gameStatus !== data['status'] && data['status'] === "preparing"){
            gameStatus = data['status'];

            console.log(data['status']);
            animation_waiting.entry();
        }
        else if(data['status'] === "started"){
            if (gameStatus !== "started"){
                gameStatus = "started"
                // First call for entering started status
                // Clear wait game animation
                animation_waiting.exit();
                packLayout = d3.pack()
                    .size([winWidth * 0.8, 
                           getDivHeight('body')-getDivHeight('#navTab')])
                    .padding(d=>{return d.data.name=="parent"?100:10})
                animation_team_config.entry(teamConfig)
            }
            //console.log(data['scores'])
            // Updating data
            teamConfig.children.forEach((team, idx)=>{
                teamConfig.children[idx].score = data['scores'][team.name]['PassiveFlag'];
            })
            // Show competition
            team_scores = []
            for( var team in data['scores'] ){
                scores = []
                for( var rule in data['scores'][team] ){
                    scores.push({
                        "Name": rule,
                        "Value": data['scores'][team][rule]
                    })
                }
                team_scores.push({
                    "TeamName": team, 
                    "Scores": scores
                })
            }
            console.log(team_scores);
            animation_score_table.update(scoreTableDiv, team_scores)
        }
    })
}

setInterval(()=>{
    getScoreInfo();
}, 1000);

$(window).resize(()=>{
    winWidth = window.innerWidth;
    winHeight = window.innerHeight;
    console.log("resize")
})

//$("#game_status_change").submit()
