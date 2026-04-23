import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ProjectService } from '../project/project.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    private readonly projectService: ProjectService,
  ) {}

  async create(projectId: string, userId: string, dto: { text: string }): Promise<Comment> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const comment = new this.commentModel({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
      text: dto.text.trim(),
    });
    return comment.save();
  }

  async findAllByProject(projectId: string): Promise<Comment[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.commentModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async update(id: string, userId: string, dto: UpdateCommentDto): Promise<Comment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment ID format');
    }

    const comment = await this.commentModel.findById(id).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.text = dto.text.trim();
    return comment.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comment ID format');
    }

    const comment = await this.commentModel.findById(id).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentModel.findByIdAndDelete(id).exec();
  }
}
