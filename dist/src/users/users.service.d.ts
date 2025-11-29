import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        tenant: {
            id: string;
            slug: string;
            name: string;
        };
        username: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: import(".prisma/client").$Enums.Role;
    }>;
    findAllByTenant(tenantId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        username: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: import(".prisma/client").$Enums.Role;
    }[]>;
    findByEmail(email: string, tenantId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        email: string;
        password: string;
        firstName: string | null;
        lastName: string | null;
        role: import(".prisma/client").$Enums.Role;
        requiresPasswordChange: boolean;
        tenantId: string;
    } | null>;
}
