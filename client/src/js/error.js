// Errors

const api = require('./api');

exports.sendError = (requestBody) => {
  requestBody["ua"] = navigator.userAgent;
  requestBody["date"] = new Date().toString();

  fetch(api.WaitingTimesAPI.logAPI, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
}