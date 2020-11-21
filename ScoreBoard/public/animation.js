visual = {
    hexagon: function(mx, my, h, w, n, timeScale){
        var rotation = 0;
        for (var k=0; k<n; k++){
            svg.append("svg:circle")
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
            visual['hexagon'](0.5*winWidth, 0.5*winHeight, winWidth, winHeight, 6, 1);
        }, 2000)

        // Show waiting info
        svg.append("svg:circle")
            .attr("class", "waitGame")
            .attr("cx", winWidth/2)
            .attr("cy", winHeight/2)
            .attr("r", 100)
            .style("stroke", colors())
            .style("stroke",colors(ci)).style("fill", colors(ci)).style("stroke-opacity",0.6).style("fill-opacity",0.4)
        var game_msg = svg.append("svg:text")
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
        svg.selectAll(".waitGame")
            .transition().duration(500).ease("exp")
            .attr("y", -100)
            .attr("cy", -100)
            .style("fill-opacity", 1e-6).remove()
    }
}
