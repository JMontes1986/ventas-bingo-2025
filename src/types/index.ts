
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export interface Article {
  id: string | number;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
  created_at?: string;
  stock_inicial: number;
  stock_disponible?: number;
  stock_reservado?: number;
  visible_cliente?: boolean;
}

export interface CartItem extends Article {
  quantity: number;
}

export interface Cajero {
  id: string | number;
  username: string;
  nombre_completo: string;
  activo: boolean;
  password_hash?: string; 
  password?: string;
  can_access_dashboard?: boolean;
  can_access_ai_analysis?: boolean;
  can_access_articles?: boolean;
  can_access_cajeros?: boolean;
  can_view_returns?: boolean;
  can_verify_daviplata?: boolean;
  can_view_logs?: boolean;
}

export interface Venta {
  id: string | number; // Document ID from Supabase
  cajero_id: string | number;
  subtotal: number;
  efectivo_recibido: number;
  cambio: number;
  fecha_venta?: string;
  metodo_pago: 'Efectivo' | 'Daviplata';
}

export interface DetalleVenta {
  id: string | number; // Document ID from Supabase
  venta_id: string | number;
  producto_id: string | number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

// Schema for validating sale data before processing
export const saleDataSchema = z.object({
  venta: z.object({
    cajero_id: z.union([z.string(), z.number()]),
    subtotal: z.number().min(0),
    efectivo_recibido: z.number().min(0),
    cambio: z.number(),
    metodo_pago: z.enum(['Efectivo', 'Daviplata']),
  }),
  detalles: z.array(z.object({
    producto_id: z.union([z.string(), z.number()]),
    cantidad: z.number().int().positive(),
    precio_unitario: z.number().min(0),
    subtotal: z.number().min(0),
  })).min(1),
});

export type SaleData = z.infer<typeof saleDataSchema>;


// --- Dashboard Types ---

export const dashboardDataSchema = z.object({
    total_revenue: z.number(),
    total_sales: z.number(),
    total_efectivo: z.number(),
    total_daviplata: z.number(),
    total_returns: z.number(),
    sales_by_cajero: z.array(z.object({
        nombre: z.string(),
        total: z.number()
    })),
    avg_daviplata_verification_time: z.number().nullable(), // in minutes
    avg_sale_time_by_cajero: z.array(z.object({
        nombre: z.string(),
        avg_time_seconds: z.number(),
    })),
});
export type DashboardData = z.infer<typeof dashboardDataSchema>;


export const articleSaleSchema = z.object({
    producto_id: z.union([z.string(), z.number()]),
    nombre: z.string(),
    total_vendido: z.number(),
    recaudo_total: z.number(),
    imagen_url: z.string().nullable(),
});
export type ArticleSale = z.infer<typeof articleSaleSchema>;

export interface DetalleVentaConNombre extends DetalleVenta {
    nombre_producto: string;
}

export const ventaConDetallesSchema = z.object({
  id: z.union([z.string(), z.number()]),
  cajero_id: z.union([z.string(), z.number()]),
  subtotal: z.number(),
  efectivo_recibido: z.number(),
  cambio: z.number(),
  fecha_venta: z.string(),
  metodo_pago: z.enum(['Efectivo', 'Daviplata']),
  cajero_nombre: z.string(),
  detalles: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    venta_id: z.union([z.string(), z.number()]),
    producto_id: z.union([z.string(), z.number()]),
    cantidad: z.number(),
    precio_unitario: z.number(),
    subtotal: z.number(),
    nombre_producto: z.string(),
  })),
});
export type VentaConDetalles = z.infer<typeof ventaConDetallesSchema>;


export interface ArticleSaleDetail {
  netRevenue: number;
  netUnitsSold: number;
  numberOfTransactions: number;
  total_efectivo: number;
  total_daviplata: number;
}


// --- Article Management Types ---
export const articleSchema = z.object({
  nombre: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  precio: z.coerce.number({invalid_type_error: "El precio debe ser un número."}).positive({ message: "El precio debe ser un número positivo." }),
  imagen_url: z.string().url({ message: "Por favor ingrese una URL de imagen válida." }).or(z.literal('')).nullable(),
  activo: z.boolean(),
  stock_inicial: z.coerce.number({invalid_type_error: "El stock debe ser un número."}).int().min(0, { message: "El stock no puede ser negativo." }),
  visible_cliente: z.boolean().default(true),
});

export type ArticleFormData = z.infer<typeof articleSchema>;

// --- Cajero Management Types ---
export const cajeroSchema = z.object({
    nombre_completo: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    username: z.string().min(3, { message: "El username debe tener al menos 3 caracteres." }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }).or(z.literal('')),
    activo: z.boolean(),
    can_access_dashboard: z.boolean(),
    can_access_articles: z.boolean(),
    can_view_returns: z.boolean(),
    can_verify_daviplata: z.boolean(),
    can_access_ai_analysis: z.boolean(),
    can_view_logs: z.boolean(),
    can_access_cajeros: z.boolean(),
});
export type CajeroFormData = z.infer<typeof cajeroSchema>;


