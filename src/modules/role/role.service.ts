import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './entities/role.entity';


@Injectable()
export class RoleService {

  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>
  ) { }

  create(createRoleDto: CreateRoleDto) {
    return this.roleModel.create(createRoleDto);
  }

  findAll() {
    return this.roleModel.find();
  }

  findOne(id: string) {
    return this.roleModel.findById(id);
  }

  findByUserId(userId: string) {
    return this.roleModel.findOne({ userId });
  }

  update(id: string, updateRoleDto: UpdateRoleDto) {
    return this.roleModel.findByIdAndUpdate(id, updateRoleDto, { new: true });
  }

  remove(id: string) {
    return this.roleModel.findByIdAndDelete(id);
  }
}
