import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { Project, ProjectSchema } from './schemas/project.schema';
import { Quote, QuoteSchema } from '../quote/schemas/quote.schema';
import { StatusHistoryModule } from '../status-history/status-history.module';
import { AuthModule } from '../auth/auth.module';
import { RoleModule } from '../role/role.module';
import { CustomerModule } from '../customer/customer.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Quote.name, schema: QuoteSchema },
    ]),
    AuthModule,
    StatusHistoryModule,
    RoleModule,
    CustomerModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}

