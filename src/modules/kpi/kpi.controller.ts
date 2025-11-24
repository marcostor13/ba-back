import { Controller, Get, Query } from '@nestjs/common';
import { KpiService } from './kpi.service';

@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get()
  async getKpis(@Query('companyId') companyId?: string) {
    return this.kpiService.getKpisByCompany(companyId);
  }

  @Get('quotes')
  async getQuotesKpis(@Query('companyId') companyId?: string) {
    return this.kpiService.getQuotesKpis(companyId);
  }

  @Get('projects')
  async getProjectsKpis(@Query('companyId') companyId?: string) {
    return this.kpiService.getProjectsKpis(companyId);
  }

  @Get('payments')
  async getPaymentsKpis(@Query('companyId') companyId?: string) {
    return this.kpiService.getPaymentsKpis(companyId);
  }

  @Get('invoices')
  async getInvoicesKpis(@Query('companyId') companyId?: string) {
    return this.kpiService.getInvoicesKpis(companyId);
  }
}
