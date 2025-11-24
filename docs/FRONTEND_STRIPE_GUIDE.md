# Guía de Implementación de Pagos con Stripe (Frontend)

Esta guía detalla los pasos necesarios para implementar el flujo de pagos en el frontend (Angular) utilizando la integración creada en el backend.

## Requisitos Previos

1.  Instalar la librería de Stripe para Angular (o usar `ngx-stripe` o directamente `@stripe/stripe-js`).
    ```bash
    npm install @stripe/stripe-js
    ```
2.  Tener la Clave Pública de Stripe (`STRIPE_PUBLIC_KEY`) configurada en `environment.ts`.

---

## Flujo de Pago

El flujo consta de tres pasos principales:

1.  **Seleccionar Cuota**: El usuario elige qué parte del plan de pagos va a abonar.
2.  **Iniciar Intento de Pago**: Se solicita al backend el `client_secret` enviando el monto y el ID de la factura.
3.  **Confirmar Pago**: Se usa el `client_secret` para procesar la tarjeta con Stripe y luego se notifica al backend para actualizar el estado.

---

## Implementación Paso a Paso

### 1. Visualizar Factura y Plan de Pagos

La factura contiene un array `paymentPlan` con las cuotas. Muestra estas cuotas al usuario y permite seleccionar una que tenga estado `pending`.

```typescript
// Ejemplo de estructura de factura recibida del backend
interface Invoice {
  _id: string;
  totalAmount: number;
  paymentPlan: {
    name: string; // "Advance 50%"
    percentage: number;
    amount: number;
    status: 'pending' | 'paid';
  }[];
  // ...
}
```

### 2. Crear Componente de Pago (Stripe Elements)

En tu componente de pago (ej. `PaymentModalComponent`), inicializa Stripe Elements.

```typescript
import { loadStripe } from '@stripe/stripe-js';

// ... en tu componente
stripePromise = loadStripe(environment.stripePublicKey);
elements: any;
card: any;

async ngOnInit() {
  const stripe = await this.stripePromise;
  this.elements = stripe.elements();
  this.card = this.elements.create('card');
  this.card.mount('#card-element'); // Un div con id="card-element" en tu HTML
}
```

### 3. Procesar el Pago

Cuando el usuario hace clic en "Pagar", ejecuta la siguiente lógica:

```typescript
async pagarCuota(invoiceId: string, amount: number, installmentIndex: number) {
  try {
    // PASO A: Solicitar PaymentIntent al Backend
    const intentResponse = await this.http.post('/payment/create-intent', {
      invoiceId,
      amount,
      installmentIndex
    }).toPromise();

    const clientSecret = intentResponse.clientSecret;
    const stripe = await this.stripePromise;

    // PASO B: Confirmar pago con Stripe (Muestra modal 3DS si es necesario)
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: this.card,
        billing_details: {
          name: 'Nombre del Cliente', // Opcional pero recomendado
        },
      },
    });

    if (result.error) {
      // Manejar error (tarjeta rechazada, etc.)
      console.error(result.error.message);
      alert('Error en el pago: ' + result.error.message);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        // PASO C: Notificar éxito al Backend y actualizar estado
        await this.confirmarEnBackend(result.paymentIntent.id, invoiceId, installmentIndex);
        alert('Pago exitoso!');
      }
    }
  } catch (error) {
    console.error('Error de servidor', error);
  }
}

async confirmarEnBackend(paymentIntentId: string, invoiceId: string, installmentIndex: number) {
  return this.http.post('/payment/confirm', {
    paymentIntentId,
    invoiceId,
    installmentIndex
  }).toPromise();
}
```

---

## Endpoints Clave Utilizados

### 1. Crear Factura (Estimador)
*   **POST** `/invoice`
*   Body:
    ```json
    {
      "quoteId": "...",
      "paymentPlan": [
        { "name": "Anticipo", "percentage": 50 },
        { "name": "Final", "percentage": 50 }
      ]
    }
    ```

### 2. Iniciar Pago (Cliente)
*   **POST** `/payment/create-intent`
*   Body:
    ```json
    {
      "invoiceId": "...",
      "amount": 2500,
      "installmentIndex": 0
    }
    ```
*   Response: `{ "clientSecret": "pi_123...", "id": "pi_123..." }`

### 3. Confirmar Pago (Cliente -> Backend)
*   **POST** `/payment/confirm`
*   Body:
    ```json
    {
      "paymentIntentId": "pi_123...",
      "invoiceId": "...",
      "installmentIndex": 0
    }
    ```

---

## Notas de Diseño UI/UX

*   **Feedback Visual**: Muestra un spinner o indicador de carga mientras se procesa el pago, ya que Stripe puede tardar unos segundos.
*   **Manejo de Errores**: Muestra claramente los mensajes de error de Stripe (ej. "Fondos insuficientes").
*   **Seguridad**: Nunca manejes números de tarjeta directamente; usa siempre Stripe Elements.

