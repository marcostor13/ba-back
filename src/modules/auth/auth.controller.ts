import { Controller, Post, UseGuards, Request, HttpCode, HttpStatus, Get, Req, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return await this.authService.register(registerDto);
    }

    // Ruta de login con la estrategia 'local'
    @UseGuards(AuthGuard('local'))
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() req) {
        return this.authService.login(req);
    }

    // Ejemplo de ruta protegida con JWT
    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }

    // Inicia el flujo de Google OAuth
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) {
        // Este método no se ejecuta, la guard redirige a Google
    }

    // Callback de Google OAuth
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    googleAuthRedirect(@Req() req) {
        // Aquí procesas la información del usuario y generas un JWT si es necesario
        return req.user;
    }

    @Post('login-with-google')
    async loginWithGoogle(@Body() userData: any) {
        return this.authService.loginWithGoogle(userData);
    }

    @Post('refresh-token')
    async refreshToken(@Body() userData: any) {
        return this.authService.refreshToken(userData);
    }

    @Post('password-reset/request')
    async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
        return this.authService.requestPasswordReset(requestPasswordResetDto);
    }

    @Post('password-reset/confirm')
    async confirmPasswordReset(@Body() confirmPasswordResetDto: ConfirmPasswordResetDto) {
        return this.authService.confirmPasswordReset(confirmPasswordResetDto);
    }
}