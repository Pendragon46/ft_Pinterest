import { IsEnum, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { sort } from "src/enums/sort.enum";


export class CreateSearchDto {

	@IsString()
	@IsOptional()
	q!:string;

	@IsInt()
	@IsPositive()
	@IsOptional()
	page!:string;

	@IsEnum(sort)
	@IsOptional()
	sort!:sort;

	@IsInt()
	@IsPositive()
	@IsOptional()
	limit!:string;


}
