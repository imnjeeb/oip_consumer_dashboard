
/**
 * Created by R10253 on 3/17/2017.
 */
'use strict';

module.exports = function (app) {
    /** mqtt */
    const mqtt = require("mqtt");
    const client = mqtt.connect("mqtt://"+app.mqtt.serverUrl);
    const topic = app.mqtt.topic;

    /** websocket */
    const WebSocket = require('ws');
    const wsPath = "/ws/parking/bays";
    const wss = new WebSocket.Server({
        perMessageDeflate: false,
        port: 2222,
        path: wsPath
    });

    wss.on("connection", function(ws) {
        console.info("websocket connection open");
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify([{
                msg: 'Connection Open'
            }]));

            console.log('connected? %s',client.connected);
            if (!client.connected) {
                console.log('reconnecting');
                //client.reconnecting = true;
            }
        }

        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
        });

        ws.on('close', function () {
            console.log('stopping client interval');
            //client.end();
        });
    });

    // Broadcast to all.
    wss.broadcast = function broadcast(data) {
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    };

    client.on('connect', function() {
        client.subscribe(topic);
        console.log('started! subscribe to %s at %s', topic, new Date());
    });
    client.on('reconnect', function() {
        client.subscribe(topic);
        console.log('restarted! subscribe to %s at %s', topic, new Date());
    });
    client.on('close', function() {
        client.unsubscribe(topic);
        console.log('restarted! subscribe to %s at %s', topic, new Date());
    });
    client.on('message', function (topic, message) {
        // message is Buffer
        console.log("receive: %s",message.toString());

        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
        //client.end()
    });

    /**
     * @return {boolean}
     */
    function IsJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }
};