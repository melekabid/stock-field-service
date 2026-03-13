import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompleteInterventionDto } from './dto/complete-intervention.dto';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { InterventionsService } from './interventions.service';
import { UpdateInterventionDto } from './dto/update-intervention.dto';

@Controller('interventions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  create(@CurrentUser() user: { id: string; role: UserRole }, @Body() dto: CreateInterventionDto) {
    return this.interventionsService.create(user.id, user.role, dto);
  }

  @Get()
  list(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.interventionsService.list(user.id, user.role);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.interventionsService.detail(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @CurrentUser() user: { id: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: UpdateInterventionDto,
  ) {
    return this.interventionsService.update(user.id, id, dto);
  }

  @Post(':id/start')
  @Roles(UserRole.TECHNICIAN)
  start(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.interventionsService.start(user.id, id);
  }

  @Post(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN)
  complete(
    @CurrentUser() user: { id: string; role: UserRole },
    @Param('id') id: string,
    @Body() dto: CompleteInterventionDto,
  ) {
    return this.interventionsService.complete(user.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.interventionsService.remove(user.id, id);
  }
}
