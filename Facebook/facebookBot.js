//libraries
const express = require("express");
const router = express.Router();
const request = require("request");
const uuid = require("uuid");
const axios = require("axios");
//files
const config = require("../config");
const dialogflow = require("../dialogflow");
const { structProtoToJson } = require("./helpers/structFunctions");
const TicketObject = require("./Ticket");
//mongodb models
const Ticket = require("../Models/Tickets");

//variables
let idTicket;
let motivo;
const endpointJava =
    "https://0cded5b69183.ngrok.io/POCFacebook/receiveinformation";

let senderID;

// Messenger API parameters
if (!config.FB_PAGE_TOKEN) {
    throw new Error("missing FB_PAGE_TOKEN");
}
if (!config.FB_VERIFY_TOKEN) {
    throw new Error("missing FB_VERIFY_TOKEN");
}
if (!config.GOOGLE_PROJECT_ID) {
    throw new Error("missing GOOGLE_PROJECT_ID");
}
if (!config.DF_LANGUAGE_CODE) {
    throw new Error("missing DF_LANGUAGE_CODE");
}
if (!config.GOOGLE_CLIENT_EMAIL) {
    throw new Error("missing GOOGLE_CLIENT_EMAIL");
}
if (!config.GOOGLE_PRIVATE_KEY) {
    throw new Error("missing GOOGLE_PRIVATE_KEY");
}
if (!config.FB_APP_SECRET) {
    throw new Error("missing FB_APP_SECRET");
}

const sessionIds = new Map();

// for Facebook verification
router.post("/dialogFlow/", function (req, res) {
    if (req) {
        console.log(req.body);
        sendToDialogFlow(
            req.body.senderId,
            req.body.text,
            req.body.hashsender,
            req.body.type
        );
        senderReal = req.body.sender;
        senderID = "4633829030023736";
        //sendToDialogFlow("4633829030023736", req.body.text);*/
        console.log("Method Succesfully working");
        //console.log(req);
        res.sendStatus(200);
    } else {
        console.error("Failed request it's null");
        res.sendStatus(403);
    }

    // Make sure this is a page subscription
    /*if (data.object == "page") {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function (messagingEvent) {
                if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else {
                    console.log(
                        "Webhook received unknown messagingEvent: ",
                        messagingEvent
                    );
                }
            });
        });

        // Assume all went well.
        // You must send back a 200, within 20 seconds
        res.sendStatus(200);
    }*/
});

// for Facebook verification
router.get("/webhook/", function (req, res) {
    if (
        req.query["hub.mode"] === "subscribe" &&
        req.query["hub.verify_token"] === config.FB_VERIFY_TOKEN
    ) {
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        console.error(
            "Failed validation. Make sure the validation tokens match."
        );
        res.sendStatus(403);
    }
});

//for webhook facebook
router.post("/webhook/", function (req, res) {
    console.log(req);
    var data = req.body;
    // Make sure this is a page subscription
    if (data.object == "page") {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function (pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function (messagingEvent) {
                if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if (messagingEvent.postback) {
                    receivedPostback(messagingEvent);
                } else {
                    console.log(
                        "Webhook received unknown messagingEvent: ",
                        messagingEvent
                    );
                }
            });
        });

        // Assume all went well.
        // You must send back a 200, within 20 seconds
        res.sendStatus(200);
    }
});

async function receivedMessage(event) {
    var senderId = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    console.log(
        "Received message for user %d and page %d at %d with message:",
        senderId,
        recipientID,
        timeOfMessage
    );

    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;

    // You may get a text or attachment but not both
    var messageText = message.text;
    var messageAttachments = message.attachments;
    var quickReply = message.quick_reply;

    if (isEcho) {
        handleEcho(messageId, appId, metadata);
        return;
    } else if (quickReply) {
        handleQuickReply(senderId, quickReply, messageId);
        return;
    }
    saveUserData(senderId);
    if (messageText) {
        //send message to dialogflow
        console.log("MENSAJE DEL USUARIO: ", messageText);
        await sendToDialogFlow(senderId, messageText);
    } else if (messageAttachments) {
        handleMessageAttachments(messageAttachments, senderId);
    }
}

async function saveUserData(facebookID) {
    let isRegistered = await ChatbotUser.findOne({
        facebookID: facebookID,
    });
    if (isRegistered) return;
    let userData = await getUserData(facebookID);
    let chatbotUser = new ChatbotUser({
        firstName: userData.first_name,
        lastName: userData.last_name,
        facebookID,
        profilePic: userData.profile_pic,
    });
    chatbotUser.save((err, res) => {
        if (err) return console.log(err);
        console.log("Se creo un usuario:", res);
    });
}

