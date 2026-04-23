import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer, CustomerDocument } from './entities/customer.entity';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RoleService } from '../role/role.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private readonly usersService: UsersService,
    private readonly roleService: RoleService,
    private readonly mailService: MailService,
  ) { }

  async create(createCustomerDto: CreateCustomerDto) {
    const normalizedEmail = createCustomerDto.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('El correo electrónico es obligatorio');
    }

    const existingUser = await this.usersService.findOne(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('Ya existe un usuario registrado con este correo');
    }

    const tempPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const fullName = this.buildFullName(createCustomerDto);

    const user = await this.usersService.create({
      email: normalizedEmail,
      name: fullName,
      password: hashedPassword,
    });

    if (!user || !user._id) {
      throw new BadRequestException('No se pudo crear el usuario asociado al cliente');
    }

    const customerData: Record<string, unknown> = {
      ...createCustomerDto,
      email: normalizedEmail,
      userId: user._id,
    };

    // Ensure addresses array is populated if root address is provided
    if (createCustomerDto.address && (!createCustomerDto.addresses || createCustomerDto.addresses.length === 0)) {
      customerData.addresses = [{
        label: 'Primary',
        address: createCustomerDto.address,
        city: createCustomerDto.city || '',
        state: createCustomerDto.state || '',
        zipCode: createCustomerDto.zipCode || '',
        isPrimary: true
      }];
    }

    if (createCustomerDto.companyId) {
      customerData.companyId = new Types.ObjectId(createCustomerDto.companyId);
    }

    try {
      const customer = await this.customerModel.create(customerData);
      await this.roleService.create({ name: 'customer', userId: user._id });

      try {
        await this.mailService.sendCustomerWelcomeCredentials({
          to: normalizedEmail,
          name: fullName,
          tempPassword,
        });
      } catch (mailError: unknown) {
        this.logger.warn(
          `Cliente creado pero no se pudo enviar el correo de bienvenida a ${normalizedEmail}. ` +
            `Use "Restablecer contraseña" desde el login o revise la configuración SMTP. Error: ${mailError instanceof Error ? mailError.message : String(mailError)}`,
        );
      }

      return customer;
    } catch (error) {
      await this.usersService.deleteById(user._id);
      throw error;
    }
  }

  findAll(companyId?: string) {
    const filter: Record<string, unknown> = {};
    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      filter.companyId = new Types.ObjectId(companyId);
    }
    return this.customerModel.find(filter).exec();
  }

  findOne(id: string) {
    return this.customerModel.findById(id).exec();
  }

  findByUserId(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.customerModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  anonymizeByUserId(userId: string): Promise<unknown> {
    if (!Types.ObjectId.isValid(userId)) {
      return Promise.resolve(null);
    }
    const uid = new Types.ObjectId(userId);
    return this.customerModel
      .updateOne(
        { userId: uid },
        {
          $set: {
            name: 'Deleted',
            lastName: 'User',
            email: `deleted_${userId}@anonymous.local`,
            phone: '',
            address: '',
            city: '',
            zipCode: '',
            state: '',
            leadSource: '',
            description: '',
          },
        },
      )
      .exec();
  }

  removeByUserId(userId: string): Promise<unknown> {
    if (!Types.ObjectId.isValid(userId)) {
      return Promise.resolve(null);
    }
    return this.customerModel.deleteMany({ userId: new Types.ObjectId(userId) }).exec();
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const updateData: Record<string, unknown> = { ...updateCustomerDto };
    
    if (updateCustomerDto.companyId) {
      updateData.companyId = new Types.ObjectId(updateCustomerDto.companyId);
    }

    // Sync logic: if addresses provided, sync primary to root fields
    if (updateCustomerDto.addresses && updateCustomerDto.addresses.length > 0) {
      const primary = updateCustomerDto.addresses.find(a => a.isPrimary) || updateCustomerDto.addresses[0];
      if (primary) {
        updateData.address = primary.address;
        updateData.city = primary.city;
        updateData.state = primary.state;
        updateData.zipCode = primary.zipCode;
      }
    } 
    // If root fields updated but not addresses, update/create primary address
    else if (updateCustomerDto.address || updateCustomerDto.city || updateCustomerDto.state || updateCustomerDto.zipCode) {
      const currentCustomer = await this.customerModel.findById(id).lean();
      if (currentCustomer) {
        let addresses = currentCustomer.addresses || [];
        const primaryIndex = addresses.findIndex(a => a.isPrimary);
        
        const newAddress = {
          label: 'Primary',
          address: updateCustomerDto.address ?? currentCustomer.address ?? '',
          city: updateCustomerDto.city ?? currentCustomer.city ?? '',
          state: updateCustomerDto.state ?? currentCustomer.state ?? '',
          zipCode: updateCustomerDto.zipCode ?? currentCustomer.zipCode ?? '',
          isPrimary: true
        };

        if (primaryIndex >= 0) {
          addresses[primaryIndex] = { ...addresses[primaryIndex], ...newAddress };
        } else {
          addresses.push(newAddress);
        }
        updateData.addresses = addresses;
      }
    }

    return this.customerModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  remove(id: string) {
    return this.customerModel.findByIdAndDelete(id).exec();
  }

  private generateTemporaryPassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*?&';
    let password = '';
    for (let i = 0; i < length; i += 1) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private buildFullName(dto: CreateCustomerDto): string {
    const parts = [dto.name, dto.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : dto.email;
  }
}
