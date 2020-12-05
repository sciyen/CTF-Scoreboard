visual = {
    hexagon: function(mx, my, h, w, n, timeScale, target){
        var rotation = 0;
        for (var k=0; k<n; k++){
            target.append("svg:circle")
                .attr("transform", "rotate("+rotation+","+mx+","+my+")")
                .attr("cx", mx)
                .attr("cy", my)
                .attr("r", 10)
                .style("stroke", colors())
                .style("stroke",colors(++ci)).style("fill", colors(++ci)).style("stroke-opacity",0.6).style("fill-opacity",0.4)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx + 200).attr("cy", my + 200)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx - 200)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx - 200).attr("cy", my - 200)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cy",my - 200).attr("cx", mx + 200)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",mx + 200).attr("cy", my + 200)
                .transition().duration(timeScale*500).ease(Math.sqrt).attr("cx",my+200).attr("cy", my - 200)
                .style("stroke-opacity",1e-6).style("fill-opacity", 1e-6).remove();
            rotation+=(360/n);
        }
    }
}

animation_waiting = {
    waitGameAnimate: null,
    entry: ()=>{
        this.waitGameAnimate = setInterval(()=>{
            visual['hexagon'](0.5*winWidth, 0.5*winHeight, winWidth, winHeight, 6, 1, waiting_svg);
        }, 2000)

        $('#waiting-svg').removeClass('hide')
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
            .transition().duration(500).ease("exp")
            .attr("y", -100)
            .attr("cy", -100)
            .style("fill-opacity", 1e-6).remove()
        setTimeout(()=>{
            $('#waiting-svg')
                .fadeOut()
                .delay(500)
                .addClass('hide')
        }, 2000)
    }
}

animation_team_config = {
    entry: (teamConfig)=>{
        var rootNode = d3.hierarchy(teamConfig)
        console.log(rootNode)
        rootNode.sum(d=>{return d.rad?d.rad:1})
        console.log("update")

        packLayout(rootNode);
        var g = svg.selectAll("g_team_config")
            .data(rootNode.descendants())
        nodes = g.enter()
            .append('g')
            .attr('id', "g_team_config")
            .attr('transform', d=>{return `translate(${[d.x, d.y]})`})
        nodes.append('circle')
            .attr('r', (d)=>{return d.r;})
            .style('fill', (d)=>d.children?"#558899":"#443322")
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
    exit: ()=>{
        svg.selectAll("g_team_config")
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

    update: (scoreTableDiv, data)=>{
        scoreDiv = scoreTableDiv.selectAll("div").data(data)

        const scoreDivEnter = scoreDiv.enter()
            .append('div')
            .attr('id', d=>`score-div-${ d.TeamName }`)
            .attr('class', 'card card-body')

        scoreDiv.exit().remove()

        scoreDivEnter.append('h5').text(d=>{d.TeamName})
            .attr('class', 'card-title mx-auto')

        scoreDivEnter.selectAll('h5').text(d => d.TeamName)

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
    }
}