function handleMessageAttachments(messageAttachments, senderId) {
    //for now just reply
    sendTextMessage(senderId, "Archivo adjunto recibido... gracias! .");
}

async function setSessionAndUser(senderId) {
    try {
        if (!sessionIds.has(senderId)) {
            sessionIds.set(senderId, uuid.v1());
        }
    } catch (error) {
        throw error;
    }
}

async function handleQuickReply(senderId, quickReply, messageId) {
    let quickReplyPayload = quickReply.payload;
    console.log(
        "Quick reply for message %s with payload %s",
        messageId,
        quickReplyPayload
    );
    this.elements = a;
    // send payload to api.ai
    sendToDialogFlow(senderId, quickReplyPayload);
}

async function handleDialogFlowAction(
    sender,
    action,
    messages,
    contexts,
    parameters
) {
    switch (action) {
        case "Saludo.Info.action": {
            let userData = await getUserData(senderID);
            //let userData = await getUserData(sender);
            /*console.log("====================================================");
            console.log(sender);
            console.log(userData);
            console.log("====================================================");
            await sendTextMessage(
                sender,
                "Hola " + userData.first_name + " " + userData.last_name + "!"
            );*/
            await sendTextMessageToMS(
                sender,
                "Hola " + userData.first_name + " " + userData.last_name + "!"
            );
            await sendGenericMessageMS(sender, [
                {
                    title: "Que operacion desea realizar",
                    image_url:
                        "https://data.ilikesales.com.ar/retailers/logos/000/000/204/medium/banco-credicoop.jpg?1552673321",
                    subtitle: "Elija alguna opcion",
                    buttons: [
                        {
                            type: "postback",
                            title: "Consulta",
                            payload: "realizar_consulta",
                        },
                        {
                            type: "postback",
                            title: "Queja o Reclamo",
                            payload: "realizar_queja_reclamo",
                        },
                        {
                            type: "postback",
                            title: "Otro",
                            payload: "otro",
                        },
                    ],
                },
            ]);
            /*
            await sendGenericMessage(sender, [
                {
                    title: "Que operacion desea realizar",
                    image_url:
                        "https://data.ilikesales.com.ar/retailers/logos/000/000/204/medium/banco-credicoop.jpg?1552673321",
                    subtitle: "Elija alguna opcion",
                    buttons: [
                        {
                            type: "postback",
                            title: "Consulta",
                            payload: "realizar_consulta",
                        },
                        {
                            type: "postback",
                            title: "Queja o Reclamo",
                            payload: "realizar_queja_reclamo",
                        },
                        {
                            type: "postback",
                            title: "Otro",
                            payload: "otro",
                        },
                    ],
                },
            ]);*/
            break;
        }
        case "RealizarConsulta.action": {
            this.motivo = "Consulta";
            await sendTextMessageToMS(sender, "¿Cual es su numero de cliente?");
            await sendTextMessageToMS(
                sender,
                "Esta informacion la encontrara dentro de su perfil dentro del home banking"
            );
            break;
        }
        case "RealizarQueja_Reclamo.action": {
            this.motivo = "Reclamo/Queja";
            await sendTextMessageToMS(sender, "¿Cual es su numero de cliente?");
            await sendTextMessageToMS(
                sender,
                "Esta informacion la encontrara dentro de su perfil dentro del home banking"
            );
            break;
        }

        case "PedidoDeNumeroCliente.action": {
            let userData = await getUserData(sender);
            let newTicket = new Ticket({
                name: userData.first_name,
                lastName: userData.last_name,
                idFacebook: sender,
                idCredicoop: parameters.fields.idCredicoop.numberValue,
                reason: "",
                motivo: this.motivo,
            });
            newTicket.save();
            this.idTicket = newTicket.id;
            await sendTextMessageToMS(
                sender,
                "¿Cual es su " + this.motivo + "?"
            );
            break;
        }
        case "PreguntaMotivo.action": {
            console.log(this.idTicket);
            Ticket.findOneAndUpdate(
                { _id: this.idTicket },
                { reason: parameters.fields.answer.stringValue },
                { upsert: true },
                function (err, doc) {
                    if (err) console.log(err);
                    return console.log("Registry Succesfully saved.");
                }
            );
            sendTextMessageToMS(
                sender,
                "Perfecto tu ticket se genero correctamente este sera revisado por un representante a la brevedad"
            );

            break;
        }
        case "input.unknown": {
            await sendTextMessageToMS(sender, "Disculpa no le he entendido");
            break;
        }
    }
}

