import { Controller, Get, Query } from '@nestjs/common';
import { KpiService } from './kpi.service';

@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get()
  async getKpis(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getKpisByCompany(companyId, userId, startDate, endDate);
  }

  @Get('sales-dashboard')
  async getSalesDashboard(
    @Query('companyId') companyId: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getSalesDashboard(companyId, userId, startDate, endDate);
  }

  @Get('quotes')
  async getQuotesKpis(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getQuotesKpis(companyId, userId, startDate, endDate);
  }

  @Get('projects')
  async getProjectsKpis(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getProjectsKpis(companyId, userId, startDate, endDate);
  }

  @Get('payments')
  async getPaymentsKpis(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getPaymentsKpis(companyId, userId, startDate, endDate);
  }

  @Get('invoices')
  async getInvoicesKpis(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getInvoicesKpis(companyId, userId, startDate, endDate);
  }
}
