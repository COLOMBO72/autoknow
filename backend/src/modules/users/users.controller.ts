import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('anonymous')
  async createAnonymous() {
    const user = await this.users.createAnonymous();
    return { id: user.id, balanceKopeks: user.balanceKopeks };
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Пользователь не найден');
    return { id: user.id, balanceKopeks: user.balanceKopeks };
  }

  @Get(':id/reports')
  async getReports(@Param('id') id: string) {
    return this.users.getPurchasedReports(id);
  }

  @Get(':id/comparisons')
  async getComparisons(@Param('id') id: string) {
    return this.users.getComparisons(id);
  }

  @Get(':id/transactions')
  async getTransactions(@Param('id') id: string) {
    return this.users.getTransactions(id);
  }
}