async function handleMessage(message, sender) {
    switch (message.message) {
        case "text": // text
            for (const text of message.text.text) {
                if (text !== "") {
                    await sendTextMessage(sender, text);
                }
            }
            break;
        case "quickReplies": // quick replies
            let replies = [];
            message.quickReplies.quickReplies.forEach((text) => {
                let reply = {
                    content_type: "text",
                    title: text,
                    payload: text,
                };
                replies.push(reply);
            });
            await sendQuickReply(sender, message.quickReplies.title, replies);
            break;
        case "image": // image
            await sendImageMessage(sender, message.image.imageUri);
            break;
        case "payload":
            let desestructPayload = structProtoToJson(message.payload);
            var messageData = {
                recipient: {
                    id: sender,
                },
                message: desestructPayload.facebook,
            };
            await callSendAPI(messageData);
            break;
        default:
            break;
    }
}

async function handleCardMessages(messages, sender) {
    let elements = [];
    for (let m = 0; m < messages.length; m++) {
        let message = messages[m];
        let buttons = [];
        for (let b = 0; b < message.card.buttons.length; b++) {
            let isLink =
                message.card.buttons[b].postback.substring(0, 4) === "http";
            let button;
            if (isLink) {
                button = {
                    type: "web_url",
                    title: message.card.buttons[b].text,
                    url: message.card.buttons[b].postback,
                };
            } else {
                button = {
                    type: "postback",
                    title: message.card.buttons[b].text,
                    payload:
                        message.card.buttons[b].postback === ""
                            ? message.card.buttons[b].text
                            : message.card.buttons[b].postback,
                };
            }
            buttons.push(button);
        }

        let element = {
            title: message.card.title,
            image_url: message.card.imageUri,
            subtitle: message.card.subtitle,
            buttons,
        };
        elements.push(element);
    }
    await sendGenericMessage(sender, elements);
}

async function handleMessages(messages, sender) {
    try {
        let i = 0;
        let cards = [];
        while (i < messages.length) {
            switch (messages[i].message) {
                case "card":
                    for (let j = i; j < messages.length; j++) {
                        if (messages[j].message === "card") {
                            cards.push(messages[j]);
                            i += 1;
                        } else j = 9999;
                    }
                    await handleCardMessages(cards, sender);
                    cards = [];
                    break;
                case "text":
                    await handleMessage(messages[i], sender);
                    break;
                case "image":
                    await handleMessage(messages[i], sender);
                    break;
                case "quickReplies":
                    await handleMessage(messages[i], sender);
                    break;
                case "payload":
                    await handleMessage(messages[i], sender);
                    break;
                default:
                    break;
            }
            i += 1;
        }
    } catch (error) {
        console.log(error);
    }
}

async function sendToDialogFlow(senderId, messageText, hash, type) {
    //sendTypingOn(senderId);
    try {
        let result;
        setSessionAndUser(senderId);
        let session = sessionIds.get(senderId);
        console.log(session);
        session = hash;
        //session = "c20b1f80-3629-11eb-b921-4507081593c8";
        /*result = await dialogflow.sendToDialogFlow(
            messageText,
            session,
            "FACEBOOK"
        );*/
        result = await dialogflow.sendToDialogFlow(messageText, session, type);
        handleDialogFlowResponse(senderId, result);
    } catch (error) {
        console.log("salio mal en sendToDialogflow...", error);
    }
}

/*async function sendToDialogFlow(senderId, messageText) {
    sendTypingOn(senderId);
    try {
        let result;
        setSessionAndUser(senderId);
        let session = sessionIds.get(senderId);
        result = await dialogflow.sendToDialogFlow(
            messageText,
            session,
            "FACEBOOK"
        );
        handleDialogFlowResponse(senderId, result);
    } catch (error) {
        console.log("salio mal en sendToDialogflow...", error);
    }
}*/

