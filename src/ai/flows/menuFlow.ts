'use server';
/**
 * @fileOverview A simple menu flow for Genkit.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const menuFlow = ai.defineFlow(
  {
    name: 'menuFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    return `You said: ${prompt}.`;
  }
);
