
'use server';

import type { Cajero, Article, SaleData, ArticleFormData, ReturnFormData, VentaConDetalles, DashboardData, ArticleSale, ReturnDetail, AuditLog, ArticleSaleDetail, DashboardAnalysisInput, CajeroFormData, DaviplataOrder, DaviplataOrderDetail, DaviplataConversation, ActiveDaviplataUsers, CashierWarningInput, CashierWarningOutput } from '@/types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { daviplataSecurityCheck } from '@/ai/flows/daviplataSecurityFlow';
import { daviplataChat } from '@/ai/flows/daviplataChatFlow';
import { getDashboardAnalysis as getDashboardAnalysisFlow } from '@/ai/flows/dashboardAnalysisFlow';
import { getCashierWarning as getCashierWarningFlow } from '@/ai/flows/cashierWarningFlow';
import { unstable_noStore as noStore } from 'next/cache';
import { ai } from '@/ai/genkit';
import * as bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Cliente de Supabase para operaciones del lado del cliente o públicas
// Se inicializa solo si existen las variables necesarias; de lo contrario será null
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Función para crear el cliente de admin de forma segura BAJO DEMANDA
function createAdminClient(): {
  supabaseAdmin: SupabaseClient | null;
  error: string | null;
} {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_ROLE_KEY;

  if (!supabaseUrl) {
    return {
      supabaseAdmin: null,
      error: 'Supabase URL no está configurada.',
    };
  }

 if (!serviceRoleKey) {
    return {
      supabaseAdmin: null,
      error: 'Supabase service role key no está configurada.',
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return { supabaseAdmin, error: null };
  }
// --- DIAGNOSTIC ACTION ---
export async function runDiagnostics(): Promise<Record<string, {success: boolean, message: string, data?: any}>> {
    const results: Record<string, {success: boolean, message: string, data?: any}> = {};

    try {
        // 1. Check Environment Variables
        results.envVars = {
           success:
                !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
                !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                !!(
                    process.env.SUPABASE_SERVICE_ROLE_KEY ||
                    process.env.SUPABASE_SECRET_ROLE_KEY
                ) &&
                !!process.env.GOOGLE_API_KEY,
            message: `Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'FALTA'}, Supabase Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'OK' : 'FALTA'}, Service Key: ${(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_ROLE_KEY) ? 'OK' : 'FALTA'}, Google API Key: ${process.env.GOOGLE_API_KEY ? 'OK' : 'FALTA'}`
        };

    if (!supabase) {
            results.supabaseConnection = {
                success: false,
                message: 'Supabase no está configurado. Verifica NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
            };
            return results;
        }

    // 2. Test Supabase Admin Connection
        const { supabaseAdmin, error: adminClientError } = createAdminClient();
        if (adminClientError || !supabaseAdmin) {
            results.supabaseConnection = {
                success: false,
                message: `Error al crear el cliente de Supabase Admin: ${adminClientError}`
            };
            return results;
        }
        results.supabaseConnection = { success: true, message: "Cliente de Supabase Admin creado exitosamente." };

    // 3. Test Supabase Query
        try {
            const { data, error } = await supabaseAdmin.from('productos').select('id').limit(1);
            if (error) throw error;
            results.supabaseQuery = { success: true, message: "Consulta a la tabla 'productos' exitosa.", data };
        } catch (e: any) {
            results.supabaseQuery = { success: false, message: `Error en la consulta a Supabase: ${e.message}` };
            return results;
        }

      // 4. Test Genkit AI Flow
        try {
            const llmResponse = await ai.generate({
                prompt: "Hola, solo responde con 'OK'",
                model: 'googleai/gemini-1.5-flash-latest',
                output: { format: 'text' }
            });
            const responseText = llmResponse.text;
            if (!responseText || !responseText.includes('OK')) {
                throw new Error(`Respuesta inesperada de la IA: ${responseText}`);
            }
            results.genkitTest = { success: true, message: `Respuesta de Genkit AI recibida: ${responseText}` };
        } catch (e: any) {
            results.genkitTest = { success: false, message: `Error en el flujo de Genkit: ${e.message}` };
        }

        return results;
    } catch (err: any) {
        console.error('Error inesperado en runDiagnostics:', err);
        results.critical_error = { success: false, message: 'Error inesperado: ' + err.message };
        return results;
       }
  }
  // --- AUTH ACTIONS ---

export async function login(credentials: { email: string; password?: string }): Promise<{ success: boolean; user?: Omit<Cajero, 'password'>, error?: string }> {
  if (!credentials.email || !credentials.password) {
        return { success: false, error: 'Usuario y contraseña son requeridos.' };
  }
    
  const { supabaseAdmin, error: adminClientError } = createAdminClient();
  if (adminClientError || !supabaseAdmin) {
    return { success: false, error: adminClientError };
  }

  try {
      const username = credentials.email.toLowerCase();
    const { data: cajero, error: queryError } = await supabaseAdmin
      .from('cajeros')
      .select('*, password_hash')
      .ilike('username', username)
      .single();

    if (queryError || !cajero) {
      console.error('Error de Supabase al buscar cajero o no encontrado:', queryError);
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }
    
    const isPasswordCorrect = await bcrypt.compare(credentials.password, cajero.password_hash ?? '');

    if (!isPasswordCorrect) {
        await createAuditLog(
          { id: cajero.id, nombre_completo: cajero.nombre_completo, username: cajero.username, activo: cajero.activo }, 
          'LOGIN_FALLIDO', 
          `Intento de inicio de sesión fallido para el usuario ${cajero.username}.`
        );
        return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }
    
    if (!cajero.activo) {
      return { success: false, error: 'El usuario está inactivo y no puede iniciar sesión.' };
    }
    
    const { password_hash, ...userToReturn } = cajero;

    await createAuditLog(userToReturn, 'LOGIN_EXITOSO', `El usuario ${userToReturn.username} ha iniciado sesión.`);

    return { success: true, user: userToReturn };

  } catch (e: any) {
      console.error('Error inesperado durante el login:', e);
      return { success: false, error: 'Ocurrió un error inesperado en el servidor.' };
  }
}


// --- DATA FETCHING ACTIONS ---

export async function getArticles(): Promise<{data: Article[] | null, error: string | null}> {
  noStore();
  const { supabaseAdmin, error: adminClientError } = createAdminClient();
 if (!supabaseAdmin) {
    let errorMessage = adminClientError || 'Error al crear el cliente de Supabase.';

    if (adminClientError?.includes('URL')) {
      errorMessage = 'Supabase URL no configurada';
    } else if (adminClientError?.includes('service role')) {
      errorMessage = 'Service role key faltante';
    }

    return { data: null, error: errorMessage };
  }

  try {
    const { data: articles, error } = await supabaseAdmin
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching articles:', error);
      return { data: null, error: error.message };
    }
    if (!articles) return { data: [], error: null };

    // Calculate current stock by subtracting sales and adding returns
    const [salesDetailsRes, returnsRes, pendingOrdersRes] = await Promise.all([
        supabaseAdmin.from('detalle_ventas').select('producto_id, cantidad'),
        supabaseAdmin.from('devoluciones').select('producto_id, cantidad'),
        supabaseAdmin.from('ordenes_daviplata').select('detalles').eq('estado', 'pendiente')
    ]);

    if (salesDetailsRes.error) {
        return { data: null, error: `No se pudieron cargar los detalles de venta: ${salesDetailsRes.error.message}` };
    }
     if (returnsRes.error) {
        return { data: null, error: `No se pudieron cargar las devoluciones: ${returnsRes.error.message}` };
    }
     if (pendingOrdersRes.error) {
        return { data: null, error: `No se pudieron cargar las órdenes pendientes: ${pendingOrdersRes.error.message}` };
    }


    const soldQuantities = new Map<string | number, number>();
    if(salesDetailsRes.data){
        for(const detail of salesDetailsRes.data){
            const currentSold = soldQuantities.get(detail.producto_id) || 0;
            soldQuantities.set(detail.producto_id, currentSold + detail.cantidad);
        }
    }
    
    const returnedQuantities = new Map<string | number, number>();
    if(returnsRes.data){
        for(const ret of returnsRes.data){
            const currentReturned = returnedQuantities.get(ret.producto_id) || 0;
            returnedQuantities.set(ret.producto_id, currentReturned + ret.cantidad);
        }
    }

    const reservedQuantities = new Map<string | number, number>();
    if (pendingOrdersRes.data) {
        for (const order of pendingOrdersRes.data) {
            const details: DaviplataOrderDetail[] = typeof order.detalles === 'string' ? JSON.parse(order.detalles) : order.detalles;
            if (Array.isArray(details)) {
                for (const detail of details) {
                    const currentReserved = reservedQuantities.get(detail.producto_id) || 0;
                    reservedQuantities.set(detail.producto_id, currentReserved + detail.cantidad);
                }
            }
        }
    }
    
    const articlesWithStock = articles.map(article => ({
        ...article,
        stock_reservado: reservedQuantities.get(article.id) || 0,
        stock_disponible: (article.stock_inicial || 0) 
                         - (soldQuantities.get(article.id) || 0) 
                         + (returnedQuantities.get(article.id) || 0)
                         - (reservedQuantities.get(article.id) || 0),
    }));


    return { data: articlesWithStock, error: null };
  } catch(e:any) {
    return { data: null, error: e.message || "Unknown error fetching articles."}
  }
}

async function createAuditLog(cajero: Omit<Cajero, 'password'>, accion: string, descripcion: string, ip: string | null = null) {
    if(!cajero || !cajero.id){
        console.error("Intento de log de auditoría sin un cajero válido.");
        return;
    }
    
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
        console.error("Fallo al crear log de auditoría por falta de cliente admin:", adminClientError);
        return;
    }

    try {
        let ip_address = 'IP no disponible';
        if (ip === null) {
            try {
                // This has been identified as a source of instability under heavy load.
                // It is intentionally disabled during stress tests or high-concurrency actions.
                // ip_address = headers().get('x-forwarded-for') ?? headers().get('x-real-ip') ?? 'IP no detectada';
            } catch (e) {
                // The error "Invariant: Method 'headers' couldn't be accessed" occurs under heavy load.
                // We catch it to prevent the entire transaction from failing.
                ip_address = 'IP no disponible (carga alta)';
            }
        } else {
             ip_address = ip;
        }

        const { error } = await supabaseAdmin.from('auditoria').insert({
            cajero_id: String(cajero.id),
            cajero_nombre: cajero.nombre_completo,
            accion,
            descripcion,
            ip_address: ip_address,
        });
        if (error) throw error;
    } catch (error) {
        console.error("Fallo al crear el log de auditoría:", error);
    }
}

