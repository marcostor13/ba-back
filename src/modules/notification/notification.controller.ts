import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { Notification } from './schemas/notification.schema';

@Controller('notification')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findByUser(
    @Request() req: { user: { userId: string } },
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ): Promise<Notification[]> {
    const options = {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.notificationService.findByUser(req.user.userId, options);
  }

  @Post(':id/read')
  markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ): Promise<Notification | null> {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @Post('read-all')
  async markAllAsRead(@Request() req: { user: { userId: string } }): Promise<void> {
    await this.notificationService.markAllAsRead(req.user.userId);
  }
}
