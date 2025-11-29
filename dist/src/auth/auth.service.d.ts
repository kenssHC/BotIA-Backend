import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(loginDto: LoginDto, tenantSlug: string): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: import(".prisma/client").$Enums.Role;
            tenant: string;
        };
        requiresPasswordChange: boolean;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: import(".prisma/client").$Enums.Role;
            tenant: string;
        };
        requiresPasswordChange: boolean;
    }>;
    forgotPassword(email: string, tenantSlug: string): Promise<void>;
    resetPassword(token: string, tenantSlug: string, newPassword: string): Promise<void>;
    validateUserById(userId: string): Promise<{
        id: string;
        username: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: import(".prisma/client").$Enums.Role;
        tenant: string;
        tenantId: string;
    } | null>;
}
