import { 
  Controller, 
  Post, 
  Body, 
  Headers, 
  UseGuards, 
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Endpoint de login - Compatible con el frontend existente
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const tenant = tenantId || 'richarq';
    const result = await this.authService.login(loginDto, tenant);
    
    return {
      success: true,
      message: 'Login exitoso',
      data: result,
    };
  }

  /**
   * POST /api/auth/verify-token
   * Verifica si el token JWT es válido
   */
  @Post('verify-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Request() req) {
    return {
      success: true,
      message: 'Token válido',
      data: {
        user: req.user,
        valid: true,
      },
    };
  }

  /**
   * POST /api/auth/first-login-change-password
   * Cambio de contraseña en el primer login
   */
  @Post('first-login-change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(
      req.user.id,
      changePasswordDto,
    );
    
    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
      data: result,
    };
  }

  /**
   * POST /api/auth/forgot-password
   * Solicitar restablecimiento de contraseña
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const tenant = tenantId || 'richarq';
    await this.authService.forgotPassword(forgotPasswordDto.email, tenant);
    
    return {
      success: true,
      message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña',
    };
  }

  /**
   * POST /api/auth/reset-password
   * Restablecer contraseña con token
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Query('token') token: string,
    @Query('tenantId') tenantId: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    await this.authService.resetPassword(
      token,
      tenantId,
      resetPasswordDto.newPassword,
    );
    
    return {
      success: true,
      message: 'Contraseña restablecida exitosamente',
    };
  }
}