export async function recordSaleTransactional(
    saleData: SaleData, 
    cajero: Cajero,
    runAiCheck: boolean = true
): Promise<{success: boolean; error?: string}> {
    if (!cajero || !cajero.id) {
        return { success: false, error: 'Acción no autorizada: sesión de cajero inválida.' };
    }
    
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { success: false, error: adminClientError };
    }

    // Phase 1: Record the sale in the database immediately.
    let newSaleId: number;
    try {
        const rpcParams = {
            p_cajero_id: Number(saleData.venta.cajero_id),
            p_subtotal: saleData.venta.subtotal,
            p_efectivo_recibido: saleData.venta.efectivo_recibido,
            p_cambio: saleData.venta.cambio,
            p_metodo_pago: saleData.venta.metodo_pago,
            p_detalles: saleData.detalles.map(d => ({
                producto_id: Number(d.producto_id),
                cantidad: d.cantidad,
                precio_unitario: d.precio_unitario,
                subtotal: d.subtotal,
            }))
        };
        
        const { data, error } = await supabaseAdmin.rpc('crear_venta_con_detalles', rpcParams);

        if (error) {
            throw new Error(`Error en la transacción de venta: ${error.message || JSON.stringify(error)}`);
        }
        
        newSaleId = data;
        // Pass a specific IP to avoid calling headers() in a loop
        await createAuditLog(cajero, 'VENTA_REGISTRADA', `Venta ID: ${newSaleId}. Total: ${saleData.venta.subtotal}.`, 'N/A');
        revalidatePath('/');
        revalidatePath('/dashboard');

    } catch(e: any) {
        const message = e.message || 'Error desconocido durante la transacción de venta.';
        console.error('Excepción al registrar la venta:', e);
        await createAuditLog(cajero, 'VENTA_FALLIDA', `Error al crear la venta. Subtotal: ${saleData.venta.subtotal}. Error: ${message}`, 'N/A');
        return { success: false, error: message };
    }

    if (runAiCheck) {
        // Phase 2: Run AI security check in the background (fire and forget).
        // This runs after the response has been sent to the client, preventing timeouts.
        (async () => {
            try {
                const securityResult = await daviplataSecurityCheck({
                    total: saleData.venta.subtotal,
                    clientInfo: { document: undefined, phone: undefined },
                });
                if (!securityResult.es_segura) {
                    await createAuditLog(cajero, 'IA_ALERTA_POST_VENTA', `Venta ID ${newSaleId} marcada por IA. Motivo: ${securityResult.motivo}`, 'N/A');
                }
            } catch (aiError: any) {
                // If the AI check fails, the sale is NOT reverted. An error is logged.
                console.error("AI Security check in background failed:", aiError);
                await createAuditLog(cajero, 'IA_ERROR_CHECK', `El chequeo de IA para la Venta ID ${newSaleId} falló. Error: ${aiError.message}`, 'N/A');
            }
        })();
    }
    
    return { success: true };
}


