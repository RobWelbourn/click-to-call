# Click-to-Call

A simple web application that allows a user to make in-browser WebRTC calls to a preset phone number,
using Twilio's Voice SDK, Deno, and the [Oak](https://oakserver.org/) web framework.  

The demo web page contains a button that creates a call, and one that ends the call.  

To be useful, the call and end buttons should be placed in a [real web page](https://www.noradsanta.org/).
That is why this example contains no layout or styling whatsoever: it's really about the JavaScript
code you need to embed in your web page, and how you manage calls on the back-end.

## Features

- Buttons for starting and ending calls
- Microphone permission handling
- Twilio Voice SDK integration
- Deno Oak server backend
- Access token generation and session cookie management

## Getting Started

### Prerequisites

- [Deno](https://deno.land/)
- A Twilio account and credentials

### Twilio Configuration

1. Create an [API key](https://console.twilio.com/us1/account/keys-credentials/api-keys). You'll need the key and its corresponding secret to create and sign the access token, as well as your [Account SID](https://console.twilio.com/us1/account/manage-account/general-settings).

2. Create a [TwiML Bin](https://console.twilio.com/?frameUrl=/console/twiml-bins) containing the call instructions.  It should look something like this:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <Response>
      <Dial callerId="+16175551234">+18775556723</Dial>
   </Response>
   ```
   In this example, we're dialing a PSTN number, but you could also call a SIP endpoint, or place the call in a queue for a contact center.  When dialing the PSTN, you must use a Twilio number in your account as your caller id, or else a [Verified Caller Id](https://help.twilio.com/articles/223179848-Using-a-non-Twilio-number-as-the-caller-ID-for-outgoing-calls).

   Copy the TwiML Bin's URL.

3. Create a [TwiML App](https://console.twilio.com/?frameUrl=/console/voice/twiml/apps), using the link to the TwiML Bin as the Request URL.  You can test whether your TwiML Bin works correctly by clicking 'Call using Twilio Client'.  

   Copy the TwiML App SID, which you will need to supply when creating the access token.

### Server Setup

1. Clone the repository, install dependencies, and copy the Twilio SDK into the `./static` asset directory:
   ```sh
   git clone https://github.com/RobWelbourn/click-to-call.git
   cd click-to-call
   deno install
   deno task get-sdk
   ```
2. Set your environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_API_KEY`
   - `TWILIO_API_SECRET`
   - `TWILIO_APP_SID`

3. Start the server:
   ```sh
   deno run -NRE main.ts
   ```
   The N, R and E and flags allow Deno to access the network, read files, and read environvent variables respectively.

4. Open your browser and go to `http://localhost:8080`.  You can verify the creation of access tokens by going to `http://localhost:8080/token`.

## Feature Descriptions

### Call and End buttons

The Call and End buttons both exist simultaneously, but only one of them is active and visible at any one time.  This prevents attempts to initiate multiple overlapping calls.

### Microphone permissions

Microphone permission state may be `granted`, `denied` or `prompt`.  When encountering a new website that wants to use the microphone, the state will be `prompt`, where the user is prompted to grant access to the system's microphone.  To improve the user experience, you should check the microphone permission before attempting to make a call, and that is what the sample code does.  There is an additional possibility, that the system has no microphone available; in this case, we add another state, `notFound`.

See [Working with microphones](https://www.twilio.com/docs/voice/sdks/javascript/best-practices#working-with-microphones-and-getusermedia).

### The Twilio Programmable Voice SDK

The standard advice is to use your platform's package manager to download the Twilio SDK.  To make it easily accessible to the web server, we have provided a script -- a Deno task -- to copy the SDK and the minified SDK into the `./static` directory.  If you wanted to update the SDK from a new release, you would execute the following commands:
```sh
deno update @twilio/voice-sdk
deno task get-sdk
```

### Deno and the Oak web framework

You may wonder why we have chosen Deno and Oak, rather than, say, Node.js and the Express web framework.  The short answer is that Deno is far easier to use than Node.js when your code is written in TypeScript: *it just works*.  And Oak is to Deno what Express is to Node.js.

In any case, your environment may be very different from ours: you may be using a Java or a .Net environment, for example.  The front-end code is indifferent to the back-end, and we leave it as an exercise for the student (or an AI helper) to translate the back-end code into your favorite (or company-mandated) framework.

### Access token generation and session cookie management

Access tokens are short-lived permission slips to make [WebRTC(https://www.twilio.com/en-us/webrtc)] calls through Twilio.  To guard against their misuse, our code requires a session cookie to be presented before issuing the token.  Moreover, the access token should be set to the shortest possible period of time between issuance and being conveyed to Twilio -- somewhere between 2 and 5 seconds, depending on the responsiveness of the web app and network conditions.