/**
 * @fileoverview A simple Deno/Oak web server to demonstrate click-to-call and the generation 
 * of Twilio Access Tokens.
 * 
 * @see {@link https://www.twilio.com/docs/iam/access-tokens}
 */

import { Application, Router, send } from '@oak/oak';
import Twilio from 'twilio';
import jwt from 'jsonwebtoken'

// Should be the shortest time between generating the token and using it.
const ACCESS_TOKEN_TTL = 2; // Seconds

const AccessToken = Twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioApiKey = Deno.env.get('TWILIO_API_KEY') || '';
const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET') || '';
const outgoingApplicationSid = Deno.env.get('TWILIO_APP_SID') || '';

if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret || !outgoingApplicationSid) {
    console.error(
        'Please set the TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET and TWILIO_APP_SID environment variables.',
    );
    Deno.exit(1);
}

/**
 * Generates a Twilio Access Token for making voice calls.  
 * @param identity The identity of the user for whom the token is being generated.
 * @returns The token as a JWT string.
 */
function generateAccessToken(identity: string): string {
    const voiceGrant = new VoiceGrant({ outgoingApplicationSid });
    const token = new AccessToken(
        twilioAccountSid,
        twilioApiKey,
        twilioApiSecret,
        { identity, ttl: ACCESS_TOKEN_TTL },
    );
    token.addGrant(voiceGrant);
    return token.toJwt();
}

/**
 * Creates a session cookie, in the form of a Twilio Access Token.
 * @param identity The identity of the user for whom the token is being generated.
 * @returns The session cookie.
 */
function createSessionCookie(identity: string): string {
    const token = new AccessToken(
        twilioAccountSid,
        twilioApiKey,
        twilioApiSecret,
        { identity },
    );
    return `session=${token.toJwt()}`;  
}

/**
 * Checks the session cookie to see whether it's valid. The signature must be valid,
 * and the identity must match.
 * @param cookie The session cookie to check.
 * @param identity The user's identity. For anonymous users, this could be the IP address.
 * @returns True if the cookie is valid, false otherwise.
 */
function checkSessionCookie(cookie: string, identity: string): boolean {
    try {
        const decoded = jwt.verify(cookie, twilioApiSecret, { 
            ignoreExpiration: true, // We only care about signature and identity here
        }) as { grants: { identity: string }};
        return decoded.grants.identity === identity;
    } catch (_error) {
        return false;
    }
}

const app = new Application();
const router = new Router();

// Return the home page, along with a session cookie based on the user's IP address.
router.get('/', async (context) => {
    const cookie = createSessionCookie(context.request.ip);
    context.response.headers.set('Set-Cookie', cookie);
    await send(context, 'index.html', {
        root: Deno.cwd(),
    });
});

// Check the session cookie and serve the Access Token.
router.get('/token', (context) => {
    const cookies = context.request.headers.get('Cookie') || '';
    const match = cookies.match(/session=([^;]+)/);

    if (!match || !checkSessionCookie(match[1], context.request.ip)) {
        context.response.status = 401;
        context.response.body = { error: 'Unauthorized' };
        return;
    }

    const token = generateAccessToken(context.request.ip);
    context.response.body = { token };
});

// Serve JavaScript files from the ./static directory
router.get('/static/:path+', async (context) => {
    await send(context, context.request.url.pathname, {
        root: Deno.cwd(),
    });
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log('Server running on http://localhost:8080');
await app.listen({ port: 8080 });