export async function getAllSales(): Promise<{data: VentaConDetalles[] | null, error: string | null}> {
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        const { data: sales, error: salesError } = await supabaseAdmin
            .from('ventas')
            .select('*, cajeros (nombre_completo)')
            .order('fecha_venta', { ascending: false });

        if (salesError) throw salesError;
        if (!sales || sales.length === 0) return { data: [], error: null };

        const { data: articles, error: articlesError } = await supabaseAdmin
            .from('productos')
            .select('id, nombre');

        if (articlesError) throw articlesError;
        const articleMap = new Map(articles.map(p => [p.id, p.nombre]));

        const saleIds = sales.map(s => s.id);
        const { data: details, error: detailsError } = await supabaseAdmin
            .from('detalle_ventas')
            .select('*')
            .in('venta_id', saleIds);

        if (detailsError) throw detailsError;

        const detailsBySaleId = new Map<number, any[]>();
        details.forEach(d => {
            const saleDetails = detailsBySaleId.get(d.venta_id) || [];
            saleDetails.push({
                ...d,
                nombre_producto: articleMap.get(d.producto_id) || 'Artículo no encontrado'
            });
            detailsBySaleId.set(d.venta_id, saleDetails);
        });
        
        const transformedData: VentaConDetalles[] = sales.map((sale: any) => ({
            ...sale,
            cajero_nombre: sale.cajeros?.nombre_completo || 'Cajero no encontrado',
            detalles: detailsBySaleId.get(sale.id) || []
        }));

        return { data: transformedData, error: null };
    } catch(e: any) {
        const message = e.message || 'Unknown error';
        console.error('Get all sales error:', message);
        return { data: null, error: message };
    }
}

export async function createArticle(cajero: Cajero, formData: ArticleFormData): Promise<{data: Article | null, error: string | null}> {
    if (!cajero?.can_access_articles) {
        return { data: null, error: 'Acción no autorizada: sin permiso para crear artículos.' };
    }
    
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('productos')
            .insert([formData])
            .select()
            .single();
        
        if (error) throw error;
        
        await createAuditLog(cajero, 'PRODUCTO_CREADO', `Artículo creado: ${data.nombre} (ID: ${data.id})`);
        revalidatePath('/dashboard/articles');
        revalidatePath('/');
        return { data, error: null };
    } catch(e: any) {
        const message = e.message || 'Unknown error';
        await createAuditLog(cajero, 'PRODUCTO_CREACION_FALLIDA', `Intento de crear artículo: ${formData.nombre}. Error: ${message}`);
        return { data: null, error: message };
    }
}

export async function updateArticle(cajero: Cajero, articleId: string | number, formData: ArticleFormData): Promise<{data: Article | null, error: string | null}> {
    if (!cajero?.can_access_articles) {
        return { data: null, error: 'Acción no autorizada: sin permiso para actualizar artículos.' };
    }
    
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('productos')
            .update(formData)
            .eq('id', articleId)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog(cajero, 'PRODUCTO_ACTUALIZADO', `Artículo actualizado: ${data.nombre} (ID: ${data.id})`);
        revalidatePath('/dashboard/articles');
        revalidatePath('/');
        return { data, error: null };
    } catch(e: any) {
        const message = e.message || 'Unknown error';
        await createAuditLog(cajero, 'PRODUCTO_ACTUALIZACION_FALLIDA', `Intento de actualizar artículo ID: ${articleId}. Error: ${message}`);
        return { data: null, error: message };
    }
}


export async function toggleArticleAvailability(cajero: Cajero, articleId: number | string, newStatus: boolean): Promise<{ success: boolean; error?: string }> {
  if (!cajero?.can_access_articles) {
    return { success: false, error: 'Acción no autorizada.' };
  }

  const { supabaseAdmin, error: adminClientError } = createAdminClient();
  if (adminClientError || !supabaseAdmin) {
    return { success: false, error: adminClientError };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('productos')
      .update({ activo: newStatus })
      .eq('id', articleId)
      .select('nombre')
      .single();

    if (error) throw error;

    const action = newStatus ? 'PRODUCTO_REACTIVADO' : 'PRODUCTO_AGOTADO';
    const description = `El producto "${data.nombre}" (ID: ${articleId}) se marcó como ${newStatus ? 'disponible' : 'agotado'}.`;
    await createAuditLog(cajero, action, description);
    
    revalidatePath('/');
    revalidatePath('/daviplata');
    revalidatePath('/articles');


    return { success: true };
  } catch (e: any) {
    const message = e.message || 'Error desconocido';
    await createAuditLog(cajero, 'ERROR_DISPONIBILIDAD', `Fallo al cambiar estado del producto ID ${articleId}. Error: ${message}`);
    return { success: false, error: message };
  }
}

export async function toggleArticleClientVisibility(cajero: Cajero, articleId: number, newStatus: boolean): Promise<{ success: boolean; error?: string }> {
    if (!cajero?.can_access_articles) {
        return { success: false, error: 'Acción no autorizada.' };
    }

    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
        return { success: false, error: adminClientError };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('productos')
            .update({ visible_cliente: newStatus })
            .eq('id', articleId)
            .select('nombre')
            .single();

        if (error) throw error;
        
        const action = newStatus ? 'PRODUCTO_VISIBLE_CLIENTE' : 'PRODUCTO_OCULTO_CLIENTE';
        const description = `El producto "${data.nombre}" (ID: ${articleId}) ahora es ${newStatus ? 'visible' : 'no visible'} para el cliente.`;
        await createAuditLog(cajero, action, description);
        
        revalidatePath('/daviplata');
        revalidatePath('/articles');

        return { success: true };
    } catch (e: any) {
        const message = e.message || 'Error desconocido';
        await createAuditLog(cajero, 'ERROR_VISIBILIDAD_CLIENTE', `Fallo al cambiar visibilidad del producto ID ${articleId}. Error: ${message}`);
        return { success: false, error: message };
    }
}


