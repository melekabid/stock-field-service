import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  summary() {
    return this.reportsService.summary();
  }

  @Post('interventions/:id/pdf')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  generate(@Param('id') id: string) {
    return this.reportsService.generateInterventionPdf(id);
  }
}
