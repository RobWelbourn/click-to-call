# Click-to-Call

A simple web application that allows users to make voice calls using Twilio's Voice SDK and Deno Oak server.

## Features
- Click-to-call button for initiating calls
- Twilio Voice SDK integration
- Deno Oak server backend
- Access token generation for Twilio
- Static file serving from `./static` directory

## Getting Started

### Prerequisites
- [Deno](https://deno.land/)
- Twilio account and credentials

### Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/click-to-call.git
   cd click-to-call
   ```
2. Set your environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_API_KEY`
   - `TWILIO_API_SECRET`
   - `TWILIO_APP_SID`
3. Install dependencies:
   ```sh
   deno cache https://deno.land/x/oak/mod.ts
   deno add npm:twilio@^4.0.0
   ```
4. Start the server:
   ```sh
   deno run --allow-net --allow-read --allow-env main.ts
   ```
5. Open your browser and go to `http://localhost:8080`

## License
MIT
