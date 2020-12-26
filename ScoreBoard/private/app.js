var teamConfig = null;

$(document).ready(function(){
    function renderTeamConfigs(container_id, data){
        $(container_id).find("#div-team-config-container").remove();
        var block = $("<table id='div-team-config-container' class='config'></table>")
            .append($("<tr><th>Team Name</th><th>Type</th><th>IP address</th></tr>"))
        data.forEach((d)=>{
            if(d.length >= 2){
                var tr = $("<tr></tr>")
                    .append($("<td></td>").text(d[0]))
                    .append($("<td></td>").text(d[1]))
                    .append($("<td></td>").text(d[2]))
            block.append(tr)
            }
        })
        $(container_id).append(block)
    }

    function csvToJson(data){
        if (data[0].length < 3){
            alert("CSV format error!");
            teamConfig = null;
        }
        json = {
            "Teams": {},
            "VuluVMs": {}
        };
        data.forEach(d=>{
            if ( d[1] == "Normal"){
                if ( !json.Teams[d[0]] )
                    json.Teams[d[0]] = {"IP": [d[2]]};
                else
                    json.Teams[d[0]].IP.push(d[2]);
            }
            else if( d[1] == "Castle"){
                if ( !json.VuluVMs[d[0]] )
                    json.VuluVMs[d[0]] = d[2];
                else
                    // however, the castle ip should be one-one matched
                    json.VuluVMs[d[0]] = d[2];
            }
        })
        return json;
    }

    $("#team-csv-uploader").change(function(event){
        if( event.target.files.length > 0){
            const file = event.target.files[0];
            if(file.type == "application/vnd.ms-excel"){
                const reader = new FileReader();
                reader.onload = function(e){
                    var content = e.target.result;
                    console.log(content)
                    Papa.parse(content, {
                        complete: function(result, file){
                            console.log(result)
                            renderTeamConfigs("#teamConfigCard", result.data);
                            teamConfig = csvToJson(result.data)
                            console.log(teamConfig)
                        }
                    });
                }
                reader.readAsText(file)
            }
            else
                alert("File format not support!")
        }
        $("#team-csv-uploader").val(null);
    })

    $("#btn-team-csv-upload").click((event)=>{
        if (teamConfig != null){
            $.get({
                url: "/admin/change_team_config",
                data: teamConfig,
                dataType: "json",
                success: (data)=>{
                    console.log(data)
                    if (data == "ok")
                        alert("Upload successfully")
                }
            }) 
        }
        else
            alert("Please upload the CSV file first!");
    })
    $("#btn-change-game-status").click((event)=>{
        event.preventDefault();
        $.get({
            url: "/admin/change_game_status",
            data: $("#form-game-status").serialize(),
            success: (data)=>alert(data)
        })
    })
})
