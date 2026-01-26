import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quote, QuoteStatus } from '../quote/schemas/quote.schema';
import { Project, ProjectStatus } from '../project/schemas/project.schema';
import { Payment, PaymentStatus } from '../payment/schemas/payment.schema';
import { Invoice, InvoiceStatus } from '../invoice/schemas/invoice.schema';
import { StatusHistoryService } from '../status-history/status-history.service';

@Injectable()
export class KpiService {
  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>,
    private readonly statusHistoryService: StatusHistoryService,
  ) {}

  private validateFilters(companyId?: string, userId?: string, startDate?: string, endDate?: string) {
    const filter: Record<string, any> = {};

    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      filter.companyId = new Types.ObjectId(companyId);
    }

    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid userId format');
      }
      filter.userId = new Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    return filter;
  }

  async getKpisByCompany(companyId?: string, userId?: string, startDate?: string, endDate?: string) {
    const filters = this.validateFilters(companyId, userId, startDate, endDate);

    const [
      totalQuotes,
      quotesByStatus,
      totalProjects,
      projectsByStatus,
      totalPayments,
      totalRevenue,
      totalInvoices,
      invoicesByStatus,
      invoicesTotals,
    ] = await Promise.all([
      // Quotes
      this.quoteModel.countDocuments(filters).exec(),
      this.quoteModel.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      // Projects
      this.projectModel.countDocuments(filters).exec(),
      this.projectModel.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      // Payments
      this.paymentModel.countDocuments(filters).exec(),
      this.paymentModel.aggregate([
        { $match: { ...filters, status: PaymentStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).exec(),
      // Invoices
      this.invoiceModel.countDocuments(filters).exec(),
      this.invoiceModel.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.invoiceModel.aggregate([
        { $match: filters },
        { $group: { _id: null, totalBilled: { $sum: '$totalAmount' }, totalPaid: { $sum: '$paidAmount' } } },
      ]).exec(),
    ]);

    const approvedQuotes = await this.quoteModel.countDocuments({
      ...filters,
      status: QuoteStatus.APPROVED,
    }).exec();

    const conversionRate =
      totalQuotes > 0 ? ((approvedQuotes / totalQuotes) * 100).toFixed(2) : '0.00';

    const revenue = totalRevenue[0]?.total || 0;
    const billed = invoicesTotals[0]?.totalBilled || 0;
    const collected = invoicesTotals[0]?.totalPaid || 0;
    const pending = billed - collected;

    return {
      quotes: {
        total: totalQuotes,
        byStatus: this.reduceByStatus(quotesByStatus),
        approved: approvedQuotes,
        conversionRate: parseFloat(conversionRate),
      },
      projects: {
        total: totalProjects,
        byStatus: this.reduceByStatus(projectsByStatus),
      },
      payments: {
        total: totalPayments,
        totalRevenue: revenue,
      },
      invoices: {
        total: totalInvoices,
        byStatus: this.reduceByStatus(invoicesByStatus),
        totalBilled: billed,
        totalCollected: collected,
        totalPending: pending,
      },
    };
  }

  async getSalesDashboard(companyId: string, userId?: string, startDate?: string, endDate?: string) {
    const filters = this.validateFilters(companyId, userId, startDate, endDate);

    const [
      kpis,
      averageTimeQuotes,
      averageTimeProjects,
    ] = await Promise.all([
      this.getKpisByCompany(companyId, userId, startDate, endDate),
      this.statusHistoryService.getAverageTimePerStage(
        companyId, 
        'quote', 
        startDate ? new Date(startDate) : undefined, 
        endDate ? new Date(endDate) : undefined
      ),
      this.statusHistoryService.getAverageTimePerStage(
        companyId, 
        'project', 
        startDate ? new Date(startDate) : undefined, 
        endDate ? new Date(endDate) : undefined
      ),
    ]);

    const totalRevenue = kpis.payments.totalRevenue;
    const approvedCount = kpis.quotes.approved;
    const averageTicket = approvedCount > 0 ? parseFloat((totalRevenue / approvedCount).toFixed(2)) : 0;

    return {
      revenue: totalRevenue,
      pipeline: kpis.quotes.byStatus,
      conversionRate: kpis.quotes.conversionRate,
      averageTicket,
      timesPerStage: {
        quote: averageTimeQuotes,
        project: averageTimeProjects,
      },
    };
  }

  async getQuotesKpis(companyId?: string, userId?: string, startDate?: string, endDate?: string) {
    const filters = this.validateFilters(companyId, userId, startDate, endDate);

    const [total, byCategory, byStatus, approved] = await Promise.all([
      this.quoteModel.countDocuments(filters).exec(),
      this.quoteModel.aggregate([
        { $match: filters },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]).exec(),
      this.quoteModel.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.quoteModel.countDocuments({
        ...filters,
        status: QuoteStatus.APPROVED,
      }).exec(),
    ]);

    return {
      total,
      byCategory: this.reduceByStatus(byCategory),
      byStatus: this.reduceByStatus(byStatus),
      approved,
      conversionRate: total > 0 ? ((approved / total) * 100).toFixed(2) : '0.00',
    };
  }

  async getProjectsKpis(companyId?: string, userId?: string, startDate?: string, endDate?: string) {
    const filters = this.validateFilters(companyId, userId, startDate, endDate);

    const [total, byStatus, active] = await Promise.all([
      this.projectModel.countDocuments(filters).exec(),
      this.projectModel.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.projectModel.countDocuments({
        ...filters,
        status: { $in: [ProjectStatus.PENDING, ProjectStatus.IN_PROGRESS] },
      }).exec(),
    ]);

    return {
      total,
      byStatus: this.reduceByStatus(byStatus),
      active,
    };
  }

  async getPaymentsKpis(companyId?: string, userId?: string, startDate?: string, endDate?: string) {
    const filters = this.validateFilters(companyId, userId, startDate, endDate);

    const [total, byStatus, revenue, lastPayments] = await Promise.all([
      this.paymentModel.countDocuments(filters).exec(),
      this.paymentModel.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.paymentModel.aggregate([
        { $match: { ...filters, status: PaymentStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).exec(),
      this.paymentModel.find(filters).sort({ createdAt: -1 }).limit(5).exec(),
    ]);

    return {
      total,
      byStatus: this.reduceByStatus(byStatus),
      totalRevenue: revenue[0]?.total || 0,
      recent: lastPayments,
    };
  }

  async getInvoicesKpis(companyId?: string, userId?: string, startDate?: string, endDate?: string) {
    const filters = this.validateFilters(companyId, userId, startDate, endDate);

    const [total, byStatus, totals] = await Promise.all([
      this.invoiceModel.countDocuments(filters).exec(),
      this.invoiceModel.aggregate([
        { $match: filters },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.invoiceModel.aggregate([
        { $match: filters },
        { $group: { _id: null, billed: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' } } },
      ]).exec(),
    ]);

    const billed = totals[0]?.billed || 0;
    const paid = totals[0]?.paid || 0;

    return {
      total,
      byStatus: this.reduceByStatus(byStatus),
      financials: {
        billed,
        paid,
        pending: billed - paid,
      },
    };
  }

  private reduceByStatus(data: any[]) {
    return data.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
