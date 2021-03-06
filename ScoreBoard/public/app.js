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

//var colors = d3.scale.category20b();
var colors = d3.scaleOrdinal(d3.schemeCategory20b);
var colors2 = d3.scaleOrdinal(d3.schemeSet3);
var gameStatus = null;
var teamConfig = null;
var ci = 0;
var ci2 = 0;
var debug = true;
var winWidth = window.innerWidth, winHeight = window.innerHeight;
function log(msg) {if (debug) {console.log(msg);}}

var sock_io = io.connect();

sock_io.on('game_status', function(data){
    if (gameStatus !== data && data === "preparing"){
        gameStatus = data;
        console.log(data);
        animation_waiting.entry();
    }
    else if(data === "started"){
        if (gameStatus !== "started"){
            gameStatus = data;
            // First call for entering started status
            // Clear wait game animation
            animation_waiting.exit();
        }
    }
})

sock_io.on('dynamic', function(data){
    console.log(data)
    req_pos = animation_team_config.findTeam(data.requesting);
    atk_pos = animation_team_config.findTeam(data.attacked);
    if (data.label === "PassiveFlag")
        animation_attacking.meteor(svg, req_pos, atk_pos);
    else if (data.label === "KingOfHill")
        animation_attacking.explosion(svg, req_pos, atk_pos);
})

sock_io.on('scores', function(data){
    // Updating data
    team_scores = []
    for( var team in data ){
        scores = []
        for( var rule in data[team] ){
            scores.push({
                "Name": rule,
                "Value": data[team][rule]
            })
        }
        team_scores.push({
            "TeamName": team, 
            "Scores": scores
        })
    }
    console.log(team_scores);
    // Show competition
    //animation_score_table.force_remove(scoreTableDiv)
    animation_score_table.update(scoreTableDiv, team_scores)
})

sock_io.on('configuration', function(teams){
    teamConfig = {
        'name': 'parent',
        'children': [],
        'color': "74E616"
    };
    for (var team in teams.Teams){
        ips = []
        teams.Teams[team]["IP"].forEach((ip)=>{
            ips.push({
                'name':ip,
                'rad': Math.random() + 1,
                'color': "F05454"
            });
        })
        teamConfig['children'].push({
            'name': team,
            'children': ips,
            'color': "E8E8E8"
        });
    }
    for (var castle in teams.VuluVMs){
        teamConfig['children'].push({
            'name': castle,
            'rad': Math.random() + 1,
            'color': "4E58E4"
        });
    }
    animation_score_table.force_remove(scoreTableDiv)
    animation_team_config.force_remove()
    animation_team_config.update(teamConfig)
})

var teamConfig = null;
$(document).ready(function (){
    sock_io.emit('connection', (data)=>{

    })

    $("#btn-login").click(function (err){
        $("#login-block").removeClass("hide")
            .addClass("cover")
    })

    $("#btn-close").click(function (err){
        $("#login-block").removeClass("cover")
            .addClass("hide")
    })

    $("#login-form").submit(function(event){
        event.preventDefault();
        message = {
            "uname": $("#input-username").val(),
            "pswd": md5($("#input-pswd").val())
        }
        $.get("/login", message).done((data)=>{
            if (data.Status === "Succeed")
                $(location).prop('href', "/admin/admin.html")
            else
                alert("Wrong password or User not recongized!")
        })
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

$(window).resize(()=>{
    winWidth = window.innerWidth;
    winHeight = window.innerHeight;
    animation_team_config.update(teamConfig);
    console.log("resize")
})
