const TelegramBot = require('node-telegram-bot-api');
const Wit = require('node-wit').Wit;
const log = require('node-wit').log;
const mysplunk = require("./splunk.js");

const token = '262255785:AAHcQ8nS9u4ID4iEk9LJHLutFxG4i6yBgvw';


const sessions = {};

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

const findOrCreateSession = (chatId) => {
    let sessionId;
    Object.keys(sessions).forEach(k => {
        if (sessions[k].chatId === chatId) {
            console.log('Old session');
            sessionId = k;
        }
    });
    if (!sessionId) {
        console.log('New session');
        sessionId = new Date().toISOString();
        sessions[sessionId] = {
            chatId: chatId,
            context: {}
        };
    }
    return sessionId;
};


const actions = {
    send({sessionId}, {text}) {
      const recipientId = sessions[sessionId].chatId;
        if (recipientId) {
            bot.sendMessage(recipientId, text);
            return Promise.resolve()
        }
    },
    clear(ctx){
        console.log('Executing clear');
      return new Promise(function(resolve, reject) {
        const session  = sessions[ctx.sessionId];
        session.context.done=true;
        return resolve(session.context);

      });

    },
    querySplunk(ctx){
       return new Promise(function(resolve, reject) {
          console.log('Executing querySplunk');
          const session  = sessions[ctx.sessionId];


          mysplunk.runSearch('search * REQUEST_TYPE="'+session.context.event_entity+'" CANALE_INFASANTE="'+session.context.sistema+'" | stats count as TOTAL',
                  { exec_mode: "normal" },
              (result)=>{
                console.log('Splunk result  :' + JSON.stringify(result));

                console.log("this is the callback");
                session.context.n_scarti = result.rows[0][0];
                delete session.context.missingSistema;
                delete session.context.missingEvent;
                console.log('New context :' + JSON.stringify(session.context));
                return resolve(session.context);
            });

      });

    },
    getImportInfo(ctx){

      console.log('Executing getImportInfo');

      return new Promise(function(resolve, reject) {
        console.log('Ricevuto context :' + JSON.stringify(ctx));

        const entities  = ctx.entities;
        const session  = sessions[ctx.sessionId];

        console.log('Session : '+ JSON.stringify(session));

        var sistema  = firstEntityValue(entities,'sistema');
        var event_entity  = firstEntityValue(entities,'event_entity');


        if(session.context.sistema == null){
          if (sistema != null){
            session.context.sistema = sistema;
            delete session.context.missingSistema;
          }else{
            session.context.missingSistema=true;
          }
        }

        if(session.context.event_entity==null){
          if( event_entity ){
            session.context.event_entity= event_entity;
            delete session.context.missingEvent;
          }else{
            session.context.missingEvent=true;
          }
        }

        session.context.isScarti =true;

        console.log('New context :' + JSON.stringify(session.context));
        return resolve(session.context);


      });
    },

};
const wit = new Wit({
    accessToken: 'XN6S7TAFH4VHNIMAX4EGHNYZS3XJWEBQ',
    actions
});

const bot = new TelegramBot(token, {
    polling: true
});

bot.on('message', (msg) => {
    const sessionId = findOrCreateSession(msg.chat.id);

    wit.runActions(sessionId, msg.text, sessions[sessionId].context).then((context) => {
            console.log('Waiting for next user messages');

            if (context.done == true) {
              console.log('Context.done -> Delete session');
                delete sessions[sessionId];
            }else{
              sessions[sessionId].context = context;
            }

        })
        .catch((err) => {
            console.error('Oops! Got an error from Wit: ', err.stack || err);
        });

});
