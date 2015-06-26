// You need to change two things in this file. 
// Hydna-domain : Search for "hydna.net" should be rf1.hydna.net / rf2.hydna.net / rf3.hydna.net
// Several Imp agent urls : Search for "agent.electricimp.com"

$(document).ready(function(){
	
  	var output = $('#output');
	var avatarcontainer = $('#avatars');

    var my_client_id;
    var imp_device_online;

    var delayClosingValue; // To handle how long time until we should close the connection. 
    var delayUntilClosing = 120;  // Seconds. How long time to keep the user online after login / activity

  	$(".colorvalue").attr("size","4");

  	$('#picker').colpick({
		flat:true,
		colorScheme:'dark',
		layout:'hex',
		submit:1,
		onChange:function(hsb,hex,rgb,el,bySetColor) {
			
			$("#color_r").val(rgb.r);
			$("#color_g").val(rgb.g);
			$("#color_b").val(rgb.b);
			
		},
		onSubmit:function(hsb,hex,rgb,el) {
            // When someone clicks ok on the color picker. 

            // Set color of the avatar of me 
			$("#mycolor").css("background-color","#"+hex);
            // Set the color value in the three (hidden) text fields
			$("#color_r").val(rgb.r);
			$("#color_g").val(rgb.g);
			$("#color_b").val(rgb.b);
            // Tell everybody and the imp the color if connection to Hydna is good
            if(channel.readyState == HydnaChannel.OPEN)
            {
                colortotheimp();
            } else {
                output.empty();
                output.append($('<div/>', { text: 'Sorry - You are not connected and cannot change colors' }));
            }
		}
	});

    output.append($('<div/>', { text: 'Connecting ...' }));

    // This is where we set the channel to talk on
    var channel = new HydnaChannel('colorpicker.hydna.net/colors', 'rwe');

    // We should have an error -handling thing to give people a message that > 30 people online. 
    channel.onopen = function(event) {
        impReportStatus();
       // impReportColor();
        output.append($('<div/>', { text: 'Connected!' }));

        output.hide(1500);
        // Disconnect the user after some time
        delayClosingValue = delayUntilClosing;
        disconnectAfterDelay();

        // We had a successful connection to Hydna
        // Parse the message to receive status
         var packet;
        try {
            packet = JSON.parse(event.data);
        } catch (e) {
            console.log("Unable to parse data.");
            return;
        }
        
        // Save my_client_id somewhere. 
        my_client_id = packet.client_id;
        // Create an icon for me
        var client_id = my_client_id;
        var structure = [
            '<div class="avatar myavatar" id="' + client_id +'">',
                '<img src="avatar.png" />',
            '</div>'
        ];
        // Create and avatar for me
        $(structure.join('')).appendTo(avatarcontainer);

        // Loop through the clients_online and create avatars        
        var i;
        for (i = 0; i < packet.all_clients.length; ++i) {
            // do something with `substr[i]`
            var client_data = packet.all_clients[i];
            var client_id = client_data.client_id;

            // We don't want to create another for ourselves
            if (client_id != my_client_id){
	            var structure = [
	                '<div class="avatar" id="' + client_id +'">',
	                    '<img src="avatar.png" />',
	                '</div>'
	            ];

	            $(structure.join('')).appendTo(avatarcontainer);      

                // Set background color of the avatar we created  
                // Set the background color of the user who sent the color
                var rgbstr = "rgb(" + client_data.last_selected_color.r + ", " + client_data.last_selected_color.g + "," + client_data.last_selected_color.b + ")";
                $( "#"+client_id ).css("background-color", rgbstr);    	
            }
        }

    
        // Set the color of the ship to whatever it is right now
            console.log(packet.current_ship_color);
           var rgbstr = "rgb(" + packet.current_ship_color.r + ", " + packet.current_ship_color.g + "," + packet.current_ship_color.b + ")";
            $("#shipcolor").css("background-color",rgbstr);
        

    };
    channel.onclose = function(event) {
        output.show(100);
        // If the reason for closing is, that the channel was full, tell that to the user.
        var text;
        //output.empty();
        if(event.reason.indexOf("Max") >= 0) {
            text = "Sorry, you cannot get in. We are full - Try again in a bit.";
        } else {
            text = "Channel closed " + event.reason;
        } 
        output.append($('<div/>', { text: text }));

        // A little dance to handle if the connection to hydna is lost
        // We probably don't really want this one in the Roskilde version
        /*
        reloadcount = getParameterByNameAsInt("reloadcount");
        reloadcount = reloadcount+1;
        // We reload immediately if we havn't done this for 5 times.
        var delay = 1000;
        if (reloadcount > 5) {
            // If we have reloaded >5 times, we wait for a couple of minutes and try again            
            delay = 300000;
            reloadcount = 0; // reset the reload counter. 
            
            var text = "Channel closed - Will attempt to reopen in 5 minutes";
            output.append($('<div/>', { text: text }));
        }
        setTimeout(function() {
            location.replace(location.protocol +"//"+ location.hostname + location.pathname+"?reloadcount="+reloadcount);
        }, delay);
        */

    };
    channel.onsignal = function(event) {
        
        var packet;
        try {
            packet = JSON.parse(event.data);
        } catch (e) {
            console.log("Unable to parse data.");
            return;
        }
        if (packet.action == 'set_color') {
            // Someone sent a color
            var client_id = packet.client_id;
            //console.log(packet.color);
            // Set the background color of the user who sent the color
            var rgbstr = "rgb(" + packet.color.r + ", " + packet.color.g + "," + packet.color.b + ")";
            $( "#"+client_id ).css("background-color", rgbstr);

            // If the imp is offline, we just set the color of the ship too
            if (imp_device_online == "false") {
                $("#shipcolor").css("background-color",rgbstr);
            }

        } else if (packet.action == 'status_new_client') {
            // Create a new avatar, with the newcomers id
            var client_id = packet.client_id;
            var structure = [
                '<div class="avatar" id="' + client_id +'">',
                    '<img src="avatar.png" />',
                '</div>'
            ];

            $(structure.join('')).appendTo(avatarcontainer);
            
        } else if (packet.action == 'status_client_left') {
            // Destroy the avatar with the id
            var client_id = packet.client_id;
            $( "#"+client_id ).remove();
            
        } else {
            // ignore other commands for now
        }

    };
    channel.onmessage = function(event) {
        // This is a to handle the imp agent - Couldn't get it to send signals
        var packet;
        try {
            packet = JSON.parse(event.data);
        } catch (e) {
            console.log("Unable to parse data.");
            return;
        }
        

        if (packet.action == 'color_from_the_imp') {
            // The ship sent a color
                  
	        var hex = $.colpick.rgbToHex(packet);

	        $("#shipcolor").css("background-color","#"+hex);

        } else if (packet.action == 'status_from_the_imp') {
            // The ship sent status message
            imp_device_online = packet.device_online;
            
            // We might want to take an action to show the imp went offline/online
            if (imp_device_online == "false"){
                output.empty();
                output.append($('<div/>', { text: 'The color controller is currently offline, but you can still battle for colors with anyone online' }));

                output.show(1500);
            } else if (imp_device_online == "true"){
                output.empty();
                
                output.hide(1500);
            }
        } else {
            // ignore other commands for now
        }

    };


    function disconnectAfterDelay() {
        // We count down in seconds until 0 and the disconnect
        var delay = 1000;

        // If we are at 0, disconnect - close channel
        if(delayClosingValue < 1) {
            channel.close('Time is up');
            output.show(100);
            output.empty();
            var text = "Your time is up! - Reload to try again";
            output.append($('<div/>', { text: text }));

        } else {
            //console.log(delayClosingValue);
            delayClosingValue = delayClosingValue - 1; 
            setTimeout(function() {
                disconnectAfterDelay();
            }, delay);           
        }
        
    }

   function colortotheimp() {
		// Get the colors from the input fields
		// Later on we replace this with the color picker
		var r = $("#color_r").val();
		var g = $("#color_g").val();
		var b = $("#color_b").val();

        // Reset the delay timer - to keep active users online
        delayClosingValue = delayUntilClosing;

		// Perform ajax post to the imp 
		// We do it async, and we don't use the reply, because we get the reply the other way around via Hydna (websocket)
		var colors = [
		{"r":r, "g":g, "b":b}
		];
		var color = {r:r, g:g, b:b};
		// Send a Hydna - message with the color and my client_id so everybody knows 
		var hex = $.colpick.rgbToHex(color);
		
		var messagePacket = JSON.stringify({
            action: 'set_color',
            color: color,
            client_id: my_client_id
        });        
        try {
            channel.emit(messagePacket);
            
        } catch (e) {
            console.log("Cannot send messages while disconnected.");
        }

		// Set the agent-url to the agent-url of the imp
		$.ajax({
			url: 'https://agent.electricimp.com/' + agent,
			type: 'POST',
			data: JSON.stringify(colors),
			contentType: 'application/json; charset=utf-8',
			dataType: 'json',
			success: function(msg) {
			    //$("#output").html(msg);
			},
            error: function (request, status, error) {
                // This should never happen, since we should already have established that the imp is offline. 
                // Nevertheless, set imp_device_online to false, to prevent further attempts
                imp_device_online = false;
            }
		});
  
	}

    function impReportStatus(){
        // Call the imp and ask for a status
        $.ajax({
            url: 'https://agent.electricimp.com/' + agent + '?report_imp_status=true',
            type: 'POST',
            data: 'report_imp_status',
            contentType: 'text/plain; charset=utf-8',
            dataType: 'text',
            success: function(msg) {
                //console.log(msg);
            },
            error: function (request, status, error) {
                // This should never happen, since we should already have established that the imp is offline. 
                // Nevertheless, set imp_device_online to false, to prevent further attempts
                imp_device_online = false;
            }
        });
    }
	function impReportColor() {

        // Don't ask for a color from the imp, if it is offline
        if (imp_device_online != "false") {
    		// Call the imp and tell it to repport last color
    		$.ajax({
    			url: 'https://agent.electricimp.com/' + agent + '?reportcolor=true',
    			type: 'POST',
    			data: 'reportcolor',
    			contentType: 'text/plain; charset=utf-8',
    			dataType: 'text',
    			success: function(msg) {
    			    //$("#output").html(msg);
    			},
                error: function (request, status, error) {
                    // This should never happen, since we should already have established that the imp is offline. 
                    // Nevertheless, set imp_device_online to false, to prevent further attempts
                    imp_device_online = false;
                }
    		});
        }
	}
});

function escapeHTML(value) {
    var entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;"
    };

    function escapeCharacter(c) {
        return entities[c];
    }

    return String(value).replace(/[&<>]/g, escapeCharacter);
}

function getParameterByNameAsInt(name) {
    var p = parseInt(getParameterByName(name));
    if(isNaN(p)) 
        return 0;
    else 
        return p;
}
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}