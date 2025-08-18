import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './entities/customer.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class CustomerService {

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>
  ) { }

  create(createCustomerDto: CreateCustomerDto) {
    return this.customerModel.create(createCustomerDto);
  }

  findAll() {
    return this.customerModel.find().exec();
  }

  findOne(id: string) {
    return this.customerModel.findById(id).exec();
  }

  update(id: string, updateCustomerDto: UpdateCustomerDto) {
    return this.customerModel.findByIdAndUpdate(id, updateCustomerDto, { new: true }).exec();
  }

  remove(id: string) {
    return this.customerModel.findByIdAndDelete(id).exec();
  }
}
