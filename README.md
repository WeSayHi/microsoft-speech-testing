# Azure STT Testing

To test out the improved STT, run index.js (you can run with Live Server in VSCode)

## Implementation into existing site

### Install Dependencies:

First, install web-audio-recorder-js with...

```
npm install web-audio-recorder-js
```

and reference in the code with...

```
const SpeechSDK = require("web-audio-recorder-js")
```

or...

```
import SpeechSDK from "web-audio-recorder-js"
```

Next, install the speech SDK with...

```
npm install microsoft-cognitiveservices-speech-sdk
```

and reference in the code with...

```
const SpeechSDK = require("microsoft-cognitiveservices-speech-sdk")
```

or...

```
import SpeechSDK from "microsoft-cognitiveservices-speech-sdk"
```

### Rewrite Functions:

Use this code in the function listenToTheUser in webapp/src/containers/auth/practice/index.js. The final output will be the match variable which will be null when there are no matches or will contain an object consisting of arrayIndex (index of the array that the word/phrase is in), index (index of the word/phrase inside that array), and word (the word/phrase string)

You can get the target arrays from currentICObject in your code

```
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
                }
              }

              // If there is a missing phrase, add it to the missing phrases array
              if (missingPhrase.length > 0) {
                missingPhrases.push(missingPhrase.trim());
              }
            }
          }

          // Match out if there are not 5 missing phrases (meaning one ITN has no missing words)
          if (missingPhrases.length != 5) {
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
            let tokens = a.match(/\w+/g);
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
      }, waitingPeriod);
    }
  };

  // To be called to stop the session
  function stopSession() {
    clearTimeout(masterTimer);
    recognizer.stopContinuousRecognitionAsync();
    recognizer.close();
  }

  // Start recognition
  recognizer.startContinuousRecognitionAsync();

```

Next, rewrite the matchNUpdate function so that it can take in information from the match variable (you will be able to remove all the matching logic already in matchNUpdate because the matching logic is done in the above code)
