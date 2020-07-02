// Initialize instances and variables
let startButton = document.getElementById("start-button");
let output = document.getElementById("output-text");
let waitingPeriodInput = document.getElementById("waiting-period-input");
let waitingPeriod = waitingPeriodInput.value;
let targetPhraseInput = document.getElementById("target-phrase-input");
let dropdown = document.getElementById("language-dropdown");
let languageCode = dropdown[dropdown.selectedIndex].value;
let audioElement = document.getElementById("audio");
let webAudioRecorder;
let totalLexicals = "";
let targetWords = formatTarget(targetPhraseInput.value);

// Formats the target phrase and splits it into an array of words
function formatTarget(target) {
  return target
    .toLowerCase()
    .replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, "")
    .split(" ");
}

// Changes the target phrases based on the input
targetPhraseInput.addEventListener("change", function () {
  targetWords = formatTarget(targetPhraseInput.value);
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
  // Set up the SpeechSDK config
  audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  var speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    "6b19ea6cfaa74e538bdd433daf387108",
    "centralindia"
  );
  speechConfig.speechRecognitionLanguage = languageCode;
  speechConfig.outputFormat = 1;
  var reco = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

  // Setting up callback functions before starting recognition

  var timeoutID;

  // Called when a new word is picked up
  reco.recognizing = function (s, e) {
    // Clear the cancel timeout if words are heard
    clearTimeout(timeoutID);
  };

  // Called when one phrase is finished
  reco.recognized = function (s, e) {
    if (e.result.text.length > 0) {
      output.innerText += "Recognized Phrase: " + e.result.text + "\n";

      // Add each lexical of NBest to an array
      for (const item of JSON.parse(e.result.privJson).NBest) {
        totalLexicals += item.Lexical + " ";
      }

      output.innerText += "Total Lexicals: " + totalLexicals + "\n\n";

      // Check how many of the target words are in the total lexicals
      var matchedWordsCount = 0;
      for (const word of targetWords) {
        if (totalLexicals.indexOf(word) != -1) {
          matchedWordsCount += 1;
        }
      }

      // End recognition if all target words are found
      if (matchedWordsCount == targetWords.length) {
        reco.stopContinuousRecognitionAsync();
        output.innerText += "Done. Target successfully matched";
      } else {
        // Set timeout to stop recognition if no words are heard
        timeoutID = setTimeout(() => {
          reco.stopContinuousRecognitionAsync();
          output.innerText +=
            "Done. No speech heard in the last " + waitingPeriod + "ms\n";
        }, waitingPeriod);
      }
    }
  };

  // Called when recognition has stopped
  reco.sessionStopped = function (s, e) {
    webAudioRecorder.finishRecording();
    startButton.disabled = false;

    // Clear the lexicals for next recognition
    totalLexicals = "";
  };

  // Start recognition
  reco.startContinuousRecognitionAsync();
  output.innerText =
    "Recognition started\nTarget words: " + targetWords + "\n\n";
  startButton.disabled = true;
  audioElement.controls = false;

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
        // s3upload(blob);

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
