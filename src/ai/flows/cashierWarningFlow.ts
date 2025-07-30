
'use server';
/**
 * @fileOverview A flow to generate intelligent warnings for cashiers based on real-time event data.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
    CashierWarningInputSchema, 
    CashierWarningOutputSchema,
    type CashierWarningInput,
    type CashierWarningOutput
} from '@/types';


export async function getCashierWarning(input: CashierWarningInput): Promise<CashierWarningOutput> {
  return cashierWarningFlow(input);
}


const cashierWarningFlow = ai.defineFlow(
  {
    name: 'cashierWarningFlow',
    inputSchema: CashierWarningInputSchema,
    outputSchema: CashierWarningOutputSchema,
  },
  async (input) => {
    
    // Heuristic pre-check: if there's nothing happening, don't bother the AI.
    if (input.pendingDaviplataOrdersCount === 0 && input.activeDaviplataUsersInCompletedState === 0) {
        return { alerta_activa: false, mensaje: "" };
    }

    const prompt = `
        Eres "Molly Alertas", un sistema de IA experto en la gestión de operaciones de eventos.
        Tu misión es analizar datos en tiempo real del evento "Bingo 2025" y generar una alerta ÚNICA, CORTA y CLARA para los cajeros si detectas un posible cuello de botella o congestión.

        **Reglas para generar alertas:**
        1.  **Prioridad en Daviplata:** El mayor riesgo de congestión viene de los padres que reclaman compras de Daviplata. Céntrate en eso.
        2.  **Condiciones para Alerta:** Solo genera una alerta si se cumple AL MENOS UNA de estas condiciones:
            - El número de "Órdenes Pendientes" es 3 o más.
            - El número de "Usuarios con Compra Completa" es 2 o más.
            - El "Tiempo Promedio de Verificación" supera los 3.0 minutos.
        3.  **No Alertar si no hay riesgo:** Si ninguna de las condiciones anteriores se cumple, establece 'alerta_activa' en 'false' y deja el 'mensaje' vacío.
        4.  **Mensaje de Alerta:** Si una alerta es necesaria, debe ser:
            - **Concisa:** No más de una o dos frases.
            - **Accionable:** Decirle al cajero qué está pasando.
            - **Enfocada:** Mencionar el dato más relevante que disparó la alerta.

        **Datos en Tiempo Real:**
        - **Órdenes Daviplata Pendientes de Reclamar:** ${input.pendingDaviplataOrdersCount}
        - **Tiempo Promedio de Verificación (Daviplata):** ${input.avgDaviplataVerificationTime ? `${input.avgDaviplataVerificationTime.toFixed(1)} minutos` : 'N/A'}
        - **Usuarios con Compra Completa (en camino):** ${input.activeDaviplataUsersInCompletedState}
        - **Eficiencia de Cajas (tiempo por venta):** ${input.cashierEfficiency.map(c => `${c.nombre}: ${c.avg_time_seconds.toFixed(0)}s`).join(', ')}

        **Ejemplos de buenos mensajes de alerta:**
        - "Atención: 5 órdenes de Daviplata están en espera. Agilicen la fila de verificación." (se enfoca en las órdenes pendientes)
        - "Posible congestión: 3 padres vienen en camino a reclamar. El tiempo de verificación es de 2.5 minutos." (combina usuarios en camino y tiempo)
        - "Alerta: El tiempo de verificación de Daviplata ha subido a 4.0 minutos. Prioricen esa tarea." (se enfoca en el tiempo)

        **Tu Tarea:**
        Analiza los datos y las reglas. Responde ÚNICAMENTE con el objeto JSON especificado.
    `;
    
    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-1.5-flash-latest',
      output: {
        schema: CashierWarningOutputSchema,
      }
    });

    return llmResponse.output || { alerta_activa: false, mensaje: "" };
  }
);
