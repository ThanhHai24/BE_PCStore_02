import { User } from "@prisma/client";

export interface UserResponse {
    id: string;
    username: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatar: string | null;
    role: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export const formatUserResponse = (user: User): UserResponse => {
    return {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
};
