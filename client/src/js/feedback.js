// Feedback

exports.sendFeedback = (body) => {
  fetch(WaitingTimesAPI.feedbackAPI, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
