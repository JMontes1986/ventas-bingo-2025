import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize the Google AI plugin with an explicit API key.
// The key is read from the environment to avoid hardcoding secrets.
const plugins: GenkitPlugin[] = [
  googleAI({ apiKey: process.env.GOOGLE_API_KEY })
];

export const ai = genkit({
  plugins,
});
