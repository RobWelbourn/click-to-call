/**
 * @fileoverview This file contains the client-side logic for a simple click-to-call application using 
 * Twilio's Voice SDK.  It handles user interactions, manages call states, and communicates with the 
 * server to obtain access tokens.
 */

const { Device } = Twilio;

const callButton = document.querySelector('#callButton');
const endButton = document.querySelector('#endButton');
let call = undefined;
let device = undefined;

callButton.addEventListener('click', callButtonHandler);
endButton.addEventListener('click', endButtonHandler);
filterTwilioErrorMessages();

function filterTwilioErrorMessages() {
    const originalFactory = Twilio.Logger.methodFactory;
    Twilio.Logger.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);
        return function (...args) {
            if (args[2] && args[2].code) {
                if (args[2].code === 20104) { // AccessTokenExpired
                    console.log('Access token expired (ignored).'); 
                    return;
                }
            }
            rawMethod(...args);
        };
    };
}

function readyToMakeCall() {
    call = undefined;
    callButton.hidden = false;
    endButton.hidden = true;
    callButton.disabled = false;
}

async function callButtonHandler() {
    console.log('Call button clicked');
    callButton.disabled = true;

    call = await makeCall();
    if (call) {
        callButton.hidden = true;
        endButton.hidden = false;

        call.on('disconnect', async () => {
            console.log('Call disconnected');
            await device.audio.unsetInputDevice();  // Avoids the appearance that the mic is still in use
            readyToMakeCall()
        });

        call.on('cancel', () => {
            console.log('Call canceled');
            readyToMakeCall();
        });

        call.on('error', (error) => {
            alert(`Call failed: ${error.message}`);
            readyToMakeCall();
        });
    } else {
        callButton.disabled = false;
    }
}

function endButtonHandler() {
    console.log('End button clicked');
    try {
        call.disconnect();
    } catch (error) {
        console.error('Error disconnecting the call:', error.message);
    }
    readyToMakeCall();
}

// First, get an access token from the server and create a Device object.
// Then, make an outbound call.
async function makeCall() {
    const result = await fetch('/token');
    if (result.ok) {
        const { token } = await result.json();
        try {
            device = new Device(token, { codecPreferences: ['opus', 'pcmu'] });
            return device.connect();
        } catch (error) {
            alert(`Could not connect to Twilio: ${error.message}`);
            return undefined;
        }
    } else if (result.status === 403) {
        alert("Sorry, you're on the naughty list and can't make calls.");
    } else if (result.status === 429) {
        alert("Sorry, you've made too many calls. Plaease try again later.");
    } else if (result.status === 503) {
        alert("Sorry, we're very busy right now. Please try again later.");
    } else {
        alert("Sorry, something went wrong. Please try again later.");
    }
    return undefined;
}
