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

/**
 * Suppresses specific Twilio error messages (like AccessTokenExpired) from being logged to the console.
 * This helps to reduce noise in the console output.  NOTE: This is not a public API and may change.
 */
function filterTwilioErrorMessages() {
    // Monkey-patch the Twilio.Logger.
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

/**
 * Resets the UI to the initial state, ready to make a new call.
 */
function readyToMakeCall() {
    call = undefined;
    callButton.hidden = false;
    endButton.hidden = true;
    callButton.disabled = false;
}

/**
 * Initiates an outbound call when the "Call" button is clicked.  It disables the button to prevent
 * multiple clicks, makes the call, and sets up event handlers for call events like disconnect, cancel,
 * and error.
 */
async function callButtonHandler() {
    console.log('Call button clicked');
    callButton.disabled = true;

    call = await makeCall();
    if (call) {
        callButton.hidden = true;
        endButton.hidden = false;

        call.on('disconnect', async () => {
            console.log('Call disconnected');
            await device.audio.unsetInputDevice(); // Avoids the appearance that the mic is still in use
            readyToMakeCall();
        });
        
        call.on('cancel', async () => {
            console.log('Call canceled');
            await device.audio.unsetInputDevice(); // Avoids the appearance that the mic is still in use
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

/**
 * Handles the "End" button click event to disconnect the active call and reset the UI.
 */
function endButtonHandler() {
    console.log('End button clicked');
    call.disconnect();
    readyToMakeCall();
}

/**
 * Makes an outbound call using Twilio.Device.  Prior to making a call, it fetches an access token
 * from the server.  If a Device object does not already exist, it creates a new one.
 * @returns {Promise<Twilio.Call | undefined>} The active call if successful, otherwise undefined.
 */
async function makeCall() {
    const result = await fetch('/token');
    if (result.ok) {
        const { token } = await result.json();
        console.log('Got access token');

        try {
            if (device) {
                device.updateToken(token);
            } else {
                device = new Device(token, { codecPreferences: ['opus', 'pcmu'] });
    
                // Suppress AccessTokenExpired errors.
                device.on('error', (error) => {
                    if (error.code === 20104) { 
                        console.log('Access token expired (ignored).');
                    } else {
                        console.error(`Twilio.Device error: ${error.message}`);
                    }
                });
            }
            return device.connect();

        } catch (error) {
            alert(`Could not connect to Twilio: ${error.message}`);
            return undefined;
        }
    } else if (result.status === 401) {
        alert("Sorry, you're not authorized to make calls.")
    } else if (result.status === 403) {
        alert("Sorry, you're on the naughty list and can't make calls.");
    } else if (result.status === 429) {
        alert("Sorry, you've made too many calls. Plaease try again later.");
    } else if (result.status === 503) {
        alert("Sorry, we're very busy right now. Please try again later.");
    } else {
        alert('Sorry, something went wrong. Please try again later.');
    }
    return undefined;
}
