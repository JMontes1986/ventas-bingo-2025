'use client';

import { useState, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { MinusCircle, PlusCircle, XCircle, ShoppingCart, Loader2, Trash2, CreditCard, ShieldCheck } from 'lucide-react';
import type { CartItem } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CartProps {
  cartItems: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  onRecordSale: (cashReceived: number, paymentMethod: 'Efectivo' | 'Daviplata') => void;
  isSubmitting: boolean;
}

type PaymentMethod = 'Efectivo' | 'Daviplata';

export default function Cart({ cartItems, setCart, onRecordSale, isSubmitting }: CartProps) {
  const [cashReceived, setCashReceived] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  const parseFormattedNumber = (value: string) => {
    return parseFloat(value.replace(/\./g, '').replace(/,/g, '.'));
  };

  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (rawValue === '') {
        setCashReceived('');
        return;
    }
    const numericValue = Number(rawValue);
    if (!isNaN(numericValue)) {
        const formattedValue = new Intl.NumberFormat('es-CO').format(numericValue);
        setCashReceived(formattedValue);
    }
  };


  const updateQuantity = (productId: string | number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity: newQuantity } : item))
      );
    }
  };
  
  const handleClearCart = () => {
    setCart([]);
    setCashReceived('');
    setPaymentMethod('Efectivo');
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.precio * item.quantity, 0);
  }, [cartItems]);

  const change = useMemo(() => {
    if (paymentMethod !== 'Efectivo') return 0;
    const cash = parseFormattedNumber(cashReceived);
    if (!isNaN(cash) && cash >= subtotal) {
      return cash - subtotal;
    }
    return 0;
  }, [cashReceived, subtotal, paymentMethod]);

  const canFinalize = useMemo(() => {
    return cartItems.length > 0 && !isSubmitting;
  }, [cartItems, isSubmitting]);

  const handleFinalize = () => {
    if(canFinalize) {
      const cash = parseFormattedNumber(cashReceived);
      const cashToRecord = !isNaN(cash) && cash >= subtotal ? cash : subtotal;
      onRecordSale(cashToRecord, paymentMethod);
      setCashReceived('');
      setPaymentMethod('Efectivo');
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="text-accent" />
            Venta Actual
            <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger>
                      <ShieldCheck className="h-5 w-5 text-blue-500"/>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Asegurado por IA Molly Colgemelli</p>
                  </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          {cartItems.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearCart}
              className="h-7 w-7 text-destructive/80 hover:text-destructive"
              aria-label="Vaciar venta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3">
        {cartItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">El carrito está vacío.</p>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <div className="flex-grow">
                  <p className="font-medium truncate">{item.nombre}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.precio)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <span className="font-bold w-4 text-center text-xs">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="font-semibold w-16 text-right text-xs">{formatCurrency(item.precio * item.quantity)}</p>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/80 hover:text-destructive" onClick={() => updateQuantity(item.id, 0)}>
                    <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Separator />
        <div className="space-y-3 text-base">
           <RadioGroup
            value={paymentMethod}
            onValueChange={(value: string) => setPaymentMethod(value as PaymentMethod)}
            className="grid grid-cols-2 gap-4"
            disabled={cartItems.length === 0}
          >
            <div>
              <RadioGroupItem value="Efectivo" id="r1" className="sr-only" />
              <Label
                htmlFor="r1"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-transparent p-2 transition-colors cursor-pointer",
                  paymentMethod === 'Efectivo' 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Efectivo
              </Label>
            </div>
            <div>
              <RadioGroupItem value="Daviplata" id="r2" className="sr-only" />
               <Label
                htmlFor="r2"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-transparent p-2 transition-colors cursor-pointer",
                   paymentMethod === 'Daviplata' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                )}
              >
                Daviplata
              </Label>
            </div>
          </RadioGroup>
          <div className="flex justify-between font-bold">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {paymentMethod === 'Efectivo' && (
            <>
              <div className="flex justify-between items-center">
                <Label htmlFor="cash-received" className="font-semibold text-sm">Efectivo</Label>
                <Input
                  id="cash-received"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  className="w-28 h-9 text-right font-mono text-sm"
                  value={cashReceived}
                  onChange={handleCashChange}
                  disabled={isSubmitting || cartItems.length === 0}
                />
              </div>
              <div className="flex justify-between font-bold text-accent">
                <span>Cambio</span>
                <span>{formatCurrency(change)}</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 p-3">
        <Button size="lg" className="w-full" disabled={!canFinalize} onClick={handleFinalize}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : paymentMethod === 'Daviplata' ? (
            <CreditCard className="mr-2 h-4 w-4" />
          ) : null}
          {isSubmitting ? 'Registrando...' : `Finalizar Venta ${paymentMethod === 'Daviplata' ? '(Daviplata)' : ''}`}
        </Button>
      </CardFooter>
    </Card>
  );
}
