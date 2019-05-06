/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const dbHelper = require('./helpers/dbHelper');
const GENERAL_REPROMPT = "What would you like to do?";
const dynamoDBTableName = "vocatus-names";
const dynamoDBSongTable = "vocatus-songs";
var playerScore = {};
async function getRandomQuestion(handlerInput)
{
  var speechText = ""
  const { requestEnvelope, attributesManager } = handlerInput;
  const sessionAttributes = attributesManager.getSessionAttributes();
  var questionId = Math.floor(Math.random() * 10) + 1;
  return dbHelper.getQuestions(questionId)
      .then((data) => {
        var question = data.map(e => e.text)
        speechText += data[0].text;
        speechText += " " + data[0].options;
        Object.assign(sessionAttributes, {
        correctAnswer: data[0].correctAnswer,
        jugadores: jugadores,
      });
        return speechText;
    }
  )
}
async function getRandomSongQuestion(handlerInput)
{
  var speechText = ""
  const { requestEnvelope, attributesManager } = handlerInput;
  const sessionAttributes = attributesManager.getSessionAttributes();
  var songId = Math.floor(Math.random() * 10) + 1;
  return dbHelper.getSongQuestions(songId)
      .then((data) => {
        var question = data.map(e => e.text)
        // speechText += data[0].text;
        speechText += `Escucha la siguiente canción: <break time="1s"/> <audio src="${data[0].url}" />`;
        speechText += `¿Cuál es el nombre de la canción?<break time="1s"/>${data[0].options}`
        speechText += " " + data[0].options;
        Object.assign(sessionAttributes, {
        correctAnswer: data[0].correctAnswer,
        jugadores: jugadores,
      });
        return speechText;
    }
  )
}

async function getRandomName(handlerInput, userID)
{
  var speechText = ""
  const { requestEnvelope, attributesManager } = handlerInput;
  const sessionAttributes = attributesManager.getSessionAttributes();
   return dbHelper.getNames(userID)
      .then((data) => {
        if (data.length == 0) {
          speechText = "Aún no has guardado ningún nombre"
        } else {
          var nameArray = data.map(e => e.playerName).join(",").split(",");
          speechText = nameArray[Math.floor(Math.random()*nameArray.length)];
        }
        return speechText
      })
}
async function getAllNames(handlerInput, userID)
{
  var names = "";
  return dbHelper.getNames(userID)
      .then((data) => {
          names += data.map(e => e.playerName).join(", ")
        return names
      })
}
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const speechText = 'Hola, soy Vocatus, tu skill específica para las pedas y poner el ambiente, puedes empezar preguntándome ¿Cómo se juega?';
    const repromptText = 'Dime un nombre';
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    console.log(typeof getAllNames(handlerInput, userID));
    var names =(await (getAllNames(handlerInput, userID)) + "").split(",");
    var aux = "";
    for(var x = 0; x < names.length; x++)
    {
      var name = names[x];
      playerScore[""+name] = 0;
    }
    const { requestEnvelope, attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    Object.assign(sessionAttributes, {
        score : playerScore
    });
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
};
const StartTriviaIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'StartTrivia';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var names = await getAllNames(handlerInput, userID);
    var speechText = "Prepárense " + names + " para un juego en el que se les harán varias\
    preguntas y ustedes deberán contestar tan bien como puedan para evitar salir en coma etílico";
    var response = responseBuilder
      .speak(speechText)
      .getResponse();
    response.shouldEndSession = false;
    return response;
  }
};
const SaveNameIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SaveName';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const name = slots.Name.value;
    console.log("NAMES:" + slots.Name);
    console.log("NAME VALUES: " + slots.Name.value);
    console.log("SLOTS:" + slots);
    return dbHelper.addName(name, userID)
      .then((data) => {
        const speechText = `Acabas de añadir a ${name}.`;
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        console.log("Error occured while saving movie", err);
        const speechText = "Error de base de datos, no se guardó el nombre"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  },
};

const TellNameIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'TellName';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    return dbHelper.getNames(userID)
      .then((data) => {
        var speechText = "Los nombres que has guardado son "
        if (data.length == 0) {
          speechText = "Aún no has guardado ningún nombre"
        } else {
          speechText += data.map(e => e.playerName).join(", ")
        }
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        const speechText = "Error al acceder a los nombres en la base de datos"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  }
}
const HandleGuessIntentHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'HandleGuess';
  },
  async handle(handlerInput) {
    var correctAnswer = "";
    const { responseBuilder } = handlerInput;
    var speechText = "";
    try{
    const { requestEnvelope, attributesManager } = handlerInput;

    const request = handlerInput.requestEnvelope.request;
    let guess = request.intent.slots.Answer.value;
    const sessionAttributes = attributesManager.getSessionAttributes();
    correctAnswer = sessionAttributes['correctAnswer'];
      if(guess.includes(correctAnswer.toLowerCase()))//Respuesta correcta
      {

        speechText = `<speak>¿${guess}?, La respuesta es...<break time="1s"/><audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_02'/>¡Correcta!<audio src="soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_03"/></speak>`;
      }else{
        var seconds = Math.floor(Math.random()*15) + 2;
        var alcohols = ["cerveza","vodka","tequila","una cubita", "nesquick por la nariz", "tonayan", "besar al de al lado", "darle de tomar al de al lado", "fourloko", "kosaco", "aguas locas", "la bebida del de al lado", "el vaso más lleno", "alcohol con mayor grado","lamerle el pie al más chaparro", "quitarte la playera","gemir","yakult"];
        var drink = alcohols[Math.floor(Math.random()*alcohols.length)];
        speechText = `<speak>¿${guess}?, La respuesta es...<break time="1s"/><audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01'/>¡Incorrecta!<audio src='soundbank://soundlibrary/human/amzn_sfx_crowd_boo_03'/>${seconds} segundos de ${drink}</speak>`;
      }
    }
    catch(err)
    {
      console.log("ERROR AYUDA RESPUESTAS AHH : " + err);
    }
        var response = responseBuilder
          .speak(speechText)
          .getResponse();
        response.shouldEndSession = false;
        return response;
    }
}
const AddPointIntentHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AddPoint';
  },
  async handle(handlerInput) {
    const { responseBuilder } = handlerInput;
    var speechText = "";
    const { requestEnvelope, attributesManager } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var allNames = "";
    const request = handlerInput.requestEnvelope.request;
    return dbHelper.getNames(userID)
      .then((data) => {
        if (data.length == 0) {
          speechText = "Aún no has guardado a ningún jugador"
        } else {
          allNames = data.map(e => e.playerName).join(", ");
        }
        let playerName = request.intent.slots.player.value
        if(allNames.toLowerCase().includes(playerName.toLowerCase()))
        {
          const { requestEnvelope, attributesManager } = handlerInput;
          const sessionAttributes = attributesManager.getSessionAttributes();
          var playerScores = sessionAttributes['score'];
          playerScores[playerName] = playerScores[playerName] + 1;
          Object.assign(sessionAttributes, {
              score : playerScores
          });
          speechText = "Punto para " + playerName + " ahora lleva " + sessionAttributes['score'][playerName] + " puntos";
        }else{
          var response = responseBuilder
          .speak("No tengo registrado a ningún " + playerName)
          .getResponse();
          response.shouldEndSession = false;
          return response;
        }
        var response = responseBuilder
          .speak(speechText)
          .getResponse();
        response.shouldEndSession = false;
        return response;
      })
      .catch((err) => {
        console.log(err);
        speechText = "Error al acceder a los nombres en la base de datos"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
    }
}
const GetQuestionIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetQuestion';
  },
  async handle(handlerInput) {
    var choice = Math.floor(Math.random() * 3);
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var playerName = await getRandomName(handlerInput, userID);
    if(choice == 0 || choice == 1)
    {
      const { requestEnvelope, attributesManager } = handlerInput;
      const sessionAttributes = attributesManager.getSessionAttributes();
      switch (choice) {
        case 0:
          var questionText = await getRandomQuestion(handlerInput);
          break;
        case 1:
          var questionText = await getRandomSongQuestion(handlerInput);
          break;

      }
      var speechText = playerName + ", " + questionText;
      var response = responseBuilder
        .speak(speechText)
        .getResponse();
      response.shouldEndSession = false;
      return response;
    }
    else{
      var themes = ["acuarios","pintura","canotaje","música clasica","dietas","mascotas"];
      var speechText = "<speak>" + playerName + ", tienes 5 segundos para decir 5 cosas relacionadas con el tema de " + themes[Math.floor(Math.random()*themes.length)] + " empezando ahora ";
      for(var x = 1; x <= 4; x++){
        speechText+="<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_player1_01'/><break time='1s'/>";
      }
      speechText+="<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_player1_01'/>";
      speechText += "¡Se acabó el tiempo!</speak>";
      var response = responseBuilder
        .speak(speechText)
        .getResponse();
      response.shouldEndSession = false;
      return response;
    }
  }
}
const RemoveNameIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RemoveName';
  },
  handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const name = slots.Name.value;
    return dbHelper.removeName(name, userID)
      .then((data) => {
        const speechText = `Has borrado a ${name} del juego, qué mala onda`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        console.log(err);
        const speechText = `No hay ningún jugador llamado ${name} actualmente`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can introduce yourself by telling me your name';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    SaveNameIntentHandler,
    TellNameIntentHandler,
    GetQuestionIntentHandler,
    StartTriviaIntentHandler,
    HandleGuessIntentHandler,
    RemoveNameIntentHandler,
    AddPointIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName(dynamoDBTableName)
  .withAutoCreateTable(true)
  .withTableName('vocatus-questions')
  .withAutoCreateTable(true)
  .lambda();
