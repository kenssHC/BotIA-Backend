import { 
  Injectable, 
  UnauthorizedException, 
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Login de usuario
   */
  async login(loginDto: LoginDto, tenantSlug: string) {
    // Buscar tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant no válido');
    }

    // Buscar usuario por username o email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: loginDto.username },
          { email: loginDto.username },
        ],
        tenantId: tenant.id,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Generar JWT
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Retornar en formato esperado por el frontend
    return {
      access_token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenant: user.tenant.slug,
      },
      requiresPasswordChange: user.requiresPasswordChange,
    };
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Actualizar usuario
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        requiresPasswordChange: false,
      },
      include: {
        tenant: true,
      },
    });

    // Generar nuevo token
    const payload = {
      sub: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        tenant: updatedUser.tenant.slug,
      },
      requiresPasswordChange: false,
    };
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async forgotPassword(email: string, tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      // No revelar si el tenant existe
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        tenantId: tenant.id,
      },
    });

    if (!user) {
      // No revelar si el usuario existe
      return;
    }

    // Crear token de recuperación
    const resetToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expira en 1 hora

    await this.prisma.passwordReset.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    });

    // TODO: Enviar email con el token
    // Por ahora, solo logueamos el token para desarrollo
    console.log(`
    ==========================================
    🔐 Token de recuperación de contraseña
    ==========================================
    Usuario: ${user.email}
    Token: ${resetToken}
    Expira: ${expiresAt.toISOString()}
    
    URL: http://localhost:5173/NewPassword?token=${resetToken}&tenantId=${tenantSlug}
    ==========================================
    `);
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(token: string, tenantSlug: string, newPassword: string) {
    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!passwordReset) {
      throw new BadRequestException('Token inválido');
    }

    if (passwordReset.used) {
      throw new BadRequestException('Este token ya fue utilizado');
    }

    if (new Date() > passwordReset.expiresAt) {
      throw new BadRequestException('El token ha expirado');
    }

    if (passwordReset.user.tenant.slug !== tenantSlug) {
      throw new BadRequestException('Token inválido para este tenant');
    }

    // Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y marcar token como usado
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: passwordReset.userId },
        data: {
          password: hashedPassword,
          requiresPasswordChange: false,
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { used: true },
      }),
    ]);
  }

  /**
   * Validar usuario por ID (usado por JwtStrategy)
   */
  async validateUserById(userId: string) {
    try {
      // Validar que userId tenga formato UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!userId || !uuidRegex.test(userId)) {
        console.log('❌ Token con userId inválido:', userId);
        return null;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenant: true,
        },
      });

      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenant: user.tenant.slug,
        tenantId: user.tenantId,
      };
    } catch (error) {
      // Si hay cualquier error de Prisma (ID inválido, etc.), retornar null
      console.log('❌ Error validando usuario:', error.message);
      return null;
    }
  }
}

