import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()       
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {}
    async getProfile(userId: string) {
        const user = await this.userModel.findById(userId).select('-password');
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }
}