export async function getDashboardData(): Promise<{data: DashboardData | null, error: string | null}> {
    noStore();
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
        return { data: null, error: adminClientError };
    }

    try {
        const [salesRes, returnsRes, cajerosRes, daviplataOrdersRes] = await Promise.all([
            supabaseAdmin.from('ventas').select('id, subtotal, metodo_pago, cajero_id, fecha_venta'),
            supabaseAdmin.from('devoluciones').select('monto_devolucion'),
            supabaseAdmin.from('cajeros').select('id, nombre_completo, username'),
            supabaseAdmin.from('ordenes_daviplata').select('venta_id, fecha_creacion').eq('estado', 'completada').not('venta_id', 'is', null)
        ]);
        
        if (salesRes.error) throw new Error(`Error fetching sales: ${salesRes.error.message}`);
        if (returnsRes.error) throw new Error(`Error fetching returns: ${returnsRes.error.message}`);
        if(cajerosRes.error) throw new Error(`Error fetching cajeros: ${cajerosRes.error.message}`);
        if(daviplataOrdersRes.error) throw new Error(`Error fetching daviplata orders: ${daviplataOrdersRes.error.message}`);
        
        const sales = salesRes.data;
        const returns = returnsRes.data;
        const cajeros = cajerosRes.data;
        const daviplataOrders = daviplataOrdersRes.data;

        const cajeroUsernameMap = new Map(cajeros.map(c => [String(c.id), c.username]));
        const salesByCajero = new Map<string, number>();

        const total_returns = returns.reduce((acc, r) => acc + r.monto_devolucion, 0);
        let total_revenue_gross = 0;
        let total_efectivo = 0;
        let total_daviplata = 0;
        
        sales.forEach(sale => {
            total_revenue_gross += sale.subtotal;
            if (sale.metodo_pago === 'Efectivo') {
                total_efectivo += sale.subtotal;
            } else if (sale.metodo_pago === 'Daviplata') {
                total_daviplata += sale.subtotal;
            }

            const cajeroName = cajeroUsernameMap.get(String(sale.cajero_id)) || `ID ${sale.cajero_id}`;
            const currentSales = salesByCajero.get(cajeroName) || 0;
            salesByCajero.set(cajeroName, currentSales + sale.subtotal);
        });

        // Calculate average Daviplata verification time
        let avg_daviplata_verification_time: number | null = null;
        if (daviplataOrders.length > 0) {
            const salesMap = new Map(sales.map(s => [s.id, s.fecha_venta]));
            let totalVerificationSeconds = 0;
            let validDurationsCount = 0;
            
            daviplataOrders.forEach(order => {
                if(order.venta_id) {
                    const saleTime = salesMap.get(order.venta_id);
                    if (saleTime) {
                        const duration = new Date(saleTime).getTime() - new Date(order.fecha_creacion).getTime();
                        totalVerificationSeconds += duration;
                        validDurationsCount++;
                    }
                }
            });

            if (validDurationsCount > 0) {
                 avg_daviplata_verification_time = (totalVerificationSeconds / validDurationsCount) / (1000 * 60); // in minutes
            }
        }
        
        // Calculate average sale time per cashier
        const salesByCajeroForTiming = new Map<string, { fecha_venta: string }[]>();
        sales.forEach(sale => {
            const cajeroId = String(sale.cajero_id);
            if (!salesByCajeroForTiming.has(cajeroId)) {
                salesByCajeroForTiming.set(cajeroId, []);
            }
            salesByCajeroForTiming.get(cajeroId)!.push(sale as any);
        });
        
        const avg_sale_time_by_cajero: { nombre: string, avg_time_seconds: number }[] = [];
        salesByCajeroForTiming.forEach((cajeroSales, cajeroId) => {
            if (cajeroSales.length > 1) {
                // Sort sales chronologically for this cashier
                cajeroSales.sort((a, b) => new Date(a.fecha_venta).getTime() - new Date(b.fecha_venta).getTime());
                
                let totalTimeDiff = 0;
                for (let i = 1; i < cajeroSales.length; i++) {
                    const timeDiff = new Date(cajeroSales[i].fecha_venta).getTime() - new Date(cajeroSales[i - 1].fecha_venta).getTime();
                    totalTimeDiff += timeDiff;
                }
                const avgTimeSeconds = (totalTimeDiff / (cajeroSales.length - 1)) / 1000;
                const cajeroName = cajeroUsernameMap.get(cajeroId) || `ID ${cajeroId}`;
                avg_sale_time_by_cajero.push({ nombre: cajeroName, avg_time_seconds: avgTimeSeconds });
            }
        });

        const dashboardData: DashboardData = {
            total_revenue: total_revenue_gross - total_returns,
            total_sales: sales.length,
            total_efectivo: total_efectivo - total_returns, // Assume returns are in cash
            total_daviplata: total_daviplata,
            total_returns: total_returns,
            sales_by_cajero: Array.from(salesByCajero.entries()).map(([nombre, total]) => ({
                nombre,
                total,
            })).sort((a,b) => b.total - a.total),
            avg_daviplata_verification_time,
            avg_sale_time_by_cajero: avg_sale_time_by_cajero.sort((a,b) => a.avg_time_seconds - b.avg_time_seconds),
        };
        
        return { data: dashboardData, error: null };

    } catch(e: any) {
        const message = e.message || 'Unknown error while calculating dashboard data.';
        console.error('Error in getDashboardData:', message);
        return { data: null, error: message };
    }
}

export async function getSalesByArticle(): Promise<{data: ArticleSale[] | null, error: string | null}> {
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        const { data: details, error: detailsError } = await supabaseAdmin
            .from('detalle_ventas')
            .select('producto_id, cantidad, subtotal');
        
        if (detailsError) throw new Error(`Error fetching sale details: ${detailsError.message}`);
        if (!details) return { data: [], error: null };

        const { data: articles, error: articlesError } = await supabaseAdmin
            .from('productos')
            .select('id, nombre, imagen_url');

        if (articlesError) throw new Error(`Error fetching articles: ${articlesError.message}`);
        if (!articles) return { data: [], error: null };
        
        const articleMap = new Map(articles.map(a => [a.id, { nombre: a.nombre, imagen_url: a.imagen_url }]));

        const salesByArticle = details.reduce((acc, detail) => {
            const articleInfo = acc.get(detail.producto_id) || {
                producto_id: detail.producto_id,
                nombre: articleMap.get(detail.producto_id)?.nombre || `ID ${detail.producto_id}`,
                imagen_url: articleMap.get(detail.producto_id)?.imagen_url || null,
                total_vendido: 0,
                recaudo_total: 0,
            };

            articleInfo.total_vendido += detail.cantidad;
            articleInfo.recaudo_total += detail.subtotal;
            
            acc.set(detail.producto_id, articleInfo);
            return acc;
        }, new Map<string | number, ArticleSale>());

        return { data: Array.from(salesByArticle.values()), error: null };
    } catch(e: any) {
        const message = e.message || 'Unknown error while calculating sales by article.';
        console.error('Error in getSalesByArticle:', message);
        return { data: null, error: message };
    }
}


