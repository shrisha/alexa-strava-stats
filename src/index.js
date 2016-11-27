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

var defaultOptions = {
  hostname: 'www.strava.com',
  port: 443,
  method: 'GET'
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
  var speechOutput = "Welcome to Strava Stats. How can I help you?";
  var repromptText = speechOutput;
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
      getAthlete(session, function(body){
        var data = JSON.parse(body);
        getStats(session,data.id,function(body){
          var data = JSON.parse(body);
          // var speechOutput = "Hello " + session.attributes.straveAtheleteFullname + ". Your strava athelete ID is " + session.attributes.stravaAtheleteId;
          var speechOutput = "You've run "+data.all_run_totals.distance+" miles.";
          response.tellWithCard(speechOutput, "Get Strava Stats", speechOutput);
        }, function() {
          response.tellWithLinkAccount(needsLinking);
        });
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

function getAthlete(session, eventCallback, onUnAuthCallback) {
  var options = JSON.parse(JSON.stringify(defaultOptions));
  options.headers = {'Authorization': 'Bearer ' + session.user.accessToken};
  options.path =  '/api/v3/athlete';
  doRequest(options, eventCallback, 0, null, onUnAuthCallback);
}

function getStats(session, athleteId, eventCallback, onUnAuthCallback) {
  var options = JSON.parse(JSON.stringify(defaultOptions));
  options.headers = {'Authorization': 'Bearer ' + session.user.accessToken};
  options.path =  '/api/v3/athletes/'+athleteId+"/stats";
  doRequest(options, eventCallback, 0, null, onUnAuthCallback);
}

function doRequest(options, eventCallback, requestNo, data, onUnAuthCallback) {
  console.log("calling ", options.path);
  if(requestNo > 5) {
    console.log("too many redirects");
    return;
  }

  var req = https.request(options, function(res) {
    var body = '';
    var redirect = false;
    console.log("statusCode: ", res.statusCode);
    console.log("headers: ", res.headers);


    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers && res.headers.location) {
      var location = res.headers.location;
      console.log('redirect', location);
      redirect = true;

      var redirectURI = url.parse(location);
      console.log('redirect URI', redirectURI);

      options.hostname = redirectURI.hostname;
      options.port = redirectURI.port;
      options.path = redirectURI.pathname;


      doRequest(options, eventCallback, requestNo + 1, data, onUnAuthCallback);
    } else if (res.statusCode === 401) {
      redirect = true;
      if(req._auth) {
        var authHeader = req._auth.onResponse(res);
        if (authHeader) {
          req.setHeader('authorization', authHeader);
          var location = res.headers.location;
          console.log('redirect', location);

          var redirectURI = new URI(location);
          console.log('redirect URI', redirectURI);
          options.hostname = redirectURI.hostname;
          options.port = redirectURI.port;
          options.path = redirectURI.pathname;

          doRequest(options, eventCallback, requestNo + 1, data, onUnAuthCallback);
        }
      } else {
        onUnAuthCallback();
      }
    }

    res.on('data', function(d) {
      body += d;
    });

    res.on('end', function () {
      if(body && !redirect) {
        eventCallback(body);
      } else {
        console.log('redirectng so not done');
      }
    });
  });
  if(data) {
    req.write(data);
  }
  req.end();

  req.on('error', function(e) {
    console.error(e);
  });
}

// Create the handler that responds to the Alexa Request.
exports.handler = function(event, context) {
  // Create an instance of the StravaStatsSkill skill.
  var stravaStatsSkill = new StravaStatsSkill();
  stravaStatsSkill.execute(event, context);
};
