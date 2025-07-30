import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize the Google AI plugin unconditionally.
// Genkit will handle the API key from the environment variables when a call is made.
// This is more robust than conditionally loading the plugin.
const plugins: GenkitPlugin[] = [googleAI()];

export const ai = genkit({
  plugins,
});