export async function getAllReturns(): Promise<{data: ReturnDetail[] | null, error: string | null}> {
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }
    
     try {
        const { data, error } = await supabaseAdmin
            .from('devoluciones')
            .select('*, cajeros (nombre_completo), productos (nombre)')
            .order('fecha_devolucion', { ascending: false });

        if (error) throw error;
        
        const transformedData = (data || []).map(r => ({
            id: r.id,
            producto_id: r.producto_id,
            producto_nombre: r.productos?.nombre || 'Artículo no encontrado',
            cantidad: r.cantidad,
            monto_devolucion: r.monto_devolucion,
            cajero_nombre: r.cajeros?.nombre_completo || 'Cajero no encontrado',
            fecha_devolucion: r.fecha_devolucion,
        }));
        
        return { data: transformedData, error: null };
    } catch(e: any) {
        const message = e.message || 'Unknown error';
        return { data: null, error: message };
    }
}

export async function recordReturn(returnData: ReturnFormData, cajero: Cajero): Promise<{success: boolean; error?: string}> {
    if (!cajero?.id || !cajero?.can_view_returns) {
        return { success: false, error: 'Acción no autorizada: sesión o permisos inválidos.' };
    }
    
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { success: false, error: adminClientError };
    }

    try {
        const { data: article, error: articleError } = await supabaseAdmin
            .from('productos')
            .select('precio, nombre')
            .eq('id', returnData.producto_id)
            .single();
        
        if(articleError || !article) {
             return { success: false, error: 'No se pudo encontrar el artículo para la devolución.' };
        }
        
        const monto_devolucion = article.precio * returnData.cantidad;

        const { error } = await supabaseAdmin.from('devoluciones').insert([{ ...returnData, monto_devolucion, producto_id: Number(returnData.producto_id), cajero_id: String(returnData.cajero_id) }]);

        if (error) throw error;
        
        await createAuditLog(cajero, 'DEVOLUCION_REGISTRADA', `Devolución para ${article.nombre}. Cantidad: ${returnData.cantidad}. Monto: ${monto_devolucion}`);
        revalidatePath('/');
        revalidatePath('/dashboard');
        return { success: true };
    } catch(e: any) {
        const message = e.message || 'Unknown error';
        await createAuditLog(cajero, 'DEVOLUCION_FALLIDA', `Intento de devolución. Error: ${message}`);
        return { success: false, error: message };
    }
}

export async function getAuditLogs(): Promise<{data: AuditLog[] | null, error: string | null}> {
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('auditoria')
            .select('*')
            .order('fecha_evento', { ascending: false })
            .limit(500);

        if (error) throw error;
        return { data, error: null };
    } catch(e: any) {
        const message = e.message || 'Unknown error';
        return { data: null, error: message };
    }
}

// --- AI ACTIONS ---

export async function getAiAnalysis(input: DashboardAnalysisInput): Promise<{ analysis: string | null, error: string | null }> {
    try {
        const analysis = await getDashboardAnalysisFlow(input);
        return { analysis, error: null };
    } catch(e: any) {
        const errorMessage = e.message || "Ocurrió un error inesperado al contactar al servicio de IA.";
        console.error("Excepción al llamar al flujo de análisis de IA:", e);
        return { analysis: null, error: errorMessage };
    }
}

// --- CAJERO MANAGEMENT ACTIONS ---

export async function getCajeros(requestor: Cajero): Promise<{data: Cajero[] | null, error: string | null}> {
    if (!requestor?.can_access_cajeros) {
        return { data: null, error: 'Acción no autorizada.' };
    }
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('cajeros')
            .select('*')
            .order('nombre_completo', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch(e: any) {
        return { data: null, error: (e as Error).message };
    }
}

export async function createCajero(requestor: Cajero, formData: CajeroFormData): Promise<{data: Cajero | null, error: string | null}> {
    if (!requestor?.can_access_cajeros) {
        return { data: null, error: 'Acción no autorizada.' };
    }
    
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        const { password, username, ...restOfData } = formData;
        const hashed = await bcrypt.hash(password, 10);
        const dataToInsert = { ...restOfData, username: username.toLowerCase(), password_hash: hashed };

        const { data, error } = await supabaseAdmin
            .from('cajeros')
            .insert(dataToInsert)
            .select()
            .single();
        
        if (error) throw error;
        
        await createAuditLog(requestor, 'CAJERO_CREADO', `Cajero creado: ${data.nombre_completo} (ID: ${data.id})`);
        revalidatePath('/cajeros');
        return { data, error: null };
    } catch(e: any) {
        const message = (e as Error).message;
        await createAuditLog(requestor, 'CAJERO_CREACION_FALLIDA', `Intento de crear cajero: ${formData.nombre_completo}. Error: ${message}`);
        return { data: null, error: message };
    }
}

export async function updateCajero(requestor: Cajero, cajeroId: string | number, formData: CajeroFormData): Promise<{data: Cajero | null, error: string | null}> {
    if (!requestor?.can_access_cajeros) {
        return { data: null, error: 'Acción no autorizada.' };
    }
    
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        const { password, username, ...restOfData } = formData;
        const dataToUpdate: Partial<Cajero> & { password_hash?: string } = { ...restOfData, username: username.toLowerCase() };
        
        if (password) {
            dataToUpdate.password_hash = await bcrypt.hash(password, 10);
        }

        const { data, error } = await supabaseAdmin
            .from('cajeros')
            .update(dataToUpdate)
            .eq('id', cajeroId)
            .select()
            .single();

        if (error) throw error;

        await createAuditLog(requestor, 'CAJERO_ACTUALIZADO', `Cajero actualizado: ${data.nombre_completo} (ID: ${data.id})`);
        revalidatePath('/cajeros');
        return { data, error: null };
    } catch(e: any) {
        const message = (e as Error).message;
        await createAuditLog(requestor, 'CAJERO_ACTUALIZACION_FALLIDA', `Intento de actualizar cajero ID: ${cajeroId}. Error: ${message}`);
        return { data: null, error: message };
    }
}


// --- DAVIPLATA ACTIONS ---

const generateReferenceCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export async function createDaviplataOrder(
  details: DaviplataOrderDetail[], 
  total: number,
  clientInfo?: { document?: string, phone?: string },
  orderId?: number | null,
  runAiCheck: boolean = true
): Promise<{ data: DaviplataOrder | null, error: string | null }> {
    if (!details || details.length === 0 || total <= 0) {
        return { data: null, error: "Los detalles de la orden son inválidos." };
    }
    
    if (runAiCheck) {
        try {
            const securityResult = await daviplataSecurityCheck({
                total: total,
                clientInfo: clientInfo,
            });
            if (!securityResult.es_segura) {
                console.warn(`AI Security Flagged Transaction: ${securityResult.motivo}`, {total, clientInfo});
                return { data: null, error: `Transacción no procesada. Motivo: ${securityResult.motivo}` };
            }
        } catch (aiError: any) {
            console.error("AI Security Check failed:", aiError.message);
            // Fail open: If AI check fails, proceed but log the error.
        }
    }


    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    if (orderId) {
        // --- UPDATE EXISTING ORDER ---
        try {
            const { data, error: updateError } = await supabaseAdmin
                .from('ordenes_daviplata')
                .update({
                    detalles: JSON.stringify(details),
                    total: total,
                    documento_cliente: clientInfo?.document || null,
                    daviplata_cliente: clientInfo?.phone || null,
                })
                .eq('id', orderId)
                .eq('estado', 'pendiente') // Ensure we only update pending orders
                .select('*') // Return the full updated order
                .single();
            
            if (updateError) throw updateError;
            if (!data) return {data: null, error: "No se pudo actualizar la orden. Puede que ya haya sido procesada."};
            
            revalidatePath('/verificar-daviplata');
            return { data: { ...data, detalles: JSON.parse(data.detalles as string) }, error: null };

        } catch (e: any) {
            return { data: null, error: `No se pudo actualizar la orden: ${e.message}` };
        }
    } else {
        // --- CREATE NEW ORDER ---
        let codigo_referencia = generateReferenceCode();
        let isUnique = false;
        let attempts = 0;

        // Intenta encontrar un código único, con un límite de intentos.
        while (!isUnique && attempts < 10) {
            const { data: existingOrder, error } = await supabaseAdmin
                .from('ordenes_daviplata')
                .select('id')
                .eq('codigo_referencia', codigo_referencia)
                .single();

            if (error && error.code !== 'PGRST116') { // 'PGRST116' is "No rows returned"
                return { data: null, error: `Error al verificar el código de referencia: ${error.message}` };
            }

            if (!existingOrder) {
                isUnique = true;
            } else {
                codigo_referencia = generateReferenceCode();
            }
            attempts++;
        }

        if (!isUnique) {
            return { data: null, error: "No se pudo generar un código de referencia único. Por favor, intente de nuevo." };
        }

        try {
            const { data, error: insertError } = await supabaseAdmin
                .from('ordenes_daviplata')
                .insert({
                    codigo_referencia,
                    detalles: JSON.stringify(details),
                    total,
                    estado: 'pendiente',
                    documento_cliente: clientInfo?.document || null,
                    daviplata_cliente: clientInfo?.phone || null,
                })
                .select('*')
                .single();

            if (insertError) throw insertError;
             if (!data) return {data: null, error: "No se pudo crear la orden."};

            revalidatePath('/verificar-daviplata');
            return { data: { ...data, detalles: JSON.parse(data.detalles as string) }, error: null };
        } catch (e: any) {
            return { data: null, error: `No se pudo crear la orden: ${e.message}` };
        }
    }
}

export async function findDaviplataOrder(
    identifier: { type: 'code', value: string } | { type: 'client', value: string }
): Promise<{ data: DaviplataOrder[] | null, error: string | null }> {
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        let query = supabaseAdmin
            .from('ordenes_daviplata')
            .select('*');

        if (identifier.type === 'code') {
            query = query.eq('codigo_referencia', identifier.value);
        } else { // client
            query = query.or(`documento_cliente.eq.${identifier.value},daviplata_cliente.eq.${identifier.value}`);
        }
        
        query = query.order('fecha_creacion', { ascending: false });

        const { data, error } = await query;
        
        if (error) {
            if (error.code === 'PGRST116') return { data: null, error: 'No se encontró ninguna orden con ese identificador.' };
            throw error;
        }
        
        if (!data || data.length === 0) {
            return { data: null, error: 'No se encontró ninguna orden con ese identificador.' };
        }

        const parsedData = data.map(order => {
            if (order && typeof order.detalles === 'string') {
                try {
                    return { ...order, detalles: JSON.parse(order.detalles) };
                } catch(e) {
                    console.error("Failed to parse Daviplata order details", order.id);
                    return { ...order, detalles: [] };
                }
            }
            return order;
        });

        return { data: parsedData, error: null };
    } catch (e: any) {
        return { data: null, error: `Error al buscar la orden: ${e.message}` };
    }
}

export async function completeDaviplataOrder(orderId: number, cajero: Cajero): Promise<{ success: boolean, error?: string }> {
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { success: false, error: adminClientError };
    }
    
    // 1. Obtener la orden para asegurar que exista y esté pendiente
    const { data: order, error: findError } = await supabaseAdmin
        .from('ordenes_daviplata')
        .select('*')
        .eq('id', orderId)
        .single();
        
    if(findError || !order) return { success: false, error: 'No se encontró la orden.' };
    if(order.estado !== 'pendiente') return { success: false, error: 'Esta orden ya fue procesada o cancelada.' };

    // 2. Crear la venta
    const details = typeof order.detalles === 'string' ? JSON.parse(order.detalles) : order.detalles;

    const saleData: SaleData = {
        venta: {
            cajero_id: cajero.id,
            subtotal: order.total,
            efectivo_recibido: order.total,
            cambio: 0,
            metodo_pago: 'Daviplata',
        },
        detalles: details,
    };
    
    const { data: newSaleId, error: saleError } = await supabaseAdmin.rpc('crear_venta_con_detalles', {
        p_cajero_id: Number(saleData.venta.cajero_id),
        p_subtotal: saleData.venta.subtotal,
        p_efectivo_recibido: saleData.venta.efectivo_recibido,
        p_cambio: saleData.venta.cambio,
        p_metodo_pago: saleData.venta.metodo_pago,
        p_detalles: saleData.detalles.map(d => ({
            producto_id: Number(d.producto_id),
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal,
        }))
    });

    if (saleError) {
        await createAuditLog(cajero, 'DAVIPLATA_FALLIDA', `Error al completar orden Daviplata ${order.codigo_referencia}: ${saleError.message}`);
        return { success: false, error: `No se pudo registrar la venta: ${saleError.message}` };
    }

    // 3. Actualizar la orden a 'completada' y asociar el ID de la venta
     const { error: updateError } = await supabaseAdmin
        .from('ordenes_daviplata')
        .update({ estado: 'completada', venta_id: newSaleId })
        .eq('id', orderId);

    if (updateError) {
        // Esto es problemático. La venta se creó pero la orden no se actualizó.
        // Se requiere un log de auditoría urgente para revisión manual.
        await createAuditLog(cajero, 'DAVIPLATA_INCONSISTENTE', `¡ALERTA! Venta ${newSaleId} creada para orden DaviPlata ${order.codigo_referencia}, pero no se pudo actualizar la orden. Revisión manual requerida.`);
        return { success: false, error: 'La venta se registró, pero no se pudo actualizar el estado de la orden. Por favor, notifique al administrador.' };
    }
    
    await createAuditLog(cajero, 'DAVIPLATA_COMPLETADA', `Orden Daviplata ${order.codigo_referencia} completada. Venta ID: ${newSaleId}.`);
    
    revalidatePath('/dashboard');
    revalidatePath('/verificar-daviplata');
    return { success: true };
}

