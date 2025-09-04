
import { Application, Router, send } from "@oak/oak";
import Twilio from 'twilio';

const AccessToken = Twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const twilioApiKey = Deno.env.get('TWILIO_API_KEY') || '';
const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET') || '';
const outgoingApplicationSid = Deno.env.get('TWILIO_APP_SID') || '';

if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret || !outgoingApplicationSid) {
  console.error("Please set the TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET and TWILIO_APP_SID environment variables.");
  Deno.exit(1);
}

function generateAccessToken(identity: string = 'anonymous'): string {
  const voiceGrant = new VoiceGrant({ outgoingApplicationSid });
  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    { identity, ttl: 10 }
  );
  token.addGrant(voiceGrant);
  return token.toJwt();
}

const app = new Application();
const router = new Router();

// Home page
router.get('/', async (context) => {
  await send(context, "index.html", {
    root: Deno.cwd(),
	});
});

// Serve Access Token
router.get('/token', (context) => {
  const token = generateAccessToken();
  context.response.body = { token };
});

// Serve static files from ./static directory
router.get('/static/:path+', async (context) => {
  if (context.request.url.pathname.startsWith('/static/')) {
    await send(context, context.request.url.pathname, {
      root: Deno.cwd(),
    });
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8080");
await app.listen({ port: 8080 });
