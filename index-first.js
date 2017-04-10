const {Wit, log} = require('node-wit');
const TelegramBot = require('node-telegram-bot-api');


const token = '276868419:AAEZAbFUy0dHkrEuC3_mPFtT_15niSf3nCA';
const wit_token = 'XN6S7TAFH4VHNIMAX4EGHNYZS3XJWEBQ';

const bot = new TelegramBot(token, {polling: true});

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};


const prova = (cb)=>{

  var waitTill = new Date(new Date().getTime() + 5 * 1000);
  while(waitTill > new Date()){}


}



const actions = {
  send(request, response) {
    const {sessionId, context, entities} = request;
    console.log('SessionId: '+sessionId);
    const {text, quickreplies} = response;

    bot.sendMessage(sessions[sessionId].chatId,text);

  },
  clear({sessionId,context,entities}){
      return new Promise(function(resolve, reject) {
      console.log('Executing clear');
      context={};
      context.done=true;

      return resolve(context);
      });
  },
  statoSistema({sessionId,context,entities}){
    return new Promise(function(resolve, reject) {
      console.log("statoSistema");
      var intento = firstEntityValue(entities, 'intent');
      if(intento == "stato_sistema"){
        context.is_stato_sistema = true;
        context.stato ='Ottimo';
      }else{
        delete context.is_stato_sistema;
        delete context.stato;
      }
      return resolve(context);
    });
  },
  getImportInfo({sessionId,context,entities}) {
    return new Promise(function(resolve, reject) {

    console.log('Executing getImportInfo');
    console.log('CONTEXT: ', JSON.stringify(context));

    var sistema = firstEntityValue(entities, 'sistema');
    var event_entity = firstEntityValue(entities, 'event_entity');
    var intento = firstEntityValue(entities, 'intent');
    if (context.intento != null){
      intento = context.intento;
    }

    if (context.sistema != null){
      sistema = context.sistema;
      delete context.missingSistema;
    }else{
      context.sistema = sistema;
      if(sistema == null){
        context.missingSistema=true;
        delete context.n_scarti;
      }
    }

    if(context.event_entity !=null){
      event_entity = context.event_entity;
      delete context.missingEvent;
    }else{
      context.event_entity = event_entity;
      if(event_entity==null){
        context.missingEvent =true;
        delete context.n_scarti;
      }
    }

    console.log('SISTEMA:' + sistema);
    console.log('event_entity:' + event_entity);

    if ( sistema && event_entity){
      console.log('Cerco su splunk');
      console.log('Welcome to My Console,');

      //Da sostituire con la ricerca su splunk
      setTimeout(function() {
          console.log('Blah blah blah blah extra-blah');
          context.n_scarti = '12345';
          delete context.missingSistema;
          delete context.missingEvent;

          return resolve(context);
      }, 3000);

      //---------------------
    }else{
      return resolve(context);
    }
  });
  },
};

const client = new Wit({accessToken:wit_token,actions});

const sessions = {};

const findOrCreateSession = (chatId) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].chatId === chatId) {
      console.log('Trovata la sessione');
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    console.log('Creo una nuova sessione');
    sessionId = new Date().toISOString();
    sessions[sessionId] = {chatId: chatId, context: {}};
  }
  return sessionId;
};


bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log('Ricevuto : ' + JSON.stringify(msg));

  const sessionId = findOrCreateSession(chatId);

  client.runActions(sessionId, msg.text, sessions[sessionId].context)
          .then((context) => {
            console.log("Current context : "+ JSON.stringify(context));
            console.log('Waiting for next user messages');
            sessions[sessionId].context = context;

            if (context.done) {
              context=null;
              console.log('Session delete');
              delete sessions[sessionId];
            }
          })
          .catch((err) => {
            console.error('Oops! Got an error from Wit: ', err.stack || err);
          })

});