export async function getPendingDaviplataOrders(): Promise<{ data: DaviplataOrder[] | null, error: string | null }> {
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('ordenes_daviplata')
            .select('*')
            .eq('estado', 'pendiente')
            .order('fecha_creacion', { ascending: false });

        if (error) {
            // 'PGRST116' is "No rows returned", which is not an error here.
            if (error.code === 'PGRST116') return { data: [], error: null };
            throw error;
        }

        if (!data || data.length === 0) {
            return { data: [], error: null };
        }

        const parsedData = data.map(order => {
             if (order && typeof order.detalles === 'string') {
                try {
                    return { ...order, detalles: JSON.parse(order.detalles) };
                } catch(e) {
                    console.error("Failed to parse Daviplata order details", order.id);
                    return { ...order, detalles: [] };
                }
            }
            return order;
        });

        return { data: parsedData, error: null };
    } catch (e: any) {
        return { data: null, error: `Error al buscar órdenes pendientes: ${e.message}` };
    }
}

export async function countCompletedDaviplataOrders(): Promise<{ count: number, error: string | null }> {
    noStore();
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
        return { count: 0, error: adminClientError };
    }

    try {
        const { count, error } = await supabaseAdmin
            .from('ordenes_daviplata')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'completada');

        if (error) throw error;
        
        return { count: count ?? 0, error: null };
    } catch (e: any) {
        return { count: 0, error: e.message };
    }
}

// --- DAVIPLATA CHATBOT ACTIONS ---
export async function askDaviplataAssistant(
    question: string, 
    history: DaviplataConversation[],
    sessionId: string,
    clientInfo?: {document?: string; phone?: string}
): Promise<{ response: string; error?: null; videoDataUri?: string | null } | { response?: null, error: string }> {
     if (!question) {
        return { error: 'La pregunta no puede estar vacía.' };
    }
    
    try {
        const aiResponse = await daviplataChat({ question, history, sessionId, clientInfo });
        return { response: aiResponse.answer };
    } catch (e: any) {
        console.error("Error calling Daviplata chat flow:", e);
        return { error: e.message || "No se pudo obtener respuesta de la IA." };
    }
}

export async function getDaviplataConversations(requestor: Cajero): Promise<{data: Record<string, DaviplataConversation[]> | null, error: string | null}> {
    if (!requestor?.can_access_ai_analysis) { // Re-using permission
        return { data: null, error: 'Acción no autorizada.' };
    }
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { data: null, error: adminClientError };
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('conversaciones_daviplata')
            .select('*')
            .order('timestamp', { ascending: true });

        if (error) throw error;
        if (!data) return { data: {}, error: null };

        const groupedBySession: Record<string, DaviplataConversation[]> = data.reduce((acc, msg) => {
            const sessionId = msg.session_id;
            if (!acc[sessionId]) {
                acc[sessionId] = [];
            }
            acc[sessionId].push({
                id: msg.id,
                session_id: sessionId,
                sender: msg.sender,
                message: msg.message,
                timestamp: msg.timestamp,
                documento_cliente: msg.documento_cliente,
                daviplata_cliente: msg.daviplata_cliente,
                video_data_uri: msg.video_data_uri,
            });
            return acc;
        }, {} as Record<string, DaviplataConversation[]>);


        return { data: groupedBySession, error: null };
    } catch(e: any) {
        return { data: null, error: (e as Error).message };
    }
}

export async function sendAdminChatMessage(
    requestor: Cajero,
    sessionId: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    if (!requestor?.can_access_ai_analysis) {
        return { success: false, error: 'Acción no autorizada.' };
    }
     const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { success: false, error: adminClientError };
    }
    
    try {
        const { data: lastMessage, error: lastMessageError } = await supabaseAdmin
            .from('conversaciones_daviplata')
            .select('documento_cliente, daviplata_cliente')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

        if (lastMessageError) throw new Error("No se pudo encontrar la sesión para obtener los datos del cliente.");

        const { error } = await supabaseAdmin
            .from('conversaciones_daviplata')
            .insert({
                session_id: sessionId,
                sender: 'admin',
                message: message,
                documento_cliente: lastMessage?.documento_cliente,
                daviplata_cliente: lastMessage?.daviplata_cliente
            });
        if (error) throw error;
        
        await createAuditLog(requestor, 'CHAT_INTERVENCION', `El admin ${requestor.username} intervino en el chat ${sessionId}.`);
        revalidatePath('/dashboard/ia-button');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'No se pudo enviar el mensaje.' };
    }
}

export async function countPendingDaviplataConversations(requestor: Cajero): Promise<{ count: number, error: string | null }> {
    if (!requestor?.can_access_ai_analysis) {
        return { count: 0, error: 'Acción no autorizada.' };
    }
    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
      return { count: 0, error: adminClientError };
    }

    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        // Subconsulta para encontrar la última respuesta de la IA para cada sesión
        const { data: lastReplies, error: lastRepliesError } = await supabaseAdmin.rpc('get_last_ai_reply_per_session');

        if(lastRepliesError) throw lastRepliesError;
        if(!lastReplies || lastReplies.length === 0) return { count: 0, error: null };

        const sessionsWithRecentAiReply = lastReplies
            .filter(reply => new Date(reply.last_timestamp) > new Date(fiveMinutesAgo))
            .map(reply => reply.session_id);

        if (sessionsWithRecentAiReply.length === 0) return { count: 0, error: null };

        // Contar cuántas de esas sesiones no tienen una respuesta posterior del usuario
        const { data: userResponses, error: userResponsesError } = await supabaseAdmin
            .from('conversaciones_daviplata')
            .select('session_id, timestamp')
            .in('session_id', sessionsWithRecentAiReply)
            .eq('sender', 'user')
            .order('timestamp', { ascending: false });
        
        if (userResponsesError) throw userResponsesError;

        const sessionsWithUserReplyAfterAi = new Set();
        for (const lastAiReply of lastReplies) {
            if (sessionsWithRecentAiReply.includes(lastAiReply.session_id)) {
                const userReply = userResponses.find(ur => ur.session_id === lastAiReply.session_id && new Date(ur.timestamp) > new Date(lastAiReply.last_timestamp));
                if (userReply) {
                    sessionsWithUserReplyAfterAi.add(lastAiReply.session_id);
                }
            }
        }
        
        const pendingCount = sessionsWithRecentAiReply.length - sessionsWithUserReplyAfterAi.size;

        return { count: pendingCount, error: null };
    } catch (e: any) {
        return { count: 0, error: e.message };
    }
}


