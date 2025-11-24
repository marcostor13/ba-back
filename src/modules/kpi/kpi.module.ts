import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KpiService } from './kpi.service';
import { KpiController } from './kpi.controller';
import { Quote, QuoteSchema } from '../quote/schemas/quote.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { Payment, PaymentSchema } from '../payment/schemas/payment.schema';
import { Invoice, InvoiceSchema } from '../invoice/schemas/invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService],
})
export class KpiModule {}

