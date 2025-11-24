import { Controller, Post, Body, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto, ConfirmPaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatus } from './schemas/payment.schema';

@Controller('payment')
// @UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-intent')
  createIntent(@Body() createPaymentIntentDto: CreatePaymentIntentDto) {
    return this.paymentService.createPaymentIntent(createPaymentIntentDto);
  }

  @Post('confirm')
  confirmPayment(@Body() confirmPaymentDto: ConfirmPaymentDto) {
    return this.paymentService.confirmPaymentSuccess(confirmPaymentDto);
  }
  
  @Get('invoice/:id')
  getPayments(@Param('id') id: string) {
      return this.paymentService.getInvoicePayments(id);
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.paymentService.findAll(companyId, undefined, customerId, status);
  }
}
