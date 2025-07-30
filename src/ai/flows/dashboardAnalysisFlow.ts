
'use server';
/**
 * @fileOverview A flow for analyzing dashboard data for a Bingo event.
 * This flow takes comprehensive sales data and a user question (optional)
 * to generate a strategic report or answer a specific query.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { 
    DashboardAnalysisInputSchema, 
    DashboardAnalysisOutputSchema,
    type DashboardAnalysisInput,
    type DashboardAnalysisOutput
} from '@/types';


export async function getDashboardAnalysis(input: DashboardAnalysisInput): Promise<DashboardAnalysisOutput> {
  return dashboardAnalysisFlow(input);
}


const dashboardAnalysisFlow = ai.defineFlow(
  {
    name: 'dashboardAnalysisFlow',
    inputSchema: DashboardAnalysisInputSchema,
    outputSchema: DashboardAnalysisOutputSchema,
  },
  async (input) => {
    
    const promptContext = `
        Eres un analista de datos experto en la gestión de eventos y puntos de venta. Tu tarea es analizar los siguientes datos de ventas de un evento de bingo y responder a la pregunta del usuario, o proporcionar un informe estratégico si no hay una pregunta específica.

        **Datos del Evento "Bingo 2025":**
        - **Recaudación Neta Total:** ${input.generalData.total_revenue}
        - **Recaudación en Efectivo (Neto):** ${input.generalData.total_efectivo}
        - **Recaudación en Daviplata:** ${input.generalData.total_daviplata}
        - **Número Total de Transacciones:** ${input.generalData.total_sales}
        - **Monto Total en Devoluciones:** ${input.generalData.total_returns}
        - **Ventas por Punto de Venta (Caja):**
        ${input.generalData.sales_by_cajero.map(c => `  - ${c.nombre}: ${c.total} recaudado`).join('\n')}
        - **Rendimiento de Artículos (Individual):**
        ${input.articleSales.map(a => `  - ${a.nombre}: ${a.total_vendido} unidades vendidas, ${a.recaudo_total} recaudado`).join('\n')}
        - **Historial de Ventas Recientes (últimas 5):**
        ${input.allSales.slice(0, 5).map(s => `  - Venta ID ${s.id}: ${s.subtotal} (${s.detalles.map(d => `${d.cantidad}x ${d.nombre_producto}`).join(', ')})`).join('\n')}
        - **Historial de Devoluciones Recientes (últimas 5):**
        ${input.returns.slice(0, 5).map(r => `  - Devolución ID ${r.id}: ${r.cantidad}x ${r.producto_nombre}, Monto: ${r.monto_devolucion}`).join('\n')}
    `;

    const promptInstruction = input.question 
        ? `Basado en los datos proporcionados, responde la siguiente pregunta de forma clara y concisa en formato Markdown: "${input.question}"`
        : `
            **Análisis Estratégico Requerido:**

            **1. Resumen Ejecutivo:**
               - Un párrafo conciso con los KPIs más importantes: recaudación neta, producto estrella, y el punto de venta con mayor rendimiento.

            **2. Análisis de Rendimiento de Productos:**
               - **Producto Estrella:** Identifica el artículo con mayor recaudación y el más vendido en unidades. Explica por qué podría ser tan popular.
               - **Productos de Bajo Rendimiento:** Señala 1 o 2 artículos que no se están vendiendo bien.
               - **Concentración de Ventas:** ¿Las ventas están concentradas en unos pocos productos o distribuidas? Comenta sobre la dependencia en los productos estrella.
               - **Promociones:** Analiza si los artículos de tipo "promoción" están teniendo un impacto significativo en el total recaudado.

            **3. Análisis de Puntos de Venta (Cajas):**
               - **Rendimiento Comparativo:** Compara el rendimiento de las diferentes cajas. ¿Hay alguna que destaque o se quede atrás? ¿A qué podría deberse?
               - **Eficiencia:** Calcula el valor promedio por transacción para las cajas con más ventas.

            **4. Análisis de Métodos de Pago y Devoluciones:**
               - **Tendencias de Pago:** Compara el uso de Efectivo vs. Daviplata. ¿Hay alguna preferencia clara?
               - **Impacto de las Devoluciones:** Analiza el monto total de devoluciones en relación con la recaudación total. ¿Es un valor preocupante? ¿Hay algún producto que se devuelva con frecuencia (basado en el historial)?

            **5. Observaciones Clave y Correlaciones:**
               - Menciona cualquier patrón interesante o correlación que observes. Por ejemplo: ¿Ciertos productos se venden más en una caja específica? ¿Las devoluciones están asociadas a un cajero o producto en particular?

            **6. Recomendaciones Estratégicas:**
               - Ofrece 2-3 recomendaciones **accionables y concretas** basadas en tu análisis. Por ejemplo: "Considerar un combo con el producto X de bajo rendimiento", "Reforzar la caja Y en horas pico", "Promocionar más el pago con Daviplata si agiliza las filas".

            Formatea tu respuesta exclusivamente en Markdown, usando títulos, listas y negritas para una fácil lectura.
        `;

    const finalPrompt = promptContext + '\n' + promptInstruction;

    const llmResponse = await ai.generate({
      prompt: finalPrompt,
      model: 'googleai/gemini-1.5-flash-latest',
      output: {
          format: 'text'
      }
    });

    return llmResponse.text || "No se pudo obtener una respuesta del modelo de IA.";
  }
);
