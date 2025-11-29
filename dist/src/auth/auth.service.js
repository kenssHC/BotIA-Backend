"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(loginDto, tenantSlug) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });
        if (!tenant) {
            throw new common_1.UnauthorizedException('Tenant no válido');
        }
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
            throw new common_1.UnauthorizedException('Credenciales incorrectas');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Usuario desactivado');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Credenciales incorrectas');
        }
        const payload = {
            sub: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        };
        const accessToken = this.jwtService.sign(payload);
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
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new common_1.BadRequestException('La contraseña actual es incorrecta');
        }
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
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
    async forgotPassword(email, tenantSlug) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
        });
        if (!tenant) {
            return;
        }
        const user = await this.prisma.user.findFirst({
            where: {
                email,
                tenantId: tenant.id,
            },
        });
        if (!user) {
            return;
        }
        const resetToken = (0, uuid_1.v4)();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prisma.passwordReset.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt,
            },
        });
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
    async resetPassword(token, tenantSlug, newPassword) {
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
            throw new common_1.BadRequestException('Token inválido');
        }
        if (passwordReset.used) {
            throw new common_1.BadRequestException('Este token ya fue utilizado');
        }
        if (new Date() > passwordReset.expiresAt) {
            throw new common_1.BadRequestException('El token ha expirado');
        }
        if (passwordReset.user.tenant.slug !== tenantSlug) {
            throw new common_1.BadRequestException('Token inválido para este tenant');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
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
    async validateUserById(userId) {
        try {
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
        }
        catch (error) {
            console.log('❌ Error validando usuario:', error.message);
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map