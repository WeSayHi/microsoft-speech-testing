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
  let targetArrays = [["je suis capable"], ["je veux artiste"]];
  let cuttableTargetArrays = JSON.parse(JSON.stringify(targetArrays));
  let match = null;
  let waitingPeriod = 2000 // 2000ms possibly subject to change
  let languageCode = "fr-FR"
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

            // If the phrase includes the ITN...
            if (cuttableTargetArrays[a][i].includes(item.ITN)) {
              // ...then remove the ITN from the phrase
              cuttableTargetArrays[a][i] = cuttableTargetArrays[a][i].replace(
                item.ITN,
                ""
              );
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
        }
      }
    }

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
