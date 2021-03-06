function addRandomNoise(pos, range){
	pos.x += (Math.random()-0.5)*range;
	pos.y += (Math.random()-0.5)*range;
	return pos;
}

visual = {
    hexagon: function(mx, my, h, w, n, r, d, timeScale, target){
        var rotation = 0;
        for (var k=0; k<n; k++){
            target.append("svg:circle")
                .attr("transform", "rotate("+rotation+","+mx+","+my+")")
                .attr("cx", mx)
                .attr("cy", my)
                .attr("r", r)
                .style("stroke", colors())
                .style("stroke",colors(++ci)).style("fill", colors(++ci)).style("stroke-opacity",0.6).style("fill-opacity",0.4)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx + d).attr("cy", my + d)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx - d)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx - d).attr("cy", my - d)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cy",my - d).attr("cx", mx + d)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx + d).attr("cy", my + d)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",my + d).attr("cy", my - d)
                .style("stroke-opacity",1e-6).style("fill-opacity", 1e-6).remove();
            rotation+=(360/n);
        }
    },
    balls: function (pos1, pos2, r, n, timeScale, target){
        for( var k=0; k<n; k++){
            setTimeout(()=>{
                target.append("svg:circle")
                    .attr("cx", pos1.x).attr("cy", pos1.y)
                    .attr("r", r)
                    .style("fill", colors2(++ci)).style("fill-opacity", 0.8)
                    .transition().duration(timeScale*200).ease(Math.sqrt).attr("cx", pos2.x).attr("cy", pos2.y)
                    .transition().duration(timeScale*200).ease(Math.sqrt).attr("r", 100).style("fill-opacity", 1e-6).remove();
            }, k*200)
        }
    },
    //                       radius, number, distribution
    meteor: function (pos1, pos2, r, n, d, time, target){
        pos1 = addRandomNoise(pos1, 100);
        pos2 = addRandomNoise(pos2, 100);
        var xScale = d3.scaleLinear()
            .range([pos1.x, pos2.x]).domain([0, n])
        var yScale = d3.scalePow().exponent(Math.random()+0.5)
            .range([pos1.y, pos2.y]).domain([0, n])

        for (var k=0; k<n; k++){
            const mx = xScale(k);
            const my = yScale(k);
            target.append("svg:circle")
                .attr("fill-opacity", 0)
                .transition().delay(k * time / n)
                .attr("cx", mx).attr("cy", my)
                .attr("r", r)
                .style("fill", colors2(ci2)).style("fill-opacity", 0.8)
                .transition().duration(500).ease(d3.easePolyOut)
                    .attr("cx", mx+(Math.random()-0.5)*d)
                    .attr("cy", my+(Math.random()-0.5)*d)
                    .style("fill-opacity", 1e-6).remove()
        }
        ci2++;
    }
}

waitGameAnimate: null,
animation_waiting = {
    entry: function (){
        waitGameAnimate = setInterval(()=>{
            visual['hexagon'](0.5*winWidth, 0.5*winHeight, winWidth, winHeight, 6, 10, 200, 1, waiting_svg);
        }, 2000)

        $('#waiting-svg').fadeIn(2000)
        // Show waiting info
        waiting_svg
            .append("svg:circle")
            .attr("class", "waitGame")
            .attr("cx", winWidth/2)
            .attr("cy", winHeight/2)
            .attr("r", 100)
            .style("stroke", colors())
            .style("stroke",colors(ci)).style("fill", colors(ci)).style("stroke-opacity",0.6).style("fill-opacity",0.4)
        var game_msg = waiting_svg.append("svg:text")
            .attr("class", "waitGame")
            .attr("x", winWidth/2)
            .attr("y", winHeight/2)
            .attr("fill", "#F05454")
            .style("font-size", "48px")
            .style("text-anchor", "middle")
        game_msg.append("tspan")
            .attr("x", winWidth/2)
            .attr("dy", "-0.2em")
            .text("Game")
        game_msg.append("tspan")
            .attr("x", winWidth/2)
            .style("font-size", "32px")
            .attr("dy", "1.5em")
            .text("Not Started")
    },
    exit: ()=>{
        // Clear wait game animation
        clearInterval(waitGameAnimate);
        waiting_svg.selectAll(".waitGame")
            .transition().duration(500).ease(Math.sqrt)
            .attr("y", -100)
            .attr("cy", -100)
            .style("fill-opacity", 1e-6).remove()
        setTimeout(()=>{
            $('#waiting-svg')
                .fadeOut(2000)
        }, 2000)
    }
}

