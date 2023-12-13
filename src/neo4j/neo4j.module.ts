import { Module } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { Neo4jController } from './neo4j.controller';

@Module({
  providers: [Neo4jService],
  controllers: [Neo4jController],
})
export class Neo4jModule {}
