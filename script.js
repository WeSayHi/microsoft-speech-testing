// Initialize instances and variables
let startButton = document.getElementById("start-button");
let output = document.getElementById("output-text");
let waitingPeriodInput = document.getElementById("waiting-period-input");
let waitingPeriod = waitingPeriodInput.value;
let dropdown = document.getElementById("language-dropdown");
let languageCode = dropdown[dropdown.selectedIndex].value;
let audioElement = document.getElementById("audio");
let webAudioRecorder;
let currentlyRecording = false;

// Changes the waiting period based on the input
waitingPeriodInput.addEventListener("change", function () {
  waitingPeriod = waitingPeriodInput.value;
});

// Changes the language code base on the dropdown selection
dropdown.addEventListener("change", function () {
  languageCode = dropdown[dropdown.selectedIndex].value;
});

// Called when the start button is clicked
startButton.addEventListener("click", () => {
  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((stream) => {
      currentlyRecording = true;
      getUserMediaStream = stream;
      let AudioContext = window.AudioContext || window.webkitAudioContext;
      let audioContext = new AudioContext();
      let source = audioContext.createMediaStreamSource(stream);

      webAudioRecorder = new WebAudioRecorder(source, {
        workerDir: "web_audio_recorder_js/",
        encoding: "mp3",
        options: {
          encodeAfterRecord: true,
          mp3: { bitRate: "320" },
        },
      });

      webAudioRecorder.onComplete = (webAudioRecorder, blob) => {
        let audioElementSource = window.URL.createObjectURL(blob);
        audioElement.src = audioElementSource;
        audioElement.controls = true;
      };

      webAudioRecorder.onError = (webAudioRecorder, err) => {
        console.error(err);
      };

      webAudioRecorder.startRecording();
    })
    .catch((err) => {
      console.error(err);
    });

  audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

  // Set up the speech config from the API key and region then set the language to French
  var speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    "6b19ea6cfaa74e538bdd433daf387108",
    "centralindia"
  );
  speechConfig.speechRecognitionLanguage = languageCode;
  var reco = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

  // Setting up callback functions before starting recognition

  // Called when a new word is picked up and starts a timeout to stop recognition if no words are picked up for a certain time period
  var timeoutID;
  reco.recognizing = function (s, e) {
    output.innerText += "Recognizing: " + e.result.text + "\n";
    clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      reco.stopContinuousRecognitionAsync();
    }, waitingPeriod);
  };

  // Called when one phrase is finished
  reco.recognized = function (s, e) {
    if (e.result.text.length > 0) {
      output.innerText += "Recognized Phrase: " + e.result.text + "\n\n";
      console.log(e);
    }
  };

  // Called when recognition has stopped
  reco.sessionStopped = function (s, e) {
    output.innerText +=
      "Done. No speech heard in the last " + waitingPeriod + "ms";
    startButton.disabled = false;
    webAudioRecorder.finishRecording();
  };

  // Starts recognition
  reco.startContinuousRecognitionAsync();
  output.innerText = "Recognition started\n\n";
  startButton.disabled = true;
});
