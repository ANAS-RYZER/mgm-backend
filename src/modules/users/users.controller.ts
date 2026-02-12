import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get("/getme")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const userId = req.user?.userId;
    return this.usersService.getProfile(userId);
  }
}
