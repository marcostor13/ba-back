import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateKitchenQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { Quote } from './schemas/quote.schema';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
  ) { }

  async createKitchenQuote(dto: CreateKitchenQuoteDto) {
    const created = await this.quoteModel.create({
      data: dto as unknown as Record<string, unknown>,
      category: 'kitchen',
    });
    return created.toObject();
  }

  async findAll(category?: string) {
    const filter: Record<string, unknown> = {};
    if (category) {
      filter.category = category;
    }
    return this.quoteModel.find(filter).sort({ createdAt: -1 }).lean().exec();
  }

  async findById(id: string) {
    return this.quoteModel.findById(id).lean().exec();
  }

  async updateById(id: string, update: UpdateQuoteDto) {
    const updateDoc: Record<string, unknown> = {};
    if (update.category !== undefined) updateDoc.category = update.category;
    if (update.data !== undefined) updateDoc.data = update.data;
    return this.quoteModel
      .findByIdAndUpdate(id, updateDoc, { new: true })
      .lean()
      .exec();
  }
}