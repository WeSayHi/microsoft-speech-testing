// Initialize instances and variables
let startButton = document.getElementById("start-button");
let output = document.getElementById("output-text");
let waitingPeriodInput = document.getElementById("waiting-period-input");
let waitingPeriod = waitingPeriodInput.value;
let matchPhrasesInput = document.getElementById("match-phrases-input");
let matchPhrases = matchPhrasesInput.value.split(", ");
let dropdown = document.getElementById("language-dropdown");
let languageCode = dropdown[dropdown.selectedIndex].value;
let audioElement = document.getElementById("audio");
let webAudioRecorder;
let utterances = [];

// Changes the match phrases based on the input
matchPhrasesInput.addEventListener("change", function () {
  matchPhrases = matchPhrasesInput.value.split(", ");
});

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
  // Record the sound on a sepereate stream ndoe
  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then((stream) => {
      getUserMediaStream = stream;
      let AudioContext = window.AudioContext || window.webkitAudioContext;
      let audioContext = new AudioContext();
      let source = audioContext.createMediaStreamSource(stream);

      webAudioRecorder = new WebAudioRecorder(source, {
        workerDir: "web_audio_recorder_js/",
        numChannels: 1,
        encoding: "ogg",
        options: {
          encodeAfterRecord: true,
          ogg: { quality: 0.5 },
        },
      });

      // Called when the recording has finished
      webAudioRecorder.onComplete = (webAudioRecorder, blob) => {
        // Prepare and upload the file to AWS S3
        blob.name = uuid() + ".ogg";
        s3upload(blob);

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
  speechConfig.outputFormat = 1;
  var reco = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

  // Setting up callback functions before starting recognition

  var timeoutID;

  // Called when a new word is picked up and starts a timeout to stop recognition if no words are picked up for a certain time period
  reco.recognizing = function (s, e) {
    output.innerText += "Recognizing: " + e.result.text + "\n";

    // Clear the cancel timeout if words are heard
    clearTimeout(timeoutID);
  };

  // Called when one phrase is finished
  reco.recognized = function (s, e) {
    if (e.result.text.length > 0) {
      output.innerText += "Recognized Phrase: " + e.result.text + "\n\n";

      // Add each utterance to an array
      let utterance = JSON.parse(e.result.privJson);
      utterances.push(utterance);

      // Set timeout to stop recognition if no words are heard
      timeoutID = setTimeout(() => {
        reco.stopContinuousRecognitionAsync();
      }, waitingPeriod);
    }
  };

  // Called when recognition has stopped
  reco.sessionStopped = function (s, e) {
    // Output that recognition is done
    output.innerText +=
      "Done. No speech heard in the last " + waitingPeriod + "ms\n";

    // Stop the recording
    webAudioRecorder.finishRecording();

    // Loop through each phrase to be matched
    var finalConfidences = [];
    for (var i = 0; i < matchPhrases.length; i++) {
      var matchesConfidences = [];

      // Loop through the NBest array of each utterance
      for (const utterance of utterances) {
        for (const prediction of utterance.NBest) {
          // Check if it contains the phrase to be matched. If so, append the confidence of that match to an array
          if (prediction.Lexical.indexOf(matchPhrases[i].toLowerCase()) != -1) {
            matchesConfidences.push(prediction.Confidence);
          }
        }
      }

      // Get the maximum confidence from all the matches for this specific phrase
      var maxConfidence = 0;
      if (matchesConfidences.length > 0) {
        maxConfidence = Math.max(...matchesConfidences);
      }

      // This finalConfidences array has the cooresponding max confidences for each phrase entered
      finalConfidences.push(maxConfidence);
    }

    // Clear the utterances array to be used next recording
    utterances = [];

    // Output the final confidences and average confidence
    output.innerText +=
      "Final confidences (cooresponding to the phrases): " +
      finalConfidences +
      "\n";

    var sum = 0;
    for (const confidence of finalConfidences) {
      sum += confidence;
    }
    averageConfidence = sum / finalConfidences.length;
    output.innerText += "Final average confidence: " + averageConfidence;

    // Re-enable the start button
    startButton.disabled = false;
  };

  // Starts recognition
  reco.startContinuousRecognitionAsync();
  output.innerText = "Recognition started\n\n";
  startButton.disabled = true;
});

// UUID for file naming
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initialize AWS configuration
var bucketName = "nfscratch";
var bucketRegion = "us-east-1";
var IdentityPoolId = "us-east-1:3efbe2a5-c38f-433a-8720-37b7b5f61a7d";

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId,
  }),
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: bucketName },
});

// Upload to S3
function s3upload(file) {
  if (file) {
    var fileName = file.name;
    var filePath = "LukesStrikeZoneforaudiosaving/" + fileName;
    var fileUrl =
      "https://" + bucketRegion + ".amazonaws.com/my-first-bucket/" + filePath;

    s3.upload(
      {
        Key: filePath,
        Body: file,
        ACL: "public-read",
      },
      function (err, data) {
        if (err) {
          reject("error");
        }
        console.log("Successfully Uploaded!");
      }
    );
  }
}
