/**
 * @fileoverview A simple Deno/Oak web server to demonstrate click-to-call and the generation
 * of Twilio Access Tokens.  The implementation includes rate limiting to prevent abuse and the
 * overloading of the back-end phone system.  It uses cookie-based session management to ensure that
 * access tokens are not misused.
 * 
 * The rate limiter is a fixed-window, in-memory system.  A sliding-window algorithm might be better
 * for evening out the load on the phone system, and a distributed system (e.g. Redis) would be needed 
 * for a multi-server deployment.
 *
 * @see {@link https://www.twilio.com/docs/iam/access-tokens}
 * @see {@link https://github.com/animir/node-rate-limiter-flexible}
 */

import { Application, Router, send } from '@oak/oak';
import Twilio from 'twilio';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const ACCESS_TOKEN_TTL = 2; // Token TTL should be as short as possible
const GLOBAL_CPS_LIMIT = 5; // Global calls per second limit
const PER_IP_DAILY_LIMIT = 10; // Max daily calls per individual IP address

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

const app = new Application({ keys: [twilioApiSecret] }); // keys are used to sign cookies
const router = new Router();

// The global limiter allows up to 5 calls per second across all users.
const globalLimiter = new RateLimiterMemory({
    points: GLOBAL_CPS_LIMIT, 
    duration: 1, // per second 
});

// The per-IP limiter allows up to 10 calls per day per IP address.
const perIPLimiter = new RateLimiterMemory({
    points: PER_IP_DAILY_LIMIT, 
    duration: 60 * 60 * 24, // per day
});

// Return the home page, along with a session cookie based on the user's IP address.
router.get('/', async (context) => {
    await context.cookies.set('session', context.request.ip);
    await send(context, 'index.html', {
        root: Deno.cwd(),
    });
});

// Check the session cookie and serve the Access Token.
router.get('/token', async (context) => {
    const session = await context.cookies.get('session');
    if (session !== context.request.ip) {
        context.response.status = 401;
        context.response.body = { error: "You're not authorized to make calls." };
        return;
    }

    // Apply rate limiting.  Do the individual IP address first to avoid
    // using up the global quota unnecessarily.
    try {
        await perIPLimiter.consume(context.request.ip);
    } catch (_response) {
        context.response.status = 429; 
        context.response.body = { error: "You've made too many calls, please try again tomorrow." };
        return;
    }

    try {
        await globalLimiter.consume('global');
    } catch (_response) {
        context.response.status = 429; 
        context.response.body = { error: "Sorry, we're very busy. Please try again later." };
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