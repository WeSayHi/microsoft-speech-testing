// Initialize instances and variables
const startButton = document.getElementById("start-button");
const output = document.getElementById("output-text");
const waitingPeriodInput = document.getElementById("waiting-period-input");
let waitingPeriod = waitingPeriodInput.value;
const dropdown = document.getElementById("language-dropdown");
let languageCode = dropdown[dropdown.selectedIndex].value;
const audioElement = document.getElementById("audio");
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
  let targetArrays = [
    ["soy responsable quiero viajar", "soy responsables quiero viajar"],
  ];
  const originalTargetArrays = JSON.parse(JSON.stringify(targetArrays));
  let match = null;
  const masterTimer = setTimeout(() => {
    stopSession();
  }, 120000);

  // Set up the SpeechSDK config
  const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    "90880843d02c4a43a84e8979afb0df38",
    "centralus"
  );
  speechConfig.speechRecognitionLanguage = languageCode;
  speechConfig.outputFormat = 1;
  const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

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
        if (e.result.text == targetArrays[a][i]) {
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
      // Log each ITN
      for (const item of JSON.parse(e.result.privJson).NBest) {
        output.innerText += "Recognized ITN: " + item.ITN + "\n";
      }

      // Loop through the array of target arrays
      for (a = 0; a < targetArrays.length; a++) {
        // Loop through the array of target phrases
        for (i = 0; i < targetArrays[a].length; i++) {
          // Initialize variables local to the phrase
          const targetPhrase = targetArrays[a][i].toLowerCase().trim();
          const targetWords = targetPhrase.split(" ");
          let missingPhrases = [];

          // Loop through the NBest array
          for (const item of JSON.parse(e.result.privJson).NBest) {
            let missingPhrase = "";
            let ITN = item.ITN;

            // Match out if the ITN contains the target phrase
            if (ITN.includes(targetPhrase)) {
              match = {
                arrayIndex: a,
                index: i,
                word: originalTargetArrays[a][i],
              };
              stopSession();
            } else {
              // Loop through the target words array
              for (const word of targetWords) {
                // If the ITN does not contain the target word, add it to the missing phrase
                if (!ITN.includes(word)) {
                  missingPhrase += word + " ";
                  console.log(ITN);
                }
              }

              // If there is a missing phrase, add it to the missing phrases array
              if (missingPhrase.length > 0) {
                missingPhrases.push(missingPhrase.trim());
              }
            }
          }

          // Match out if there are no missing phrases
          if (missingPhrases.length == 0 || missingPhrases.length != 5) {
            match = {
              arrayIndex: a,
              index: i,
              word: originalTargetArrays[a][i],
            };
            stopSession();
          }

          // Find the words common in all of the missing phrases
          let set = {};
          missingPhrases.forEach(function (a, i) {
            var tokens = a.match(/\w+/g);
            if (!i) {
              tokens.forEach(function (t) {
                set[t] = 1;
              });
            } else {
              for (const k in set) {
                if (tokens.indexOf(k) < 0) delete set[k];
              }
            }
          });
          const newTargetWords = Object.keys(set);

          console.log("Missing phrases", missingPhrases);
          console.log("Common missing", newTargetWords);

          // Update the phrase so that it is a string of only the words not yet found
          targetArrays[a][i] = "";
          for (const word of newTargetWords) {
            targetArrays[a][i] += word + " ";
          }
        }
      }
    }

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
    // webAudioRecorder.finishRecording();
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

  //   // Record the sound on a sepereate stream ndoe
  //   navigator.mediaDevices
  //     .getUserMedia({ audio: true, video: false })
  //     .then((stream) => {
  //       getUserMediaStream = stream;
  //       const AudioContext = window.AudioContext || window.webkitAudioContext;
  //       const audioContext = new AudioContext();
  //       const source = audioContext.createMediaStreamSource(stream);

  //       webAudioRecorder = new WebAudioRecorder(source, {
  //         workerDir: "web_audio_recorder_js/",
  //         numChannels: 1,
  //         encoding: "ogg",
  //         options: {
  //           timeLimit: 60,
  //           encodeAfterRecord: true,
  //           ogg: { quality: 0.5 },
  //         },
  //       });

  //       // Called when the recording has finished
  //       webAudioRecorder.onComplete = (webAudioRecorder, blob) => {
  //         // Prepare and upload the file to AWS S3
  //         blob.name = uuid() + ".ogg";
  //         // s3upload(blob);

  //         const audioElementSource = window.URL.createObjectURL(blob);
  //         audioElement.src = audioElementSource;
  //         audioElement.controls = true;
  //       };

  //       webAudioRecorder.onError = (webAudioRecorder, err) => {
  //         console.error(err);
  //       };

  //       webAudioRecorder.startRecording();
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //     });
  // });

  // // Generate UUID
  // function uuid() {
  //   return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
  //     let r = (Math.random() * 16) | 0,
  //       v = c == "x" ? r : (r & 0x3) | 0x8;
  //     return v.toString(16);
  //   });
  // }

  // // Initialize AWS configuration
  // let bucketName = "nfscratch";
  // let bucketRegion = "us-east-1";
  // let IdentityPoolId = "us-east-1:3efbe2a5-c38f-433a-8720-37b7b5f61a7d";

  // AWS.config.update({
  //   region: bucketRegion,
  //   credentials: new AWS.CognitoIdentityCredentials({
  //     IdentityPoolId: IdentityPoolId,
  //   }),
  // });

  // const s3 = new AWS.S3({
  //   apiVersion: "2006-03-01",
  //   params: { Bucket: bucketName },
  // });

  // // Upload to S3
  // function s3upload(file) {
  //   if (file) {
  //     const fileName = file.name;
  //     const filePath = "LukesStrikeZoneforaudiosaving/" + fileName;

  //     s3.upload(
  //       {
  //         Key: filePath,
  //         Body: file,
  //         ACL: "public-read",
  //       },
  //       function (err, data) {
  //         if (err) {
  //           reject("error");
  //         }
  //         console.log("Successfully Uploaded!");
  //       }
  //     );
  //   }
  // }
});
