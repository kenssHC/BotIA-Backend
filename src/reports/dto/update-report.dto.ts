import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateReportDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  instruction?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsObject()
  @IsOptional()
  frequencyDetails?: any;

  @IsString()
  @IsOptional()
  time?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

