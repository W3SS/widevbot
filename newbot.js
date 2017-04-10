const {Wit, log} = require('node-wit');
const TelegramBot = require('node-telegram-bot-api');
const mysplunk = require("./splunk.js");


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

const wit = new Wit({accessToken:wit_token});

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

var getInfoSistema= (data,sessionId,cb)=>{

  let intent = firstEntityValue(data.entities, 'intent');
  var session = sessions[sessionId];

  if(intent != null){
    session.context.intent = intent;
  }
   cb('Il sistema è in ottimo stato...');
    return;
}

var getImportInfo = (data,sessionId,cb)=>{

  console.log("Executing getImportInfo")
  console.log(JSON.stringify(data));
  var session = sessions[sessionId];
  let sistema = firstEntityValue(data.entities, 'sistema');
  let event_entity = firstEntityValue(data.entities, 'event_entity');
  let intent = firstEntityValue(data.entities, 'intent');

  if(intent != null){
    session.context.intent = intent;
  }

  if (session.context.sistema != null && !sistema){
    sistema = session.context.sistema;
  }else{
    session.context.sistema=sistema;
  }

  if(session.context.event_entity !=null && !event_entity ){
    event_entity = session.context.event_entity;
  }else{
    session.context.event_entity = event_entity;
  }

  if (session.context.event_entity == null){
     cb('Per quale tipo di eventi ?');
     return;
  }
  if (session.context.sistema == null){
     cb('Per quale sistema ?');
     return;
  }
  if (session.context.sistema != null && session.context.event_entity != null){
      cb('Ho tutto ciò che mi serve... chiedo a Splunk');

      mysplunk.runSearch('search * REQUEST_TYPE="'+session.context.event_entity+'" CANALE_INFASANTE="'+session.context.sistema+'" | stats count as TOTAL',
            { exec_mode: "normal" },
        (result)=>{
          console.log('Splunk result  :' + JSON.stringify(result));

          console.log("this is the callback");
          let scarti = result.rows[0][0];
          cb('Abbiamo '+scarti+' scarti '+ session.context.sistema + ' per eventi di tipo : ' + event_entity);
          delete session.context.sistema;
          delete session.context.event_entity;

      });

    return;
  }

  return;
};

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log('Ricevuto : ' + JSON.stringify(msg));

  wit.message(msg.text)
      .then((data)=>{
        console.log(JSON.stringify(data));
        const sessionId = findOrCreateSession(chatId);

        var intent = firstEntityValue(data.entities,'intent');

        if (!intent && sessions[sessionId].context.intent == null ){
          intent='greetings';
        }else{
          if(!intent){
              intent=sessions[sessionId].context.intent;
          }else{
             console.log('Cambiamo discorso');
          }
        }

        console.log('INTENTO:'+ intent);


        switch (intent)
        {
          case 'greetings' :
            bot.sendMessage(sessions[sessionId].chatId,'Come posso aiutarti ?');
            break;
          case 'scarti' :
            getImportInfo(data,sessionId,(msg)=>{
                bot.sendMessage(sessions[sessionId].chatId,msg);
            });
            break;
          case 'stato_sistema' :
            getInfoSistema(data,sessionId,(msg)=>{
                bot.sendMessage(sessions[sessionId].chatId,msg);
            });

            break;
        }
      })
  .catch(console.error);




});