// --- Returns Types ---
export const returnFormSchema = z.object({
  producto_id: z.union([z.string().min(1, {message: "Debe seleccionar un artículo."}), z.number()]),
  cantidad: z.coerce.number().int().min(1, { message: "La cantidad debe ser al menos 1." }),
  cajero_id: z.union([z.string(), z.number()]),
});

export type ReturnFormData = z.infer<typeof returnFormSchema>;

export const returnDetailSchema = z.object({
  id: z.union([z.string(), z.number()]),
  producto_id: z.union([z.string(), z.number()]),
  producto_nombre: z.string(),
  cantidad: z.number(),
  monto_devolucion: z.number(),
  cajero_nombre: z.string(),
  fecha_devolucion: z.string(),
});
export type ReturnDetail = z.infer<typeof returnDetailSchema>;


// --- Audit Log Types ---
export interface AuditLog {
  id: string;
  fecha_evento: string;
  cajero_id: string;
  cajero_nombre: string;
  accion: string;
  descripcion: string;
  ip_address: string;
}

// --- AI Analysis Types ---

export const DashboardAnalysisInputSchema = z.object({
  generalData: dashboardDataSchema.extend({
      total_efectivo: z.number(),
      total_daviplata: z.number()
  }),
  articleSales: z.array(articleSaleSchema),
  allSales: z.array(ventaConDetallesSchema),
  returns: z.array(returnDetailSchema),
  question: z.string().optional(),
});
export type DashboardAnalysisInput = z.infer<typeof DashboardAnalysisInputSchema>;

export const DashboardAnalysisOutputSchema = z.string().describe('A detailed analysis in Markdown format.');
export type DashboardAnalysisOutput = z.infer<typeof DashboardAnalysisOutputSchema>;


// --- Daviplata Flow Types ---
export interface DaviplataOrderDetail {
  producto_id: string | number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  nombre_producto: string;
}

export interface DaviplataOrder {
  id: number;
  codigo_referencia: string;
  detalles: DaviplataOrderDetail[] | string; // It's a JSONB column, so it can be string or object
  total: number;
  estado: 'pendiente' | 'completada' | 'cancelada';
  fecha_creacion: string;
  venta_id: number | null;
  documento_cliente: string | null;
  daviplata_cliente: string | null;
}

// --- Daviplata AI Security Flow Types ---
export const DaviplatOrderSecurityInputSchema = z.object({
  total: z.number(),
  clientInfo: z.object({
    document: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
});
export type DaviplatOrderSecurityInput = z.infer<typeof DaviplatOrderSecurityInputSchema>;

export const DaviplatOrderSecurityOutputSchema = z.object({
  es_segura: z.boolean().describe("Determina si la transacción es segura y debe ser procesada."),
  motivo: z.string().describe("Si la transacción no es segura, explica brevemente la razón."),
});
export type DaviplatOrderSecurityOutput = z.infer<typeof DaviplatOrderSecurityOutputSchema>;


// --- Daviplata Chatbot Types ---
export interface DaviplataConversation {
    id?: number | string;
    session_id: string;
    sender: 'user' | 'ai' | 'admin';
    message: string;
    timestamp?: string;
    documento_cliente?: string | null;
    daviplata_cliente?: string | null;
    video_data_uri?: string | null;
}

export const DaviplataChatInputSchema = z.object({
    question: z.string(),
    sessionId: z.string().uuid(),
    history: z.array(z.object({
        sender: z.enum(['user', 'ai', 'admin']),
        message: z.string(),
    })),
    clientInfo: z.object({
        document: z.string().optional(),
        phone: z.string().optional(),
    }).optional(),
});
export type DaviplataChatInput = z.infer<typeof DaviplataChatInputSchema>;

export const DaviplataChatOutputSchema = z.object({
    answer: z.string().describe("The AI's answer to the user's question."),
});
export type DaviplataChatOutput = z.infer<typeof DaviplataChatOutputSchema>;


// --- Presence Types ---
export interface ActiveDaviplataUsers {
  total: number;
  states: {
    consultando: number;
    pagando: number;
    completado: number;
  };
}


// --- Cashier Warning AI Flow ---
export const CashierWarningInputSchema = z.object({
    pendingDaviplataOrdersCount: z.number().describe("Number of Daviplata orders paid but not yet redeemed."),
    avgDaviplataVerificationTime: z.number().nullable().describe("Average time in minutes to verify a Daviplata order."),
    activeDaviplataUsersInCompletedState: z.number().describe("Number of users who just completed their purchase online and are likely on their way."),
    cashierEfficiency: z.array(z.object({
        nombre: z.string(),
        avg_time_seconds: z.number(),
    })).describe("Average sale time per cashier."),
});
export type CashierWarningInput = z.infer<typeof CashierWarningInputSchema>;

export const CashierWarningOutputSchema = z.object({
    alerta_activa: z.boolean().describe("Whether an alert should be shown to the cashier."),
    mensaje: z.string().describe("The warning message to display. Empty if no alert is active."),
});
export type CashierWarningOutput = z.infer<typeof CashierWarningOutputSchema>;