function handleDialogFlowResponse(sender, response) {
    let responseText = response.fulfillmentMessages.fulfillmentText;
    let messages = response.fulfillmentMessages;
    let action = response.action;
    let contexts = response.outputContexts;
    let parameters = response.parameters;

    //sendTypingOff(sender);

    if (isDefined(action)) {
        handleDialogFlowAction(sender, action, messages, contexts, parameters);
    } else if (isDefined(messages)) {
        handleMessages(messages, sender);
    } else if (responseText == "" && !isDefined(action)) {
        //dialogflow could not evaluate input.
        sendTextMessage(sender, "No entiendo lo que trataste de decir ...");
    } else if (isDefined(responseText)) {
        sendTextMessage(sender, responseText);
    }
}
async function getUserData(senderId) {
    console.log("consiguiendo datos del usuario...");
    let access_token = config.FB_PAGE_TOKEN;
    try {
        let userData = await axios.get(
            "https://graph.facebook.com/v6.0/" + senderId,
            {
                params: {
                    access_token,
                },
            }
        );
        return userData.data;
    } catch (err) {
        console.log("algo salio mal en axios getUserData: ", err);
        return {
            first_name: "",
            last_name: "",
            profile_pic: "",
        };
    }
}

async function sendTextMessageToMS(recipientId, text) {
    if (text.includes("{first_name}") || text.includes("{last_name}")) {
        let userData = await getUserData(recipientId);
        text = text
            .replace("{first_name}", userData.first_name)
            .replace("{last_name}", userData.last_name);
    }
    var messageData = {
        recipient: {
            id: recipientId,
        },
        message: {
            text: text,
        },
    };

    await callSendAPIMS(messageData);
}

async function sendTextMessage(recipientId, text) {
    if (text.includes("{first_name}") || text.includes("{last_name}")) {
        let userData = await getUserData(recipientId);
        text = text
            .replace("{first_name}", userData.first_name)
            .replace("{last_name}", userData.last_name);
    }
    var messageData = {
        recipient: {
            id: recipientId,
        },
        message: {
            text: text,
        },
    };
    await callSendAPI(messageData);
}

/*
 * Send an image using the Send API.
 *
 */
async function sendImageMessage(recipientId, imageUrl) {
    var messageData = {
        recipient: {
            id: recipientId,
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: imageUrl,
                },
            },
        },
    };
    await callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */
async function sendButtonMessage(recipientId, text, buttons) {
    var messageData = {
        recipient: {
            id: recipientId,
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: text,
                    buttons: buttons,
                },
            },
        },
    };
    await callSendAPI(messageData);
}

async function sendGenericMessage(recipientId, elements) {
    var messageData = {
        recipient: {
            id: recipientId,
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: elements,
                },
            },
        },
    };

    await callSendAPI(messageData);
}

async function sendGenericMessageMS(recipientId, elements) {
    var messageData = {
        recipient: {
            id: recipientId,
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: elements,
                },
            },
        },
    };

    await callSendAPIMS(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
async function sendQuickReply(recipientId, text, replies, metadata) {
    var messageData = {
        recipient: {
            id: recipientId,
        },
        message: {
            text: text,
            metadata: isDefined(metadata) ? metadata : "",
            quick_replies: replies,
        },
    };

    await callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId,
        },
        sender_action: "typing_on",
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId,
        },
        sender_action: "typing_off",
    };

    callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
    return new Promise((resolve, reject) => {
        request(
            {
                uri: "https://graph.facebook.com/v6.0/me/messages",
                qs: {
                    access_token: config.FB_PAGE_TOKEN,
                },
                method: "POST",
                json: messageData,
            },
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var recipientId = body.recipient_id;
                    var messageId = body.message_id;

                    if (messageId) {
                        console.log(
                            "Successfully sent message with id %s to recipient %s",
                            messageId,
                            recipientId
                        );
                    } else {
                        console.log(
                            "Successfully called Send API for recipient %s",
                            recipientId
                        );
                    }
                    resolve();
                } else {
                    reject();
                    console.error(
                        "Failed calling Send API",
                        response.statusCode,
                        response.statusMessage,
                        body.error
                    );
                }
            }
        );
    });
}

function callSendAPIMS(messageData) {
    messageData.recipient.id = senderReal;
    axios
        .post(endpointJava, {
            messageData: messageData,
        })
        .then(function (response) {
            console.log("Successfully sent message");
            //console.log(response);
        })
        .catch(function (error) {
            console.log("Error on sent message");

            //console.log(error);
        });
}

async function receivedPostback(event) {
    var senderId = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    var payload = event.postback.payload;
    switch (payload) {
        default:
            //unindentified payload
            sendToDialogFlow(senderId, payload);
            break;
    }

    console.log(
        "Received postback for user %d and page %d with payload '%s' " +
            "at %d",
        senderId,
        recipientID,
        payload,
        timeOfPostback
    );
}

function isDefined(obj) {
    if (typeof obj == "undefined") {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

module.exports = router;