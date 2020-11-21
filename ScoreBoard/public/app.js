var svg = d3.select("#ScoreContainer")
    .append("svg:svg").style("pointer-events", "all")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight);

/* Draw background */
svg.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "#222831");

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
                    .size([winWidth, winHeight])
                    .padding(d=>{return d.data.name=="parent"?100:10})
            }
            console.log(data['scores'])
            // Updating data
            teamConfig.children.forEach((team, idx)=>{
                teamConfig.children[idx].score = data['scores'][team.name]['PassiveFlag'];
            })
            console.log(teamConfig)
            // Show competition
            var rootNode = d3.hierarchy(teamConfig)
            console.log(rootNode)
            rootNode.sum(d=>{return d.rad?d.rad:1})
            console.log("update")

            packLayout(rootNode);
            var g = svg.selectAll("g")
                .data(rootNode.descendants())
            nodes = g.enter()
                .append('g')
                .attr('transform', d=>{return `translate(${[d.x, d.y]})`})
            nodes.append('circle')
                .attr('r', (d)=>{return d.r;})
                .style('fill', (d)=>d.children?"#558899":"#443322")
                .attr('fill-opacity', d=>d.data.name=="parent"?0:0.25)
            nodes.append('text')
                .text(d=>{return d.data.name=="parent"?"":(d.data.score?d.data.name+': '+d.data.score:d.data.name)})
                .style("text-anchor", "middle")
                //.attr('x', d=>{return d.x})
                //.attr('y', d=>{return d.y})
                .attr('font-size', d=>{return d.children?"2.5em":"0.7em"})
                .attr('fill', d=>{return d.children?"#E8E8E8":"#F05454"})
                .attr('dy', d=>{return d.children?-50:0})
            g.exit().remove()

            console.log(data['scores'])
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
