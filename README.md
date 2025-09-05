# Click-to-Call

A simple web application that allows a user to make in-browser WebRTC calls to a preset phone number,
using Twilio's Voice SDK, Deno, and the [Oak](https://oakserver.org/) web framework.  

The demo web page contains a button that creates a call, and one that ends the call.  

To be useful, the call and end buttons should be placed in a [real web page](https://www.noradsanta.org/).
That is why this example contains no layout or styling whatsoever: it's really about the JavaScript
code you need to embed in your web page, and how you manage calls on the back-end.

## Features

- Buttons for starting and ending calls
- Twilio Voice SDK integration
- Deno Oak server backend
- Access token generation

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
