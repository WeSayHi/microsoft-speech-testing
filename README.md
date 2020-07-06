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

Get the target arrays from currentICObject in your code. An example of target arrays is...

```
let targetArrays = [["je suis professeur", "je suis professeure"], ["professeur", "professeure", "fais", "fait", "sœur", "fasse"]];
```

```
 // Initialize variables local to each recognition session
  var matchedWords = [];
  var totalITN = "";
  var match = null;
  var waitingPeriod = 3000 // or what Michiyo and Nate find is best when testing
  var languageCode = "fr-FR" // or the language to recognize from

  // Set up the SpeechSDK config
  var audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
  var speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    "90880843d02c4a43a84e8979afb0df38",
    "centralus"
  );
  speechConfig.speechRecognitionLanguage = languageCode;
  speechConfig.outputFormat = 1;
  var recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

  // Setting up callback functions before starting recognition

  var timeoutID;

  // Called when a new word is picked up
  recognizer.recognizing = function (s, e) {
    // Clear the cancel timeout if words are heard
    clearTimeout(timeoutID);
  };

  // Called when one phrase is finished
  recognizer.recognized = function (s, e) {
    if (e.result.text.length > 0) {
      // Add each ITN of NBest to a string
      for (const item of JSON.parse(e.result.privJson).NBest) {
        totalITN += " " + item.ITN + " ";
      }

      // Loop through the array of target arrays
      for (a = 0; a < targetArrays.length; a++) {
        // Loop through the array of target phrases
        for (i = 0; i < targetArrays[a].length; i++) {
          // Make an array of each word in the phrase
          const targetPhrase = targetArrays[a][i];
          var targetWords = targetPhrase
            .toLowerCase()
            .split(" ")
            .map((item) => (item = " " + item + " "));

          // Check if the total ITN contains any unmatched words
          for (const word of targetWords) {
            console.log(totalITN);
            if (totalITN.includes(word)) {
              console.log(word + " matches");
              if (!matchedWords.includes(word)) {
                matchedWords.push(word);
              }
            }
          }

          // Remove any matched words from the target array
          for (const word of matchedWords) {
            console.log("splicing " + word + " from " + targetWords);
            if (targetWords.includes(word)) {
              targetWords.splice(targetWords.indexOf(word), 1);
            }
          }

          console.log("match", matchedWords);
          console.log("target", targetWords + a + i);

          // End recognition if all target words are found
          if (targetWords.length == 0) {
            // If there are no matches yet, set the match
            if (!match) {
              match = {
                arrayIndex: a,
                index: i,
                word: targetPhrase,
              };
              console.log("Match!");
            }
            console.log("Already matched");

          stopSession();
          }
        }
      }
    }

    // Clear total ITN
    totalITN = "";

    // Set timeout to stop recognition if no words are heard
    if (!match) {
      timeoutID = setTimeout(() => {
          stopSession();
      }, waitingPeriod);
    }
  };

  // To be called to stop the session
  function stopSession() {
    recognizer.stopContinuousRecognitionAsync();
    recognizer.close();
    startButton.disabled = false;
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
  startButton.disabled = true;
  audioElement.controls = false;

```

Next, rewrite the matchNUpdate function so that it can take in information from the match variable (you will be able to remove all the matching logic already in matchNUpdate because the matching logic is done in the above code)
