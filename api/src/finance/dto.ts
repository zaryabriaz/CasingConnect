import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class FinanceQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01', description: 'Inclusive start date (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-16', description: 'Inclusive end date (YYYY-MM-DD).' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class FinanceBreakdownDto {
  @ApiProperty() label!: string;
  @ApiProperty() amount!: string;
  @ApiPropertyOptional() detail?: string;
}

export class FinanceOverviewDto {
  @ApiProperty() currency!: string;
  @ApiPropertyOptional({ nullable: true }) from!: string | null;
  @ApiPropertyOptional({ nullable: true }) to!: string | null;

  @ApiProperty({ description: 'Current customer balances (they owe you).' })
  receivable!: string;
  @ApiProperty({ description: 'Current supplier balances (you owe them).' })
  payable!: string;

  @ApiProperty({ description: 'Raw material still on hand at average buy rate.' })
  inventoryRaw!: string;
  @ApiProperty({ description: 'Finished hanks still available, costed from material issued to production.' })
  inventoryFinished!: string;
  @ApiProperty({ description: 'inventoryRaw + inventoryFinished' })
  inventoryTotal!: string;
  @ApiProperty({ description: 'receivable + inventoryTotal − payable' })
  netPosition!: string;

  @ApiProperty({ description: 'Cash collected in period: cash sales + payments received.' })
  moneyIn!: string;
  @ApiProperty({ description: 'Cash put into trade in period: cash purchases + expenses + payments paid.' })
  moneyOut!: string;
  @ApiProperty({ description: 'moneyIn − moneyOut for the period.' })
  netCash!: string;

  @ApiProperty() salesRevenue!: string;
  @ApiProperty({ description: 'Purchases in period (for reference).' })
  purchaseCost!: string;
  @ApiProperty({ description: 'Cost of goods sold in period (not full purchases).' })
  cogs!: string;
  @ApiProperty() expenses!: string;
  @ApiProperty({ description: 'salesRevenue − cogs' })
  grossProfit!: string;
  @ApiProperty({ description: 'grossProfit − expenses' })
  netProfit!: string;

  @ApiProperty({ type: [FinanceBreakdownDto] })
  assetBreakdown!: FinanceBreakdownDto[];
  @ApiProperty({ type: [FinanceBreakdownDto] })
  inventoryBreakdown!: FinanceBreakdownDto[];
  @ApiProperty({ type: [FinanceBreakdownDto] })
  moneyInBreakdown!: FinanceBreakdownDto[];
  @ApiProperty({ type: [FinanceBreakdownDto] })
  moneyOutBreakdown!: FinanceBreakdownDto[];
  @ApiProperty({ type: [FinanceBreakdownDto] })
  profitBreakdown!: FinanceBreakdownDto[];
}
