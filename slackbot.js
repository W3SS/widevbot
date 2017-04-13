const TelegramBot = require('node-telegram-bot-api');
const {Wit, log} = require('node-wit');
const mysplunk = require("./splunk.js");
const SlackBot = require('slackbots');


const wit_token = 'XN6S7TAFH4VHNIMAX4EGHNYZS3XJWEBQ';

var bot_token ='xoxb-167506781136-FlERoH61ny2nT8SfxYkTKN3D';
const tel_token = '262255785:AAHcQ8nS9u4ID4iEk9LJHLutFxG4i6yBgvw';

var bot = new SlackBot({
    token: bot_token, // Add a bot https://my.slack.com/services/new/bot and put the token
    name: 'WidevBot'
});

const telegrambot = new TelegramBot(tel_token, {polling: true});


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
    console.log('Creo una nuova sessione');
    sessionId = new Date().toISOString();
    sessions[sessionId] = {chatId: chatId, context: {},bottype:''};
  }
  return sessionId;
};

const getInfoSistema= (data,session,cb)=>{

  let intent = firstEntityValue(data.entities, 'intent');

  if(intent != null){
    session.context.intent = intent;
  }
   cb('Il sistema è in ottimo stato...');
    return;
}

const getImportInfo = (data,session,cb)=>{

  console.log("Executing getImportInfo")
  console.log(JSON.stringify(data));
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


const sendTextMessage = function(text,session){
  if(session.bottype == "TEL"){
    telegrambot.sendMessage(session.chatId,text);
  }
  if(session.bottype == 'SLACK'){
    bot.postMessage( session.chatId, text).then(function(data) {
    })
  }
}


const handleMessage=function(msg,session){

  wit.message(msg.text)
      .then((data)=>{
        console.log(JSON.stringify(data));

        var intent = firstEntityValue(data.entities,'intent');

        if (!intent && session.context.intent == null ){
          intent='greetings';
        }else{
          if(!intent){
              intent=session.context.intent;
          }else{
             console.log('Cambiamo discorso');
          }
        }
        console.log('INTENTO:'+ intent);

        switch (intent)
        {
          case 'greetings' :
          sendTextMessage('Come posso aiutarti ?',session);
             break;
          case 'scarti' :
            getImportInfo(data,session,(msg)=>{
              sendTextMessage(msg,session);
            });
            break;
          case 'stato_sistema' :
            getInfoSistema(data,session,(msg)=>{
              sendTextMessage(msg,session);
            });
            break;
        }
      })
  .catch(console.error);
}

telegrambot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const sessionId = findOrCreateSession(chatId);
  let session = sessions[sessionId];

  session.bottype="TEL";
  handleMessage(msg,session);

});


bot.on('message', function(msg) {
  if(msg.type=='message' && msg.username != bot.name){
    console.log('Ricevuto : ' + JSON.stringify(msg));
    const chatId = msg.channel;
    const sessionId = findOrCreateSession(chatId);
    let session = sessions[sessionId];
    session.bottype="SLACK";
    handleMessage(msg,session);
  }

});
