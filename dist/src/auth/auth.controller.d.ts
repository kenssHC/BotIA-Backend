import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, tenantId?: string): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
    }>;
    verifyToken(req: any): Promise<{
        success: boolean;
        message: string;
        data: {
            user: any;
            valid: boolean;
        };
    }>;
    changePassword(req: any, changePasswordDto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
        data: {
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
        };
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto, tenantId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(token: string, tenantId: string, resetPasswordDto: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
