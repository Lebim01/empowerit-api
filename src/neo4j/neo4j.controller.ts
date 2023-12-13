import { Body, Controller, Post } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';

@Controller('neo4j')
export class Neo4jController {
  constructor(private readonly neo4jService: Neo4jService) {}

  @Post('getLastNode')
  async getLastNode(@Body() body: { nodeId: string; side: 'left' | 'right' }) {
    console.log(body);
    return this.neo4jService.getLastNode(
      'fkQL4rwDBebtQgSXzZacf75DmCt1',
      'left',
    );
  }
}
