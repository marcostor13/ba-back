import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateKitchenQuoteRequestDto } from './dto/create-kitchen-quote-request.dto';
import { Quote } from './schemas/quote.schema';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
  ) { }

  async createKitchenQuote(dto: CreateKitchenQuoteRequestDto) {
    const created = await this.quoteModel.create({
      customer: dto.customer,
      company: dto.company,
      kitchenInformation: dto.kitchenInformation,
      materials: dto.materials,
      experience: dto.experience,
      totalPrice: dto.totalPrice,
      formData: dto.formData,
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

  async updateById(
    id: string,
    update: Partial<CreateKitchenQuoteRequestDto> & { category?: string },
  ) {
    const updateDoc: Record<string, unknown> = {};
    if (update.category !== undefined) updateDoc.category = update.category;
    if (update.customer !== undefined) updateDoc.customer = update.customer;
    if (update.company !== undefined) updateDoc.company = update.company;
    if (update.kitchenInformation !== undefined) updateDoc.kitchenInformation = update.kitchenInformation;
    if (update.materials !== undefined) updateDoc.materials = update.materials;
    if (update.experience !== undefined) updateDoc.experience = update.experience;
    if (update.totalPrice !== undefined) updateDoc.totalPrice = update.totalPrice;
    if (update.formData !== undefined) updateDoc.formData = update.formData;
    return this.quoteModel
      .findByIdAndUpdate(id, updateDoc, { new: true })
      .lean()
      .exec();
  }
}