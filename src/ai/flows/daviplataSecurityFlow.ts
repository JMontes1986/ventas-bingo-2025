
'use server';
/**
 * @fileOverview A security flow to analyze Daviplata orders for potential fraud.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
    DaviplatOrderSecurityInputSchema, 
    DaviplatOrderSecurityOutputSchema,
    type DaviplatOrderSecurityInput,
    type DaviplatOrderSecurityOutput
} from '@/types';


export async function daviplataSecurityCheck(input: DaviplatOrderSecurityInput): Promise<DaviplatOrderSecurityOutput> {
  return daviplataSecurityFlow(input);
}


const daviplataSecurityFlow = ai.defineFlow(
  {
    name: 'daviplataSecurityFlow',
    inputSchema: DaviplatOrderSecurityInputSchema,
    outputSchema: DaviplatOrderSecurityOutputSchema,
  },
  async (input) => {
    
    // First, basic server-side validation for immediate rejection
    if (input.total <= 0) {
        return { es_segura: false, motivo: "El total de la orden no puede ser cero o negativo." };
    }
    if (input.total > 500000) {
        return { es_segura: false, motivo: `El total de la orden (${input.total}) excede el límite de seguridad de 500,000 COP.` };
    }
    
    const prompt = `
        Eres "Molly Colgemelli", un sistema de IA experto en seguridad de transacciones para eventos escolares.
        Analiza la siguiente orden de compra realizada para el evento "Bingo 2025" y determina si es segura o potencialmente fraudulenta.

        **Contexto Clave:**
        - Las transacciones pueden provenir de dos fuentes: un **cajero** (en el punto de venta) o un **padre de familia** (a través de la app de Daviplata).
        - **Ventas de Cajero:** No se proporciona información del cliente (documento, teléfono). Esto es normal.
        - **Órdenes de Daviplata:** Se debe proporcionar el documento y el número de Daviplata del cliente.

        **Reglas de Seguridad:**
        1.  **Montos Excesivos:** Cualquier orden individual que supere los 500,000 COP es automáticamente sospechosa.
        2.  **Cantidades Anormales:** Cantidades de un mismo artículo superiores a 20 unidades son inusuales para un evento escolar. (Esta regla es menos estricta, solo una observación).
        3.  **Patrones Extraños:** Revisa si el monto total parece ilógico para una familia o individuo en un bingo.
        4.  **Información del Cliente (Solo para Daviplata):** Si la orden parece ser de Daviplata (contiene info de cliente) y falta alguno de los datos (documento o teléfono), aumenta la vigilancia. PERO, si NO hay información del cliente en absoluto, asume que es una venta de cajero y NO la rechaces por este motivo.

        **Datos de la Orden:**
        - **Total de la Orden:** ${input.total} COP
        - **Documento Cliente:** ${input.clientInfo?.document || 'No proporcionado (asumir venta de cajero)'}
        - **Daviplata Cliente:** ${input.clientInfo?.phone || 'No proporcionado (asumir venta de cajero)'}
       
        **Tu Tarea:**
        Basado en los datos y las reglas, responde únicamente con el formato JSON especificado.
        - Si la transacción parece legítima y segura, establece 'es_segura' en true.
        - Si detectas cualquier anomalía según las reglas, establece 'es_segura' en false y proporciona un 'motivo' claro y conciso.
    `;
    
    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash-latest',
      output: {
        schema: DaviplatOrderSecurityOutputSchema,
      }
    });

    return llmResponse.output || { es_segura: false, motivo: "No se pudo obtener una respuesta del modelo de IA." };
  }
);

