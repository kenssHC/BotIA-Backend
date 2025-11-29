import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    try {
      // Verificar que el payload tenga la estructura esperada
      if (!payload || !payload.sub) {
        console.log('❌ Token sin payload.sub válido');
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.authService.validateUserById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('Token inválido o usuario no encontrado');
      }
      
      return user;
    } catch (error) {
      // Capturar cualquier error y convertirlo en 401
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.log('❌ Error en validación JWT:', error.message);
      throw new UnauthorizedException('Token inválido');
    }
  }
}

