/**
 * This simple Alex skill will pull your stats from Strava and pipe it through
 * your Echo. This is a Lambda function running in AWS
 *
 */

/**
 * App ID for the skill
 */
var APP_ID = "amzn1.ask.skill.caebba4e-007e-447c-9df2-7626a5088466"; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var https = require('https');
var url = require('url');

var needsLinking = "You must have a Strava account to use this skill. Please use the Alexa app to link your Amazon account with your Strava Account.";

/**
 * StravaStatsSkill is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var StravaStatsSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
StravaStatsSkill.prototype = Object.create(AlexaSkill.prototype);
StravaStatsSkill.prototype.constructor = StravaStatsSkill;

StravaStatsSkill.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session) {
    console.log("StravaStatsSkill onSessionStarted requestId: " + sessionStartedRequest.requestId +
        ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

StravaStatsSkill.prototype.eventHandlers.onLaunch = function(launchRequest, session, response) {
    console.log("StravaStatsSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId + ", accessToken: " + session.user.accessToken);
    var speechOutput = "Welcome to Mother Goose for Nest. I can help you control one or more Nest thermostats. Try asking Status, or Set Upstairs to 65. How can I help you?";
    var repromptText = "Welcome to Mother Goose for Nest. I can help you control one or more Nest thermostats. Try asking Status, or Set Upstairs to 65. How can I help you?";
    response.ask(speechOutput, repromptText);
};

StravaStatsSkill.prototype.eventHandlers.onSessionEnded = function(sessionEndedRequest, session) {
    console.log("StravaStatsSkill onSessionEnded requestId: " + sessionEndedRequest.requestId +
        ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

StravaStatsSkill.prototype.intentHandlers = {
    // register custom intent handlers
    "StatusIntent": function(intent, session, response) {
        console.log('in StatusIntent')
        if (!session.user.accessToken) {
            response.tellWithLinkAccount(needsLinking);
        } else {
            getStatsFromStrava(session.user.accessToken, function(err, data) {
                session.attributes.stravaAtheleteId = data.id;
                session.attributes.straveAtheleteFullname = data.firstname + " " + data.lastname;
                var speechOutput = "Hello " + session.attributes.straveAtheleteFullname + ". Your strava athelete ID is " + session.attributes.stravaAtheleteId;
                response.tellWithCard(speechOutput, "Get Strava Stats", speechOutput);
            }, function() {
                response.tellWithLinkAccount(needsLinking);
            });
        }

    },
    "AMAZON.HelpIntent": function(intent, session, response) {
        response.ask("I am Mother Goose for Nest. I can help you control one or more Nest thermostats. Try asking Status to get the current temperature and set temperature for each thermostat, or Set thermostat name to temperature. For example, set Downstairs to 55. How can I help you?", "I am Mother Goose for Nest. I can help you control one or more Nest thermostats. Try asking Status to get the current temperature and set temperature for each thermostat, or Set thermostat name to temperature. For example, set Downstairs to 55. How can I help you?");
    },
    "AMAZON.StopIntent": function(intent, session, response) {
        var speechOutput = {
            speech: "Goodbye",
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function(intent, session, response) {
        var speechOutput = {
            speech: "Goodbye",
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    }
};

function getStatsFromStrava(accessToken, eventCallback) {
    console.log('in getStatsFromStrava')
    var options = {
        hostname: 'www.strava.com',
        port: 443,
        path: '/api/v3/athlete',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    };

    var req = https.request(options, function(res) {
        console.log('in https.request');
        var responeString = '';
        // console.log('Status Code: ' + res.statusCode);
        //
        // if (res.statusCode != 200) {
        //     eventCallback(new Error("Non 200 Response"));
        // }

        res.on('data', function(data) {
            responeString += data;
        });

        res.on('end', function() {
            var responseObject = JSON.parse(responeString);

            if (responseObject.error) {
                console.log("Strava error: " + noaaResponseObj.error.message);
                eventCallback(new Error(responseObject.error.message));
            } else {
                eventCallback(null, responseObject);
            }
        });
    }).on('error', function(e) {
        console.log("Communications error: " + e.message);
        eventCallback(new Error(e.message));
    });

    req.end();

    // doRequest(options, eventCallback, 0, null, onUnAuthCallback);


}

// Create the handler that responds to the Alexa Request.
exports.handler = function(event, context) {
    // Create an instance of the StravaStatsSkill skill.
    var stravaStatsSkill = new StravaStatsSkill();
    stravaStatsSkill.execute(event, context);
};
