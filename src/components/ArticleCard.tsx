
'use client';

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Article } from '@/types';
import { Package, Star, Undo2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ArticleStats {
  directSales: number;
  promoSales: number;
  returns: number;
  stock?: number;
  reserved?: number;
}

interface ArticleCardProps {
  article: Article;
  stats: ArticleStats;
  onAddToCart: (article: Article) => void;
}

const StatBadge = ({ value, icon: Icon, className, label }: { value: number; icon: React.ElementType; className?: string; label: string }) => {
  if (value <= 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn("flex items-center gap-1 text-xs font-normal border-none", className)}
          >
            <Icon className="h-3 w-3" />
            <span>{value}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{value} {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};


export default function ArticleCard({ article, stats, onAddToCart }: ArticleCardProps) {
  const imageUrl = article.imagen_url || 'https://placehold.co/300x300.png';
  
  const hasStock = typeof stats.stock === 'number';
  const isSoldOut = !article.activo || (hasStock && stats.stock <= 0);
  const canBeSold = !isSoldOut;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  const handleCardClick = () => {
    if(canBeSold) {
        onAddToCart(article);
    }
  }

  return (
    <Card 
        className={cn(
            "flex flex-col overflow-hidden transition-all duration-200",
            canBeSold ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "opacity-60 bg-gray-100"
        )}
        onClick={handleCardClick}
    >
      <CardHeader className="p-0 relative">
        <div className="aspect-square relative w-full">
          <Image
            src={imageUrl}
            alt={article.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            quality={75}
            className="object-cover"/>
            {isSoldOut && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <p className="text-white font-bold text-lg">{!article.activo ? 'INACTIVO' : 'AGOTADO'}</p>
                </div>
            )}
        </div>
      </CardHeader>
      <CardContent className="p-2 flex-grow flex flex-col justify-between">
        <div className="flex-grow">
          <h3 className="font-semibold text-xs sm:text-sm leading-tight flex flex-col">
            {article.nombre}
          </h3>
        </div>
        <div className="flex gap-1 flex-wrap mt-1 items-center">
            {hasStock && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className="text-xs font-normal border-none bg-yellow-200 text-yellow-800 hover:bg-yellow-300">
                                <Package className="h-3 w-3 mr-1"/>
                                {stats.stock!}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>{stats.stock!} en inventario</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            <StatBadge value={stats.directSales} icon={Package} className="bg-secondary text-secondary-foreground" label="Vendidos"/>
            <StatBadge value={stats.promoSales} icon={Star} className="bg-secondary text-secondary-foreground" label="En Promoción"/>
            <StatBadge value={stats.returns} icon={Undo2} className="bg-destructive/80 text-destructive-foreground" label="Devueltos"/>
            <StatBadge value={stats.reserved || 0} icon={User} className="bg-green-200 text-green-800 hover:bg-green-300" label="Reservados en Daviplata"/>
        </div>
      </CardContent>
      <CardFooter className="p-2 pt-0 flex justify-between items-center mt-auto">
        <p className="font-bold text-sm sm:text-base text-primary">
            {formatCurrency(article.precio)}
        </p>
      </CardFooter>
    </Card>
  );
}

    