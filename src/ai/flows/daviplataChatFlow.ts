
'use server';
/**
 * @fileOverview A chatbot flow for the Daviplata page to assist parents.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
    DaviplataChatInputSchema, 
    DaviplataChatOutputSchema,
    type DaviplataChatInput,
    type DaviplataChatOutput
} from '@/types';
import { createClient } from '@supabase/supabase-js';

const saveToDb = async (
    sessionId: string, 
    sender: 'user' | 'ai' | 'admin', 
    message: string, 
    clientInfo?: {document?: string, phone?: string},
    videoDataUri?: string | null
) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error("Supabase client for chat logging cannot be initialized.");
        return;
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    try {
        const { error } = await supabaseAdmin
            .from('conversaciones_daviplata')
            .insert({
                session_id: sessionId,
                sender: sender,
                message: message,
                documento_cliente: clientInfo?.document,
                daviplata_cliente: clientInfo?.phone,
                video_data_uri: videoDataUri
            });
        if (error) throw error;
    } catch(e) {
        console.error("Failed to save chat message to DB", e);
    }
}


export async function daviplataChat(input: DaviplataChatInput): Promise<DaviplataChatOutput> {
  return daviplataChatFlow(input);
}


const daviplataChatFlow = ai.defineFlow(
  {
    name: 'daviplataChatFlow',
    inputSchema: DaviplataChatInputSchema,
    outputSchema: DaviplataChatOutputSchema,
  },
  async ({ question, history, sessionId, clientInfo }) => {
    
    await saveToDb(sessionId, 'user', question, clientInfo);

    const llmResponse = await ai.generate({
      prompt: `
        Eres "Molly Colgemelli", un asistente de IA amigable y servicial para la aplicación "Ventas Bingo 2025". 
        Tu única función es ayudar a los padres de familia a usar la página de autogestión de compras y resolver dudas sobre el evento.

        **TU CONTEXTO Y CONOCIMIENTO:**

        **1. Sobre la plataforma de autogestión:**
        - El objetivo de la página es permitir a los padres comprar productos por adelantado usando Daviplata.
        - Para comprar, deben: 1. Seleccionar productos. 2. Llenar su documento y número de Daviplata. 3. Hacer clic en "Continuar al Pago".
        - En la pantalla de pago, se les muestra un CÓDIGO QR y el número de Daviplata del colegio ('320 676 6574'). Deben pagar el monto exacto.
        - Después de pagar, deben hacer clic en "¡Listo, ya pagué!". Esto genera un CÓDIGO DE REFERENCIA de 6 dígitos y un QR de verificación.
        - Con ese código o QR, deben ir a una caja del evento para reclamar sus productos/vales.
        - Si un producto está marcado como "AGOTADO", no se puede comprar.
        - Pueden consultar sus compras anteriores con su número de documento. Si una compra está 'pendiente', pueden editarla.

        **2. INFORMACIÓN OFICIAL DEL BINGO 2025 (Fuente: colgemelli.edu.co/bingo2025):**
        - **Fecha y Lugar:** Viernes 02 de agosto a las 6:00 p.m. en el Hall Central del Colegio.
        - **Costo del Cartón:** $25.000 (Veinticinco mil pesos).
        - **Premios Principales:**
            - Gran Premio: $5.000.000 (Cinco millones de pesos).
            - Secundario: $2.000.000 (Dos millones de pesos).
            - Otros premios y sorpresas.
        - **Condiciones:**
            - El cartón es válido para los dos sorteos principales.
            - El ganador debe estar presente para reclamar el premio.
            - Los premios no se cambian por dinero.
        - **Propósito:** Recaudar fondos para el mantenimiento y mejora de la planta física del colegio.
        
        **3. Información del Cliente Actual:**
        - **Documento:** ${clientInfo?.document || "No proporcionado"}
        - **Teléfono:** ${clientInfo?.phone || "No proporcionado"}

        **4. Funcionalidades Especiales:**
         - Si el usuario pregunta "cómo pago", "muéstrame un video", "cómo es el proceso", "explícame los pasos" o algo similar, INDICA que el proceso es sencillo y explícalo en 3 pasos simples.

        **REGLAS ESTRICTAS DE RESPUESTA:**
        1.  **NO PROPORCIONES INFORMACIÓN ADMINISTRATIVA:** NUNCA respondas preguntas sobre:
            - Cuánto dinero se ha recaudado.
            - Cuántos productos se han vendido.
            - Qué producto se vende más o menos.
            - Rendimiento de los cajeros.
            - Cualquier tipo de estadística o dato agregado.
            Si te preguntan algo así, responde amablemente que no tienes acceso a esa información. Ejemplo: "No tengo acceso a los datos de ventas, pero puedo ayudarte a realizar tu compra o resolver dudas sobre el evento."
        2.  **SÉ CONCISA Y DIRECTA:** Responde en frases cortas y claras. Usa un lenguaje sencillo.
        3.  **MANTÉN EL CONTEXTO:** Usa el historial de chat para entender la conversación. Si un administrador interviene (sender: 'admin'), su respuesta es la verdad absoluta y debes basar tus futuras respuestas en ella.
        4.  **SÉ AMABLE Y POSITIVA:** Mantén un tono de ayuda en todo momento.

        **Historial de la Conversación:**
        ${history.map(h => {
          if (h.sender === 'user') return `Padre: ${h.message}`;
          if (h.sender === 'admin') return `Admin: ${h.message}`;
          return `Molly: ${h.message}`;
        }).join('\n')}

        **Nueva Pregunta del Padre:**
        ${question}

        **Tu Respuesta (Molly):**
      `,
      model: 'googleai/gemini-1.5-flash-latest',
      output: {
          format: 'text'
      }
    });

    const answer = llmResponse.text || "No pude procesar tu solicitud en este momento.";
    
    await saveToDb(sessionId, 'ai', answer, clientInfo);
    
    return { answer };
  }
);

    