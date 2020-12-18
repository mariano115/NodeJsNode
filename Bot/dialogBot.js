//libraries
const express = require("express");
const router = express.Router();
const request = require("request");
const uuid = require("uuid");
const axios = require("axios");
//files
const config = require("../config");
const dialogflow = require("../dialogflow");
const jira = require("./jira");
const {
    structProtoToJson
} = require("./helpers/structFunctions");
const TicketObject = require("./Ticket");
//mongodb models
const Ticket = require("../Models/Tickets");

//variables
let idTicket;
let motivo;

const endpointJava = config.ENDPOINT_SOCIAL_MICROSERVICE;
const endpointJira = config.ENDPOINT_JIRA_BACKEND;

let miMapa = new Map();
let ticket = {
    firstName: "",
    lastName: "",
    senderId: "",
    uniqueIdentifier: "",
    contactType: "",
    userMessage: "",
    url: "",
};
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

router.post("/dialogFlow/", function (req, res) {
    if (req) {
        console.log(req.body);
        sendToDialogFlow(
            req.body.sender,
            req.body.text,
            req.body.hashSender,
            req.body.type,
            req.body.url,
            req.body.inputMethod
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
});

async function setSessionAndUser(senderId) {
    try {
        if (!sessionIds.has(senderId)) {
            sessionIds.set(senderId, uuid.v1());
        }
    } catch (error) {
        throw error;
    }
}

async function handleDialogFlowAction(
    sender,
    action,
    messages,
    contexts,
    parameters,
    type,
    url,
    inputMethod
) {
    switch (action) {
        case "Saludo.Info.action": {
            //CAMBIAR EL ATRIBUTO GLOBAL senderID por uno real desharcodeado cuando este la integracion final con facebook
            let userData = await getUserData(senderID);
            await sendTextMessageToMS(
                sender,
                "Hola " + userData.first_name + " " + userData.last_name + "!", type
            );
            await sendGenericMessageMS(sender, [{
                title: "Que operacion desea realizar",
                image_url: "https://data.ilikesales.com.ar/retailers/logos/000/000/204/medium/banco-credicoop.jpg?1552673321",
                subtitle: "Elija alguna opcion",
                buttons: [{
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
            }, ], type);
            ticket.firstName = userData.first_name;
            ticket.lastName = userData.last_name;
            ticket.senderId = sender;
            ticket.url = url;
            ticket.inputMethod = inputMethod;
            if (miMapa.has(sender)) {
                miMapa.delete(sender);
            }
            miMapa.set(sender, ticket);
            break;
        }
        case "RealizarConsulta.action": {
            this.motivo = "Consulta";
            await sendTextMessageToMS(sender, "¿Cual es su numero de cliente?", type);
            await sendTextMessageToMS(
                sender,
                "Esta informacion la encontrara dentro de su perfil dentro del home banking", type
            );
            addTypeOfContext(sender, url, "Consulta", inputMethod);
            break;
        }
        case "RealizarQueja_Reclamo.action": {
            this.motivo = "Reclamo/Queja";
            await sendTextMessageToMS(sender, "¿Cual es su numero de cliente?", type);
            await sendTextMessageToMS(
                sender,
                "Esta informacion la encontrara dentro de su perfil dentro del home banking", type
            );
            addTypeOfContext(sender, url, "Reclamo/Queja");
            break;
        }

        case "PedidoDeNumeroCliente.action": {
            let ticketIntance = miMapa.get(sender);
            //console.log("--------------------------")
            //console.log(ticketIntance)
            //console.log("--------------------------")
            if (ticketIntance === undefined || ticketIntance === null) {
                handleDialogFlowAction(sender, "Saludo.Info.action");
            } else {
                addIdClient(
                    sender,
                    parameters.fields.uniqueIdentifier.numberValue
                );
                let ticketIntance = miMapa.get(sender);
                console.log(ticketIntance);
                await sendTextMessageToMS(
                    sender,
                    "¿Cual es su " + ticketIntance.contactType + "?", type
                );
            }
            break;
        }
        case "PreguntaMotivo.action": {
            let ticketIntance = miMapa.get(sender);
            if (ticketIntance === undefined || ticketIntance === null) {
                handleDialogFlowAction(sender, "Saludo.Info.action");
            } else {

                addAnswer(sender, parameters.fields.userMessage.stringValue);
                //console.log(parameters.fields.userMessage.stringValue);
                /*sendTextMessageToMS(
                    sender,
                    "Perfecto tu ticket se genero correctamente este sera revisado por un representante a la brevedad", type
                );*/
                //PROBAR ESTO CON BRUNO
                //sendTicketToJira(sender, type);
                
                let response = await sendTicketAndDelete(sender);
                console.log(response);
                if (response === undefined) {
                    sendTextMessageToMS(
                        sender,
                        "Disculpá, no pudimos generar tu ticket en este momento. Por favor, volvé a intentar más tarde.",
                        type);
                } else {
                    sendTextMessageToMS(
                        sender,
                        "Perfecto tu ticket se genero correctamente este sera revisado por un representante a la brevedad",
                        type
                    );
                    sendTextMessageToMS(sender, "Tu numero de ticket es : " + response.data[0].ticketKey, type);
                }
            }
            break;
        }
        case "input.unknown": {
            await sendTextMessageToMS(sender, "Disculpa no le he entendido", type);
            break;
        }
    }
}

async function sendToDialogFlow(
    senderId,
    messageText,
    hash,
    type,
    url,
    inputMethod
) {
    //sendTypingOn(senderId);
    try {
        let result;
        setSessionAndUser(senderId);
        let session = sessionIds.get(senderId);
        console.log(session);
        session = hash;
        result = await dialogflow.sendToDialogFlow(messageText, session, type);
        handleDialogFlowResponse(senderId, result, type, url, inputMethod);
    } catch (error) {
        console.log("salio mal en sendToDialogflow...", error);
    }
}

function handleDialogFlowResponse(sender, response, type, url, inputMethod) {
    let responseText = response.fulfillmentMessages.fulfillmentText;
    let messages = response.fulfillmentMessages;
    let action = response.action;
    let contexts = response.outputContexts;
    let parameters = response.parameters;

    //sendTypingOff(sender);

    handleDialogFlowAction(
        sender,
        action,
        messages,
        contexts,
        parameters,
        type,
        url,
        inputMethod
    );
}

async function getUserData(senderId) {
    console.log("consiguiendo datos del usuario...");
    let access_token = config.FB_PAGE_TOKEN;
    try {
        let userData = await axios.get(
            "https://graph.facebook.com/v6.0/" + senderId, {
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

async function sendTextMessageToMS(recipientId, text, type) {
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
        type: type
    };

    await callSendAPIMS(messageData);
}

async function sendGenericMessageMS(recipientId, elements, type) {
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
        type: type
    };

    await callSendAPIMS(messageData);
}

/*searchTicket = (ticket) => {
    let senderIdTicket = ticket.
};*/

function callSendAPIMS(messageData) {
    //messageData.recipient.id = senderReal;
    console.log(messageData);
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

            console.log(error);
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

addTypeOfContext = async (sender, url, type, inputMethod) => {
    let ticketIntance = miMapa.get(sender);
    //CAMBIAR EL ATRIBUTO GLOBAL senderID por uno real desharcodeado cuando este la integracion final con facebook
    let userData = await getUserData(senderID);
    if (ticketIntance === undefined) {
        ticket.firstName = userData.first_name;
        ticket.lastName = userData.lastName;
        ticket.senderId = sender;
        ticket.url = url;
        ticket.inputMethod = inputMethod;
        ticketIntance = ticket;
    }
    ticketIntance.contactType = type;
    miMapa.set(sender, ticketIntance);
};

addIdClient = async (sender, uniqueIdentifier) => {
    let ticketIntance = miMapa.get(sender);
    if (ticketIntance === undefined) {
        handleDialogFlowAction(sender);
    }
    ticketIntance.uniqueIdentifier = uniqueIdentifier;
    miMapa.set(sender, ticketIntance);
};

addAnswer = async (sender, userMessage) => {
    let ticketIntance = miMapa.get(sender);
    ticketIntance.userMessage = userMessage;
    miMapa.set(sender, ticketIntance);
};

function sendTicketAndDelete(senderIDJira) {
    return jira.sendTicket(miMapa.get(senderIDJira));
}

// Necesita ser async?
// function sendTicketAndDelete(senderIDJira) {
//     let response = undefined;
//     try {
//         response = jira.sendTicket(miMapa.get(senderIDJira));
//         console.log(response);
//     } catch (err) {
//         console.log("fallé");
//         console.log(err);
//     } finally {
//         miMapa.delete(senderIDJira);
//     }
    
//     console.log(response);

//     return response;
// }

sendTicketToJira = async (senderIDJira, type) => {
    console.log(miMapa.get(senderIDJira));
    const id = senderIDJira;
    axios
        .post(endpointJira, miMapa.get(senderIDJira))
        .then(async function (response) {
            console.log("Successfully sent message to Jira");
            miMapa.delete(senderIDJira)
            sendTextMessageToMS(id, "Tu numero de ticket es : " + response.data[0].ticketKey, type);
        })
        .catch(function (error) {
            console.log("Error on sent message to Jira");
            miMapa.delete(senderIDJira)
            //console.log(error);
        });

};

module.exports = router;