animation_attacking = {
    explosion: function(target, pos1, pos2){
        visual['hexagon'](pos1.x, pos1.y, 10, 10, 6, 10, 100, 0.5, target);
        visual['balls'](pos1, pos2, 10, 6, 1, target);
    },
    meteor: function(target, pos1, pos2){
        visual['meteor'](pos1, pos2, 5, 100, 200, 200, target);
    }
}

animation_team_config = {
    rootNode: null,
    update: function (teamConfig){
        packLayout = d3.pack()
            .size([winWidth * 0.8, 
                   getDivHeight('body')-getDivHeight('#navTab')])
            .padding(d=>{return d.data.name=="parent"?100:10})
        rootNode = d3.hierarchy(teamConfig)
        console.log(rootNode)
        rootNode.sum(d=>{return d.rad?d.rad:1})

        packLayout(rootNode);

        g = svg.selectAll("#g_team_config")
            .data(rootNode.descendants())

        g.exit().remove()

        nodes = g.enter()
            .append('g')
            .attr('id', "g_team_config")
            .attr('transform', d=>{return `translate(${[d.x, d.y]})`})
        nodes.append('circle')
            .attr('r', (d)=>{return d.r;})
            .style('fill', (d)=>d.data.color)
            .attr('fill-opacity', d=>d.data.name=="parent"?0:0.25)
        nodes.append('text')
            .text(d=>{return d.data.name=="parent"?"":d.data.name})
            .style("text-anchor", "middle")
            //.attr('x', d=>{return d.x})
            //.attr('y', d=>{return d.y})
            .attr('font-size', d=>{return d.children?"2.5em":"0.7em"})
            .attr('fill', d=>{return d.children?"#E8E8E8":"#F05454"})
            .attr('dy', d=>{return d.children?-50:0})
    },
    findTeam: (teamName)=>{
        position = null;
        rootNode.children.forEach((node)=>{
            if (node.data.name == teamName){
                position = {
                    'x': node.x,
                    'y': node.y
                }
            }
        })
        return position;
    },
    force_remove: ()=>{
        svg.selectAll("#g_team_config")
            .remove()
    }
}

animation_score_table = {
    /*  {
     *      TeamName:　TeamName,
     *      Scores: [
     *          {Name: "Score name", Value: "Score value"} ,
     *          {...}
     *      ]
     */

    update: function (scoreTableDiv, data){
        scoreDiv = scoreTableDiv.selectAll("div").data(data)

        const scoreDivEnter = scoreDiv.enter()
            .append('div')
            .attr('id', d=>`score-div-${ d.TeamName }`)
            .attr('class', 'card card-body')

        scoreDiv.exit().remove()

        scoreDivEnter.append('h5').text(d=>d.TeamName)
            .attr('class', 'card-title mx-auto')

        const tableEnter = scoreDivEnter.append('table')
            .attr('id', d=>`score-table-${ d.TeamName }`)
            .attr('class', 'table')

        tableEnter.append('thead')
            .append('tr')
                .selectAll('th')
                .data(['Rule Name', 'Score'])
            .enter().append('th')
                .text(d=>d)

        tableEnter.append('tbody')

        const tr = scoreDiv.select('table').select('tbody').selectAll('tr')
            .data(d => d.Scores)

        tr.exit().remove()

        tr.enter().append('tr')

        const td = tr.selectAll('td')
            .data(d => d3.values(d))

        td.enter().append('td')
        td.text(d => d)
    },
    force_remove: function(scoreTableDiv){
        scoreTableDiv.selectAll('div').remove()
    }
}
