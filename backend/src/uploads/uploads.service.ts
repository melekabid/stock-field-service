import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  getUploadRoot() {
    const directory = join(process.cwd(), this.configService.get<string>('UPLOAD_DIR') ?? 'uploads');
    mkdirSync(directory, { recursive: true });
    return directory;
  }
}
