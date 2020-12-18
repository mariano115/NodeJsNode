const axios = require("axios");
const config = require("../config");

let endpointJira = config.ENDPOINT_JIRA_BACKEND;

// Qué devuelve esto? res?
module.exports.sendTicket = function(ticket) {
    return axios
        .post(endpointJira, ticket)
        .then(res => {
            console.log("Successfully sent message to Jira");
            res;
        })
        .catch(err => {
            console.log("Error on sent message to Jira");
            console.log(err);
        });
};
