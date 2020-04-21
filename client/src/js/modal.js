// Modal

const hidePlaceModal = (update) => {
  var update = update || false;
  var placeModal = document.getElementById("place-modal");
  placeModal.classList.remove("show");
  if (update) {
    feedback.sendFeedback({
      place_id: placeModal.getAttribute("data-place-id"),
      value: {
        estimate_person: 0,
        estimate_wait_min: parseInt(
          document.querySelector("#time-range").value
        ),
      },
    });
  }
};

const searchByNameModal = () => {
  if (document.querySelector(".modal") !== null)
    document.body.removeChild(document.querySelector(".modal"));

  openModal(
    "search-modal",
    "Search by name and address",
    '<input type="text" placeholder="Insert market or place name" id="place"><input type="text" placeholder="Insert address or city" id="address">',
    "Search",
    function searchByName() {
      if (
        document.getElementById("place").value == "" ||
        document.getElementById("address").value == ""
      ) {
        alert("Please, specify a place name and a place address.");
        return false;
      }

      TimesApp.getPlace(
        document.getElementById("place").value,
        document.getElementById("address").value
      );
      document.body.removeChild(document.querySelector(".modal"));
    }
  );
};

exports.showPlaceModal = (place, waitTimeArr) => {
  console.log(place);
  var placeModal = document.getElementById('place-modal');
  placeModal.classList.add('show');
  placeModal.focus();
  placeModal.setAttribute("data-place-id", place["place_id"]);

  var formattedTime = "recent";
  if (place["updatetime"] !== undefined) {
    var date = new Date(place["updatetime"] * 1000);
    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    formattedTime = hours + ':' + minutes.substr(-2);
  }

  var waitTime = waitTimeArr[1];
  var isClosed = (waitTimeArr[0] === 0) ? true : false;
  var noInfo = (typeof(waitTime) === 'string' && !isClosed) ? true : false;
  waitTime = (isClosed) ? "Closed" : waitTime;

  var modalTitleEl = document.querySelector(".place-modal__title");
  modalTitleEl.innerHTML = place["name"];
  var modalSubtitleEl = document.querySelector(".place-modal__subtitle");
  modalSubtitleEl.innerHTML = place["address"];
  var modalBadgeEl = document.querySelector(".place-modal__badge div");
  var badgeText = (isClosed) ? "Closed" : (waitTime + " min");
  badgeText = (noInfo) ? "No info" : badgeText;
  modalBadgeEl.setAttribute("class", "text-center bg-" + waitTime.toString().toLowerCase() + "min");
  var timeMinEl = document.querySelector("#time-min");
  timeMinEl.innerHTML = badgeText;
  var updateTimeEl = document.querySelector("#place-modal time");
  updateTimeEl.innerHTML = formattedTime;
  var timeRangeEl = document.querySelector("#time-range");
  timeRangeEl.value = waitTimeArr[1];
}


const openModal = (id, title, content, actionText, actionFn, closeFn) => {
  var id = id || (new Date()).getTime();
  var h2 = title;
  var actionText = actionText || 'Send';
  
  var divModal = document.createElement('div');
  divModal.id = id;
  divModal.className = 'modal';
  
  var innerdivModalm = document.createElement('div');
  innerdivModalm.className = 'modal-content animate-opacity card-4';
  divModal.appendChild(innerdivModalm);

  var headerModal = document.createElement('header');
  headerModal.className = 'container teal';
  innerdivModalm.appendChild(headerModal);
  
  var containerContentDiv = document.createElement('div');
  containerContentDiv.className = 'container';
  innerdivModalm.appendChild(containerContentDiv);
  
  containerContentDiv.innerHTML = content || '<p>Did not find what you were looking for? <br/><u style="cursor: pointer" onclick="Utils.searchByNameModal()">Tap here to search by name 🔍</u></p><input type="text" id="email" placeholder="Insert an email for an answer or leave blank" /><textarea placeholder="Write here your question or tips" rows="7"></textarea><small><i>Note: this is not a search box</i></small>';
  
  var buttonM = document.createElement("button");
  buttonM.setAttribute("type", "button");
  buttonM.className = 'close-button display-topright';
  buttonM.setAttribute("onclick", "document.getElementById('" + id + "').style.display='none'");
  buttonM.innerHTML = "&times;";
  headerModal.appendChild(buttonM);
  
  var headerM = document.createElement("H2");
  headerM.innerHTML = h2;
  headerModal.appendChild(headerM);
  
  var footer = document.createElement('div');
  footer.className = 'container teal';
  innerdivModalm.appendChild(footer);
  
  var closeButton = document.createElement("button");
  closeButton.setAttribute('type', 'button');
  closeButton.className = 'btn';
  if (actionText !== -1)
  closeButton.style.float = "right";
  
  if (closeFn === undefined) {
    closeButton.setAttribute("onclick", "document.getElementById('" + id + "').style.display='none'");
  } else {
    closeButton.addEventListener('click', closeFn);
  }
  
  closeButton.innerHTML = "Close";
  footer.appendChild(closeButton);
  
  if (actionText !== -1) {
    var actionButton = document.createElement("button");
    actionButton.setAttribute("type", "button");
    actionButton.className = 'btn';
    if (actionFn === undefined) {
      actionButton.setAttribute("onclick", "TimesApp.sendHelp(document.querySelector('.modal-content textarea').value, document.querySelector('.modal-content #email').value)");
    } else {
      actionButton.addEventListener('click', actionFn);
    }
    
    actionButton.innerHTML = actionText;
    footer.appendChild(actionButton);
  }
  
  divModal.style.display = "flex";
  
  document.getElementsByTagName('body')[0].appendChild(divModal);
}

window.hidePlaceModal = hidePlaceModal;
window.searchByNameModal = searchByNameModal;
exports.hidePlaceModal = hidePlaceModal;
exports.openModal = openModal;
exports.searchByNameModal = searchByNameModal;
