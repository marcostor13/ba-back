import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './schemas/comment.schema';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('comment')
@UseGuards(AuthGuard('jwt'))
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  findAllByProject(@Query('projectId') projectId: string): Promise<Comment[]> {
    return this.commentService.findAllByProject(projectId);
  }

  @Post()
  create(
    @Body(validationPipe) body: CreateCommentDto,
    @Request() req: { user: { userId: string } },
  ): Promise<Comment> {
    return this.commentService.create(body.projectId, req.user.userId, { text: body.text });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(validationPipe) dto: UpdateCommentDto,
    @Request() req: { user: { userId: string } },
  ): Promise<Comment | null> {
    return this.commentService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ): Promise<void> {
    await this.commentService.remove(id, req.user.userId);
  }
}
