
'use client';

import type { Article } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PromotionsTabProps {
    promotions: Article[];
    onAddToCart: (article: Article) => void;
    getItemsInCart: (articleId: string) => number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
}

const getStockBadgeVariant = (stock?: number) => {
    if (typeof stock !== 'number') return 'default';
    if (stock <= 0) return 'destructive';
    if (stock <= 10) return 'yellow';
    return 'green';
}

const stockBadgeVariants = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
    default: 'bg-gray-200 text-gray-800'
}


export default function PromotionsTab({ promotions, onAddToCart, getItemsInCart }: PromotionsTabProps) {
    
    return (
        <div className="space-y-3">
            {promotions.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {promotions.map(promo => {
                        const itemsInCart = getItemsInCart(String(promo.id));
                        const hasStock = typeof promo.stock_disponible === 'number';
                        const isSoldOut = !promo.activo || (hasStock && promo.stock_disponible <= 0);

                        return (
                            <Card 
                                key={promo.id} 
                                className={cn(
                                    "flex flex-col overflow-hidden transition-all duration-200 relative",
                                    !isSoldOut ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "opacity-60 bg-gray-100"
                                )}
                                onClick={() => !isSoldOut && onAddToCart(promo)}
                            >
                                {itemsInCart > 0 && (
                                    <div className="absolute top-1 right-1 bg-accent text-accent-foreground h-5 w-5 flex items-center justify-center rounded-full text-xs font-bold z-10">
                                        {itemsInCart}
                                    </div>
                                )}
                                 {isSoldOut && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                        <p className="text-white font-bold text-lg">{!promo.activo ? 'INACTIVO' : 'AGOTADO'}</p>
                                    </div>
                                )}
                                <CardHeader className="p-3 pb-0 flex-grow">
                                    <CardTitle className="text-sm font-semibold">{promo.nombre}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 flex justify-between items-center mt-auto">
                                    <p className="font-bold text-base text-primary">{formatCurrency(promo.precio)}</p>
                                     {hasStock && (
                                        <Badge
                                            className={cn(
                                                "flex items-center gap-1 text-xs font-normal border-none",
                                                stockBadgeVariants[getStockBadgeVariant(promo.stock_disponible)]
                                            )}
                                            title={`Quedan ${promo.stock_disponible} en inventario`}
                                        >
                                            <Package className="h-3 w-3" />
                                            <span>{promo.stock_disponible}</span>
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                 </div>
            ) : (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No hay promociones disponibles en este momento.</p>
                    <p className="text-xs">Añade artículos con el nombre "Promoción..." para que aparezcan aquí.</p>
                </div>
            )}
        </div>
    )
}
