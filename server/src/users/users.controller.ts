import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { ExportsService } from './exports.service';
import { SaveUserDto } from './dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(ExportsService) private readonly exports: ExportsService,
  ) {}
  @Post()
  @ApiOperation({
    summary: 'Create a complete profile in one PostgreSQL transaction',
  })
  @ApiBody({ type: SaveUserDto })
  @ApiResponse({ status: 201, description: 'Profile created' })
  @ApiResponse({ status: 409, description: 'Duplicate email' })
  create(@Body() dto: SaveUserDto) {
    return this.users.create(dto);
  }
  @Get()
  @ApiOperation({ summary: 'List profiles with all related records' })
  all() {
    return this.users.all();
  }
  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Get one complete profile' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.get(id);
  }
  @Put(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: SaveUserDto })
  @ApiOperation({
    summary: 'Replace a complete profile atomically, including schools',
  })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: SaveUserDto) {
    return this.users.update(id, dto);
  }
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a profile and cascade its related records' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.remove(id);
  }
  @Get(':id/pdf')
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Download a complete résumé as PDF' })
  async pdf(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const u = await this.users.get(id);
    this.send(res, await this.exports.pdf(u), 'pdf', 'application/pdf', id);
  }
  @Get(':id/docx')
  @ApiProduces('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  @ApiOperation({ summary: 'Download a complete editable résumé as DOCX' })
  async docx(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const u = await this.users.get(id);
    this.send(
      res,
      await this.exports.docx(u),
      'docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      id,
    );
  }
  private send(res: Response, data: Buffer, ext: string, type: string, id: string) {
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', `attachment; filename="profile-${id}.${ext}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(data);
  }
}
