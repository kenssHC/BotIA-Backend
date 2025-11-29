import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<{
        success: boolean;
        data: any;
    }>;
    findAll(req: any): Promise<{
        success: boolean;
        data: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            username: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            role: import(".prisma/client").$Enums.Role;
        }[];
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: {
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
        };
    }>;
}