// --- Stress Test Action ---
export async function runStressTest(
    cajeroTransactionCount: number,
    cajeroCount: number,
    daviplataTransactionCount: number
): Promise<{ successCount: number; errorCount: number; duration: number, errors: string[] }> {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const { supabaseAdmin, error: adminClientError } = createAdminClient();
    if (adminClientError || !supabaseAdmin) {
        return {
            successCount: 0,
            errorCount: cajeroTransactionCount + daviplataTransactionCount,
            duration: 0,
            errors: [adminClientError || "Unknown admin client error"],
        };
    }

    try {
        const { data: articles, error: articlesError } = await supabaseAdmin
            .from('productos')
            .select('*')
            .eq('activo', true);
        if (articlesError || !articles || articles.length === 0) {
            throw new Error("No se encontraron artículos activos para la prueba.");
        }

        const { data: cajeros, error: cajerosError } = await supabaseAdmin
            .from('cajeros')
            .select('*')
            .eq('activo', true)
            .limit(cajeroCount);
        if (cajerosError || !cajeros || cajeros.length === 0) {
            throw new Error("No se encontraron cajeros activos para la prueba.");
        }

        const transactionPromises: Promise<any>[] = [];

        // 1. Cajero transactions
        for (let i = 0; i < cajeroTransactionCount; i++) {
            const cajero = cajeros[i % cajeros.length];
            const cartItemCount = Math.floor(Math.random() * 3) + 1;
            const cart: { article: Article; quantity: number }[] = [];
            let subtotal = 0;

            for (let j = 0; j < cartItemCount; j++) {
                const article = articles[Math.floor(Math.random() * articles.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                cart.push({ article, quantity });
                subtotal += article.precio * quantity;
            }

            const saleData: SaleData = {
                venta: {
                    cajero_id: cajero.id,
                    subtotal: subtotal,
                    efectivo_recibido: subtotal,
                    cambio: 0,
                    metodo_pago: 'Efectivo',
                },
                detalles: cart.map(item => ({
                    producto_id: item.article.id,
                    cantidad: item.quantity,
                    precio_unitario: item.article.precio,
                    subtotal: item.article.precio * item.quantity,
                })),
            };

            const fullCajero: Cajero = cajero;
            transactionPromises.push(recordSaleTransactional(saleData, fullCajero, false));
        }
        
        // 2. Daviplata transactions
        for (let i = 0; i < daviplataTransactionCount; i++) {
            const cajero = cajeros[i % cajeros.length];
            const cartItemCount = Math.floor(Math.random() * 2) + 1;
            const cart: { article: Article; quantity: number }[] = [];
            let subtotal = 0;

            for (let j = 0; j < cartItemCount; j++) {
                const article = articles[Math.floor(Math.random() * articles.length)];
                const quantity = Math.floor(Math.random() * 2) + 1;
                cart.push({ article, quantity });
                subtotal += article.precio * item.quantity;
            }

            const orderDetails: DaviplataOrderDetail[] = cart.map(item => ({
                producto_id: item.article.id,
                cantidad: item.quantity,
                precio_unitario: item.article.precio,
                subtotal: item.article.precio * item.quantity,
                nombre_producto: item.article.nombre
            }));
            
            const clientInfo = {
                document: `ST-${Math.floor(10000000 + Math.random() * 90000000)}`,
                phone: `310${Math.floor(1000000 + Math.random() * 9000000)}`
            };

            const fullCajero: Cajero = cajero;
            
            // Simula el flujo completo de Daviplata
            const daviplataFlowPromise = async () => {
                const orderResult = await createDaviplataOrder(orderDetails, subtotal, clientInfo, null, false);
                if (orderResult.error || !orderResult.data) {
                    throw new Error(orderResult.error || "Failed to create Daviplata order in stress test.");
                }
                
                // Simulate time between order creation and verification
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 9000)); // 1-10 seconds
                
                return completeDaviplataOrder(orderResult.data.id, fullCajero);
            };
            
            transactionPromises.push(daviplataFlowPromise());
        }


        const results = await Promise.allSettled(transactionPromises);

        results.forEach(result => {
            if (result.status === 'fulfilled' && (result.value === undefined || result.value.success)) {
                successCount++;
            } else {
                errorCount++;
                const reason = result.status === 'rejected' 
                    ? (result.reason as Error).message 
                    : (result.value as { error: string }).error;
                errors.push(reason || 'Error desconocido');
            }
        });

    } catch (e: any) {
        errorCount = (cajeroTransactionCount + daviplataTransactionCount) - successCount;
        errors.push(e.message);
    }

    const duration = Date.now() - startTime;
    revalidatePath('/dashboard');
    return { successCount, errorCount, duration, errors };
}
    
// --- AI ACTIONS ---

export async function getCashierWarning(activeUsers: ActiveDaviplataUsers, dashboardData: DashboardData | null, pendingOrders: DaviplataOrder[] | null): Promise<CashierWarningOutput | null> {
    noStore();
    try {
        if (!dashboardData || !pendingOrders) {
             console.error(`Faltan datos para la advertencia del cajero.`);
            return null;
        }
        
        const input: CashierWarningInput = {
            pendingDaviplataOrdersCount: pendingOrders.length,
            avgDaviplataVerificationTime: dashboardData.avg_daviplata_verification_time,
            activeDaviplataUsersInCompletedState: activeUsers.states.completado,
            cashierEfficiency: dashboardData.avg_sale_time_by_cajero ?? []
        };
        
        const warning = await getCashierWarningFlow(input);
        return warning;

    } catch (e: any) {
        console.error("Failed to get cashier warning:", e);
        return null;
    }
}
