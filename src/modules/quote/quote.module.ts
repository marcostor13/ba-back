import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { Customer, CustomerSchema } from '../customer/entities/customer.entity';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    MailModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}
