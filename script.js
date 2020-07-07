// Initialize instances and variables
let startButton = document.getElementById("start-button");
let output = document.getElementById("output-text");
let waitingPeriodInput = document.getElementById("waiting-period-input");
let waitingPeriod = waitingPeriodInput.value;
let dropdown = document.getElementById("language-dropdown");
let languageCode = dropdown[dropdown.selectedIndex].value;
let audioElement = document.getElementById("audio");
let webAudioRecorder;

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
  // Initialize variables local to each recognition session
  let targetArrays = [["je suis capable"], ["je veux artiste"]];
  let totalITN = "";
  let cuttableTargetArrays = JSON.parse(JSON.stringify(targetArrays));
  let match = null;
  let masterTimer = setTimeout(() => {
    stopSession();
  }, 120000);

  // Set up the SpeechSDK config
  let audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  let speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    "90880843d02c4a43a84e8979afb0df38",
    "centralus"
  );
  speechConfig.speechRecognitionLanguage = languageCode;
  speechConfig.outputFormat = 1;
  let recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

  // // // Add words to phrase list so they are more easily recognized
  // let phraseListGrammar = SpeechSDK.PhraseListGrammar.fromRecognizer(
  //   recognizer
  // );
  // for (const targetArray of targetArrays) {
  //   for (const targetPhrase of targetArray) {
  //     phraseListGrammar.addPhrase(targetPhrase);
  //   }
  // }

  // Setting up callback functions before starting recognition

  let timeoutID;

  // Called when a new word is picked up
  recognizer.recognizing = function (s, e) {
    // Quick match if recognized text contains a target phrase
    for (a = 0; a < targetArrays.length; a++) {
      for (i = 0; i < targetArrays[a].length; i++) {
        if (e.result.text.includes(targetArrays[a][i] + " ")) {
          if (!match) {
            match = {
              arrayIndex: a,
              index: i,
              word: e.result.text,
            };
            console.log("Quick Match!");
          }
          stopSession();
        }
      }
    }

    // Clear the cancel timeout if words are heard
    clearTimeout(timeoutID);
  };

  // Called when one phrase is finished
  recognizer.recognized = function (s, e) {
    if (e.result.text.length > 0) {
      // Loop through the array of target arrays
      for (a = 0; a < targetArrays.length; a++) {
        // Loop through the array of target phrases
        for (i = 0; i < targetArrays[a].length; i++) {
          // Loop through each item of NBest
          for (const item of JSON.parse(e.result.privJson).NBest) {
            output.innerText += "Recognized ITN: " + item.ITN + "\n";

            // If the phrase includes the ITN...
            if (cuttableTargetArrays[a][i].includes(item.ITN)) {
              // ...then remove the ITN from the phrase
              cuttableTargetArrays[a][i] = cuttableTargetArrays[a][i].replace(
                item.ITN,
                ""
              );
              console.log("Cut down to", cuttableTargetArrays[a][i]);
            }

            // If the phrase is completely removed or the ITN contains the phrase then match
            if (
              cuttableTargetArrays[a][i].trim().length == 0 ||
              item.ITN.includes(cuttableTargetArrays[a][i].trim() + " ")
            ) {
              match = {
                arrayIndex: a,
                index: i,
                word: targetArrays[a][i],
              };
              console.log("Cut Match!");
              stopSession();
            }
          }

          // // Add each ITN of NBest to a string
          // for (const item of JSON.parse(e.result.privJson).NBest) {
          //   totalITN += " " + item.ITN + " ";
          //   output.innerText += "Recognized ITN: " + item.ITN + "\n";
          // }

          // // Make an array of each word in the phrase
          // const targetPhrase = targetArrays[a][i];
          // let targetWords = targetPhrase
          //   .toLowerCase()
          //   .split(" ")
          //   .map((item) => (item = " " + item + " "));

          // // Check if the total ITN contains any unmatched words
          // for (const word of targetWords) {
          //   if (totalITN.includes(word)) {
          //     console.log(word + " matches");
          //     if (!matchedWords.includes(word)) {
          //       matchedWords.push(word);
          //     }
          //   }
          // }

          // // Remove any matched words from the target array
          // for (const word of matchedWords) {
          //   if (targetWords.includes(word)) {
          //     targetWords.splice(targetWords.indexOf(word), 1);
          //   }
          // }

          // console.log("match", matchedWords);
          // console.log("target", targetWords);

          // // End recognition if all target words are found
          // if (targetWords.length == 0) {
          //   // If there are no matches yet, set the match
          //   if (!match) {
          //     match = {
          //       arrayIndex: a,
          //       index: i,
          //       word: targetPhrase,
          //     };
          //     console.log("Match!");
          //   }
          //   stopSession();
          // }
        }
      }
    }

    // // Clear total ITN
    // totalITN = "";

    // Set timeout to stop recognition if there is no match
    if (!match) {
      timeoutID = setTimeout(() => {
        stopSession();
        output.innerText +=
          "\nDone. Didn't recognize speech for " + waitingPeriod + "ms\n";
      }, waitingPeriod);
    }
  };

  // To be called to stop the session
  function stopSession() {
    clearTimeout(masterTimer);
    recognizer.stopContinuousRecognitionAsync();
    recognizer.close();
    webAudioRecorder.finishRecording();
    startButton.disabled = false;
    // phraseListGrammar.clear();
    if (match) {
      output.innerText +=
        "\nMatch found! " +
        "Array index: " +
        match.arrayIndex +
        ", Phrase index: " +
        match.index +
        ", Phrase: " +
        match.word +
        "\n";
    }
  }

  // Start recognition
  recognizer.startContinuousRecognitionAsync();
  output.innerText =
    "Recognition started\nTarget words: " + targetArrays + "\n\n";
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
          timeLimit: 60,
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

// Generate UUID
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initialize AWS configuration
let bucketName = "nfscratch";
let bucketRegion = "us-east-1";
let IdentityPoolId = "us-east-1:3efbe2a5-c38f-433a-8720-37b7b5f61a7d";

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId,
  }),
});

let s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: bucketName },
});

// Upload to S3
function s3upload(file) {
  if (file) {
    let fileName = file.name;
    let filePath = "LukesStrikeZoneforaudiosaving/" + fileName;

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
